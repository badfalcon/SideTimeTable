/**
 * SideTimeTable - サイドパネルタイムテーブル管理
 * 
 * このファイルはChrome拡張機能のサイドパネルに表示されるタイムテーブルを
 * 管理するためのJavaScriptコードです。
 */

import { TimeTableManager, EventLayoutManager } from './time-manager.js';
import { GoogleEventManager, LocalEventManager } from './event-handlers.js';
import { generateTimeList, loadSettings, logError, getPreviousDay, getNextDay, formatDate } from '../lib/utils.js';

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
        this.currentDate = new Date(); // 現在の日付を初期値として設定
    }

    /**
     * 初期化
     */
    initialize() {
        // DOM要素の取得
        const parentDiv = document.getElementById('sideTimeTable');
        const baseDiv = document.getElementById('sideTimeTableBase');
        const googleEventsDiv = document.getElementById('sideTimeTableEventsGoogle');
        const localEventsDiv = document.getElementById('sideTimeTableEventsLocal');

        // 各マネージャーの初期化
        this.timeTableManager = new TimeTableManager(parentDiv, baseDiv);
        this.eventLayoutManager = new EventLayoutManager();
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

        // タイトル設定
        this._setTitle();

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
            .then(settings => {
                try {
                    // CSS変数の設定
                    document.documentElement.style.setProperty('--side-calendar-work-time-color', settings.workTimeColor);
                    document.documentElement.style.setProperty('--side-calendar-local-event-color', settings.localEventColor);
                    document.documentElement.style.setProperty('--side-calendar-google-event-color', settings.googleEventColor);

                    // 各マネージャーに設定を適用
                    this.googleEventManager.setGoogleIntegration(settings.googleIntegrated);
                    this.timeTableManager.applySettings(settings);

                    // タイムテーブルの作成 - 現在の日付を渡す
                    this.timeTableManager.createBaseTable(settings.breakTimeFixed, settings.breakTimeStart, settings.breakTimeEnd, this.currentDate);

                    // イベントの取得と表示 - 少し遅延を入れて確実に実行されるようにする
                    setTimeout(() => {
                        // ローカルイベントの取得
                        this.localEventManager.loadLocalEvents(this.currentDate);

                        // Googleイベントの取得
                        if (settings.googleIntegrated) {
                            this.googleEventManager.fetchEvents(this.currentDate);
                        } else {
                            // Google連携がない場合でも、fetchEvents内でレイアウト計算が行われるようになった
                            this.googleEventManager.fetchEvents(this.currentDate);
                        }

                        // 現在時刻の線を更新 - 現在の日付を渡す
                        this.timeTableManager.updateCurrentTimeLine(this.currentDate);
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
        // 日付ナビゲーションの矢印ボタン
        const prevDateButton = document.getElementById('prevDateButton');
        const nextDateButton = document.getElementById('nextDateButton');
        
        // 前日ボタンのクリックイベント
        prevDateButton.addEventListener('click', () => {
            this._goToPreviousDay();
        });
        
        // 翌日ボタンのクリックイベント
        nextDateButton.addEventListener('click', () => {
            this._goToNextDay();
        });
        
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
                this.localEventManager.addNewEvent(this.currentDate);
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
    }

    /**
     * タイトルを設定
     * @private
     */
    _setTitle() {
        const title = document.querySelector('h1');
        title.textContent = formatDate(this.currentDate);
    }
    
    /**
     * 前日に移動
     * @private
     */
    _goToPreviousDay() {
        this.currentDate = getPreviousDay(this.currentDate);
        this._setTitle();
        this._refreshEvents();
    }
    
    /**
     * 翌日に移動
     * @private
     */
    _goToNextDay() {
        this.currentDate = getNextDay(this.currentDate);
        this._setTitle();
        this._refreshEvents();
    }
    
    /**
     * イベントを再読み込み
     * @private
     */
    _refreshEvents() {
        // タイムテーブルをクリア
        const localEventsDiv = document.getElementById('sideTimeTableEventsLocal');
        const googleEventsDiv = document.getElementById('sideTimeTableEventsGoogle');
        localEventsDiv.innerHTML = '';
        googleEventsDiv.innerHTML = '';
        
        // 設定を読み込んでタイムテーブルを再作成し、イベントを取得
        loadSettings()
            .then(settings => {
                try {
                    // タイムテーブルを再作成 - 現在の日付を渡す
                    this.timeTableManager.createBaseTable(settings.breakTimeFixed, settings.breakTimeStart, settings.breakTimeEnd, this.currentDate);
                    
                    // 現在時刻の線を更新 - 現在の日付を渡す
                    this.timeTableManager.updateCurrentTimeLine(this.currentDate);
                    
                    // ローカルイベントの取得
                    this.localEventManager.loadLocalEvents(this.currentDate);
                    
                    // Googleイベントの取得
                    if (settings.googleIntegrated) {
                        this.googleEventManager.fetchEvents(this.currentDate);
                    } else {
                        // Google連携がない場合でも、fetchEvents内でレイアウト計算が行われるようになった
                        this.googleEventManager.fetchEvents(this.currentDate);
                    }
                } catch (error) {
                    logError('イベント再読み込み', error);
                }
            })
            .catch(error => {
                logError('設定読み込み', error);
            });
    }

    /**
     * 定期的な更新を設定
     * @private
     */
    _setupPeriodicUpdates() {
        this.updateInterval = setInterval(() => {
            const currentTime = new Date();
            const currentMinutes = currentTime.getMinutes();
            const currentSeconds = currentTime.getSeconds();

            if (currentMinutes === 0) {
                // 毎時0分に予定を更新 - 現在の日付を渡す
                this.googleEventManager.fetchEvents(this.currentDate);
            }

            if (currentSeconds === 0) {
                // 毎分0秒に現在時刻の線を更新 - 現在の日付を渡す
                this.timeTableManager.updateCurrentTimeLine(this.currentDate);
            }
        }, 1000);
    }
}

// DOMが読み込まれたときに実行
document.addEventListener('DOMContentLoaded', function() {
    // 多言語化
    localizeHtmlPage();

    // UIコントローラーの初期化と実行
    const uiController = new UIController();
    uiController.initialize();
});
