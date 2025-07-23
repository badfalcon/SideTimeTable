/**
 * SideTimeTable - サイドパネルタイムテーブル管理
 * 
 * このファイルはChrome拡張機能のサイドパネルに表示されるタイムテーブルを
 * 管理するためのJavaScriptコードです。
 */

import { TimeTableManager, EventLayoutManager } from './time-manager.js';
import { GoogleEventManager, LocalEventManager } from './event-handlers.js';
import { generateTimeList, loadSettings, logError } from '../lib/utils.js';
import { localizeHtmlPage } from '../lib/localize.js';

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

                    console.log('タイムテーブル作成開始');
                    // タイムテーブルの作成
                    this.timeTableManager.createBaseTable(settings.breakTimeFixed, settings.breakTimeStart, settings.breakTimeEnd);

                    console.log('イベント取得開始');
                    // イベントの取得と表示 - 少し遅延を入れて確実に実行されるようにする
                    setTimeout(() => {
                        // ローカルイベントの取得
                        console.log('ローカルイベント取得開始');
                        this.localEventManager.loadLocalEvents();

                        // Googleイベントの取得
                        if (settings.googleIntegrated) {
                            console.log('Googleイベント取得開始');
                            this.googleEventManager.fetchEvents();
                        } else {
                            // Google連携がない場合は、ローカルイベントのみでレイアウト計算
                            this.eventLayoutManager.calculateLayout();
                        }

                        // 現在時刻の線を更新
                        this.timeTableManager.updateCurrentTimeLine();
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
    }

    /**
     * タイトルを設定
     * @private
     */
    _setTitle() {
        const today = new Date();
        const title = document.querySelector('h1');
        title.textContent = today.toLocaleDateString(undefined, {dateStyle: 'full'});
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
                // 毎時0分に予定を更新
                this.googleEventManager.fetchEvents();
            }

            if (currentSeconds === 0) {
                // 毎分0秒に現在時刻の線を更新
                this.timeTableManager.updateCurrentTimeLine();
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
