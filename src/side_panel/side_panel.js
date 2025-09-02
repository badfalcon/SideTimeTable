/**
 * SideTimeTable - サイドパネルタイムテーブル管理
 * 
 * このファイルはChrome拡張機能のサイドパネルに表示されるタイムテーブルを
 * 管理するためのJavaScriptコードです。
 */

import { TimeTableManager, EventLayoutManager } from './time-manager.js';
import { GoogleEventManager, LocalEventManager } from './event-handlers.js';
import { generateTimeList, loadSettings, logError } from '../lib/utils.js';
import { isToday } from '../lib/time-utils.js';
import { isDemoMode, setDemoMode } from '../lib/demo-data.js';

// リロードメッセージリスナー
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "reloadSideTimeTable") {
        location.reload();
        // 応答を返す
        sendResponse({ success: true });
    }
    return true; // 非同期応答を示す
});

/**
 * UIController - UI要素とイベントリスナーの管理
 */
class UIController {
    constructor() {
        this.timeTableManager = null;
        this.eventLayoutManager = null;
        this.googleEventManager = null;
        this.localEventManager = null;
        this.updateInterval = null;
        this.loadEventsDebounceTimeout = null;
        // 現在の日付（時間部分は00:00:00に正規化）
        this.currentDate = new Date();
        this.currentDate.setHours(0, 0, 0, 0);
    }

    /**
     * 初期化
     */
    initialize() {
        // URLパラメータでデモモードを確認
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('demo') === 'true') {
            setDemoMode(true);
        }

        // DOM要素の取得
        const parentDiv = document.getElementById('sideTimeTable');
        const baseDiv = document.getElementById('sideTimeTableBase');
        const googleEventsDiv = document.getElementById('sideTimeTableEventsGoogle');
        const localEventsDiv = document.getElementById('sideTimeTableEventsLocal');

        // 各マネージャーの初期化
        this.timeTableManager = new TimeTableManager(parentDiv, baseDiv);
        this.eventLayoutManager = new EventLayoutManager(baseDiv);
        this.googleEventManager = new GoogleEventManager(this.timeTableManager, googleEventsDiv, this.eventLayoutManager);
        this.localEventManager = new LocalEventManager(this.timeTableManager, localEventsDiv, this.eventLayoutManager);

        // 時間選択リストの初期化
        this._initializeTimeList();

        // ダイアログ要素の設定
        this._setupDialogElements();

        // 設定の読み込み
        this._loadSettings();

        // イベントリスナーの設定
        this._setupEventListeners();

        // 日付表示の初期化
        this._updateDateDisplay();

        // 定期的な更新の設定
        this._setupPeriodicUpdates();
    }

    /**
     * 時間選択リストを初期化
     * @private
     */
    _initializeTimeList() {
        const timeList = document.getElementById('time-list');
        generateTimeList(timeList);
    }

    /**
     * ダイアログ要素を設定
     * @private
     */
    _setupDialogElements() {
        // ローカルイベントダイアログ要素
        const localEventDialog = document.getElementById('localEventDialog');
        const eventTitleInput = document.getElementById('eventTitle');
        const eventStartTimeInput = document.getElementById('eventStartTime');
        const eventEndTimeInput = document.getElementById('eventEndTime');
        const saveEventButton = document.getElementById('saveEventButton');
        const deleteEventButton = document.getElementById('deleteEventButton');

        // ローカルイベントマネージャーにダイアログ要素を設定
        this.localEventManager.setDialogElements({
            dialog: localEventDialog,
            titleInput: eventTitleInput,
            startTimeInput: eventStartTimeInput,
            endTimeInput: eventEndTimeInput,
            saveButton: saveEventButton,
            deleteButton: deleteEventButton
        });

        // アラートモーダル要素
        const alertModal = document.getElementById('alertModal');
        const alertMessage = document.getElementById('alertMessage');
        const closeAlertButton = document.getElementById('closeAlertButton');

        // ローカルイベントマネージャーにアラートモーダル要素を設定
        this.localEventManager.setAlertModalElements({
            modal: alertModal,
            messageElement: alertMessage,
            closeButton: closeAlertButton
        });
    }

    /**
     * 設定を読み込む
     * @private
     */
    _loadSettings() {
        loadSettings()
            .then(async settings => {
                try {
                    // CSS変数の設定
                    document.documentElement.style.setProperty('--side-calendar-work-time-color', settings.workTimeColor);
                    document.documentElement.style.setProperty('--side-calendar-local-event-color', settings.localEventColor);
                    document.documentElement.style.setProperty('--side-calendar-google-event-color', settings.googleEventColor);

                    // 各マネージャーに設定を適用（デモモードの場合は強制的にGoogle連携を有効）
                    const googleIntegrated = isDemoMode() || settings.googleIntegrated;
                    this.googleEventManager.setGoogleIntegration(googleIntegrated);
                    this.timeTableManager.applySettings(settings);

                    console.log('タイムテーブル作成開始');
                    // タイムテーブルの作成
                    await this.timeTableManager.createBaseTable(this.currentDate, settings.breakTimeFixed, settings.breakTimeStart, settings.breakTimeEnd);

                    console.log('イベント取得開始');
                    // イベントの取得と表示 - 少し遅延を入れて確実に実行されるようにする
                    setTimeout(async () => {
                        // ローカルイベントの取得
                        console.log('ローカルイベント取得開始');
                        await this.localEventManager.loadLocalEvents();

                        // Googleイベントの取得（デモモードの場合も含む）
                        if (googleIntegrated) {
                            console.log('Googleイベント取得開始');
                            this.googleEventManager.fetchEvents();
                        } else {
                            // Google連携がない場合は、ローカルイベントのみでレイアウト計算
                            this.eventLayoutManager.calculateLayout();
                        }

                        // 現在時刻の線を更新
                        this.timeTableManager.updateCurrentTimeLine(this.currentDate);
                        
                        // スクロール位置を調整（全ての初期化が完了した後）
                        setTimeout(() => {
                            requestAnimationFrame(() => {
                                this.timeTableManager.adjustScrollPosition(this.currentDate);
                            });
                        }, 300);
                    }, 100); // 100ミリ秒の遅延
                } catch (error) {
                    logError('設定適用', error);
                }
            })
            .catch(error => {
                logError('設定読み込み', error);
            });
    }

    /**
     * イベントリスナーを設定
     * @private
     */
    _setupEventListeners() {
        // 設定アイコンのクリックイベント
        const settingsIcon = document.getElementById('settingsIcon');
        settingsIcon.addEventListener('click', () => {
            chrome.runtime.openOptionsPage();
        });

        // ローカルイベント関連の要素
        const addLocalEventButton = document.getElementById('addLocalEventButton');
        const localEventDialog = document.getElementById('localEventDialog');
        const closeDialog = document.getElementById('closeDialog');
        const saveEventButton = document.getElementById('saveEventButton');
        const cancelEventButton = document.getElementById('cancelEventButton');
        const eventTitleInput = document.getElementById('eventTitle');
        const eventStartTimeInput = document.getElementById('eventStartTime');
        const eventEndTimeInput = document.getElementById('eventEndTime');

        // 新規イベント追加ボタン
        addLocalEventButton.addEventListener('click', () => {
            localEventDialog.style.display = 'flex';
            // フォームをリセット
            eventTitleInput.value = '';
            eventStartTimeInput.value = '';
            eventEndTimeInput.value = '';

            // 保存ボタンのクリックイベントを設定
            saveEventButton.onclick = () => {
                this.localEventManager.addNewEvent();
            };
        });

        // ダイアログを閉じるボタン
        closeDialog.addEventListener('click', () => {
            localEventDialog.style.display = 'none';
        });

        // キャンセルボタン
        cancelEventButton.addEventListener('click', () => {
            localEventDialog.style.display = 'none';
        });

        // アラートモーダル関連
        const alertModal = document.getElementById('alertModal');
        const closeAlertModal = document.getElementById('closeAlertModal');
        const closeAlertButton = document.getElementById('closeAlertButton');

        // アラートモーダルを閉じるボタン
        if (closeAlertButton) {
            closeAlertButton.addEventListener('click', () => {
                alertModal.style.display = 'none';
            });
        }

        // アラートモーダルの×ボタン
        if (closeAlertModal) {
            closeAlertModal.addEventListener('click', () => {
                alertModal.style.display = 'none';
            });
        }

        // モーダル外クリックで閉じる
        window.addEventListener('click', (event) => {
            if (event.target === alertModal) {
                alertModal.style.display = 'none';
            }
            if (event.target === localEventDialog) {
                localEventDialog.style.display = 'none';
            }
        });

        // 日付ナビゲーションボタン
        const prevDateButton = document.getElementById('prevDateButton');
        const nextDateButton = document.getElementById('nextDateButton');
        const currentDateDisplay = document.getElementById('currentDateDisplay');

        prevDateButton.addEventListener('click', () => {
            this._navigateDate(-1);
        });

        nextDateButton.addEventListener('click', () => {
            this._navigateDate(1);
        });

        // 日付入力の変更イベント
        currentDateDisplay.addEventListener('change', (event) => {
            this._onDatePickerChange(event.target.value);
        });
        
    }

    /**
     * 日付表示を更新
     * @private
     */
    _updateDateDisplay() {
        const dateDisplay = document.getElementById('currentDateDisplay');
        
        // 今日かどうかを判定
        const isTodayFlag = isToday(this.currentDate);

        // input要素のvalue属性に日付を設定
        const year = this.currentDate.getFullYear();
        const month = String(this.currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(this.currentDate.getDate()).padStart(2, '0');
        dateDisplay.value = `${year}-${month}-${day}`;
        
        // 今日の場合はクラスを追加
        if (isTodayFlag) {
            dateDisplay.classList.add('today');
        } else {
            dateDisplay.classList.remove('today');
        }
    }

    /**
     * 日付を移動
     * @param {number} days - 移動する日数（正の数で未来、負の数で過去）
     * @private
     */
    _navigateDate(days) {
        this.currentDate.setDate(this.currentDate.getDate() + days);
        this._updateDateDisplay();
        this._loadEventsForCurrentDate();
    }

    /**
     * 今日の日付に移動
     * @private
     */
    _navigateToToday() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // 既に今日の場合は何もしない
        if (this.currentDate.getTime() === today.getTime()) {
            return;
        }
        
        this.currentDate = today;
        this._updateDateDisplay();
        this._loadEventsForCurrentDate();
    }

    /**
     * 日付ピッカーの変更を処理
     * @param {string} dateValue - YYYY-MM-DD形式の日付文字列
     * @private
     */
    _onDatePickerChange(dateValue) {
        if (dateValue) {
            // 新しい日付を設定
            const newDate = new Date(dateValue);
            newDate.setHours(0, 0, 0, 0);
            
            this.currentDate = newDate;
            this._loadEventsForCurrentDate();
        }
    }

    /**
     * 現在の日付のイベントを読み込み（デバウンス付き）
     * @private
     */
    _loadEventsForCurrentDate() {
        // 既存のタイマーをクリア
        if (this.loadEventsDebounceTimeout) {
            clearTimeout(this.loadEventsDebounceTimeout);
        }
        
        // 300ms後に実行
        this.loadEventsDebounceTimeout = setTimeout(() => {
            this._loadEventsImmediate();
        }, 300);
    }

    /**
     * 現在の日付のイベントを即座に読み込み
     * @private
     */
    _loadEventsImmediate() {
        // 既存のイベントをクリア
        this.eventLayoutManager.events = [];
        this.localEventManager.localEventsDiv.innerHTML = '';
        this.googleEventManager.googleEventsDiv.innerHTML = '';
        
        // TimeTableManagerの時間設定を対象日付で更新
        loadSettings()
            .then(async settings => {
                // タイムテーブルを新しい日付で再作成
                await this.timeTableManager.createBaseTable(this.currentDate, settings.breakTimeFixed, settings.breakTimeStart, settings.breakTimeEnd);
                
                // 現在時刻線を更新（今日以外では非表示になる）
                this.timeTableManager.updateCurrentTimeLine(this.currentDate);
                
                // ローカルイベントの取得
                await this.localEventManager.loadLocalEvents(this.currentDate);
                
                // Googleイベントの取得（デモモードの場合も含む）
                const googleIntegrated = isDemoMode() || settings.googleIntegrated;
                if (googleIntegrated) {
                    this.googleEventManager.fetchEvents(this.currentDate);
                } else {
                    // Google連携がない場合は、ローカルイベントのみでレイアウト計算
                    setTimeout(() => {
                        this.eventLayoutManager.calculateLayout();
                    }, 100);
                }
                
                // スクロール位置を調整
                setTimeout(() => {
                    requestAnimationFrame(() => {
                        this.timeTableManager.adjustScrollPosition(this.currentDate);
                    });
                }, 300);
            })
            .catch(error => {
                logError('設定読み込み', error);
                // エラーの場合もレイアウト計算
                setTimeout(() => {
                    this.eventLayoutManager.calculateLayout();
                }, 100);
            });
    }

    /**
     * 定期的な更新を設定
     * @private
     */
    _setupPeriodicUpdates() {
        let lastHourlyUpdate = -1; // 前回の毎時更新を記録
        
        this.updateInterval = setInterval(() => {
            const currentTime = new Date();
            const currentMinutes = currentTime.getMinutes();
            const currentSeconds = currentTime.getSeconds();
            const currentHour = currentTime.getHours();

            // 毎時0分に予定を更新（重複実行を防ぐため時刻チェックを追加）
            if (currentMinutes === 0 && currentSeconds === 0 && lastHourlyUpdate !== currentHour) {
                lastHourlyUpdate = currentHour;
                // 現在表示中の日付でイベントを取得
                this.googleEventManager.fetchEvents(this.currentDate);
            }

            if (currentSeconds === 0) {
                // 毎分0秒に現在時刻の線を更新
                this.timeTableManager.updateCurrentTimeLine(this.currentDate);
            }
        }, 1000);
    }
}

// DOMが読み込まれたときに実行
document.addEventListener('DOMContentLoaded', async function() {
    // 多言語化（グローバル関数として呼び出し）
    if (window.localizeHtmlPageWithLang) {
        try {
            await window.localizeHtmlPageWithLang();
            console.log('多言語化処理完了');
        } catch (error) {
            console.warn('多言語化処理でエラー:', error);
            // フォールバックとして標準の多言語化を実行
            if (window.localizeHtmlPage) {
                window.localizeHtmlPage();
            }
        }
    }

    // UIコントローラーの初期化と実行
    const uiController = new UIController();
    uiController.initialize();
});
