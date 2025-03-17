/**
 * SideCalendar - サイドパネルタイムテーブル管理
 * 
 * このファイルはChrome拡張機能のサイドパネルに表示されるタイムテーブルを
 * 管理するためのJavaScriptコードです。
 */

// 定数定義
const TIME_CONSTANTS = {
    HOUR_MILLIS: 3600000,  // 1時間あたりのミリ秒数
    MINUTE_MILLIS: 60000,  // 1分あたりのミリ秒数
    UNIT_HEIGHT: 60,       // 1時間あたりの高さ（ピクセル）
    DEFAULT_OPEN_HOUR: '09:00',
    DEFAULT_CLOSE_HOUR: '18:00'
};

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
 * TimeTableManager - タイムテーブルの基本構造を管理するクラス
 */
class TimeTableManager {
    constructor(parentDiv, baseDiv) {
        this.parentDiv = parentDiv;
        this.baseDiv = baseDiv;
        this.openHour = TIME_CONSTANTS.DEFAULT_OPEN_HOUR;
        this.closeHour = TIME_CONSTANTS.DEFAULT_CLOSE_HOUR;
        this.openTime = 0;
        this.closeTime = 0;
        this.hourDiff = 0;
        this.currentTimeLine = null;
    }

    /**
     * 設定を適用する
     * @param {Object} settings - 設定オブジェクト
     */
    applySettings(settings) {
        this.openHour = settings.openTime;
        this.closeHour = settings.closeTime;
    }

    /**
     * 時間関連の変数を初期化
     * @returns {Object} 初期化された時間変数
     */
    initializeTimeVariables() {
        const openTimeParts = this.openHour.split(':');
        const closeTimeParts = this.closeHour.split(':');
        
        const openTimeHour = parseInt(openTimeParts[0], 10);
        const openTimeMinute = parseInt(openTimeParts[1], 10);
        const closeTimeHour = parseInt(closeTimeParts[0], 10);
        const closeTimeMinute = parseInt(closeTimeParts[1], 10);
        
        this.openTime = new Date().setHours(openTimeHour, openTimeMinute, 0, 0);
        this.closeTime = new Date().setHours(closeTimeHour, closeTimeMinute, 0, 0);
        this.hourDiff = (this.closeTime - this.openTime) / TIME_CONSTANTS.HOUR_MILLIS;
        
        console.log(`openTime: ${this.openTime}, closeTime: ${this.closeTime}, hourDiff: ${this.hourDiff}`);
        return { openTimeHour, openTimeMinute };
    }

    /**
     * 基本的なタイムテーブルを作成
     * @param {boolean} breakTimeFixed - 休憩時間が固定かどうか
     * @param {string} breakTimeStart - 休憩開始時間
     * @param {string} breakTimeEnd - 休憩終了時間
     */
    createBaseTable(breakTimeFixed, breakTimeStart, breakTimeEnd) {
        const { openTimeMinute } = this.initializeTimeVariables();
        const unitHeight = TIME_CONSTANTS.UNIT_HEIGHT;
        
        this.parentDiv.style.height = `${unitHeight * (this.hourDiff + 2)}px`;
        this.baseDiv.innerHTML = ''; // 以前の表示をクリア
        this.baseDiv.style.height = `${unitHeight * (this.hourDiff + 2)}px`;

        // 業務時間に色を付ける(休憩時間を除く)
        if (breakTimeFixed) {
            this._createWorkTimeWithBreak(breakTimeStart, breakTimeEnd, unitHeight);
        } else {
            this._createWorkTimeWithoutBreak(unitHeight);
        }

        // 各時間ラベルと補助線を追加
        this._addTimeLabelsAndLines(openTimeMinute, unitHeight);
    }

    /**
     * 休憩時間ありの業務時間表示を作成
     * @private
     */
    _createWorkTimeWithBreak(breakTimeStart, breakTimeEnd, unitHeight) {
        const breakTimeStartParts = breakTimeStart.split(':');
        const breakTimeEndParts = breakTimeEnd.split(':');
        
        const breakTimeStartHour = parseInt(breakTimeStartParts[0], 10);
        const breakTimeStartMinute = parseInt(breakTimeStartParts[1], 10);
        const breakTimeEndHour = parseInt(breakTimeEndParts[0], 10);
        const breakTimeEndMinute = parseInt(breakTimeEndParts[1], 10);
        
        const breakTimeStartMillis = new Date().setHours(breakTimeStartHour, breakTimeStartMinute, 0, 0);
        const breakTimeEndMillis = new Date().setHours(breakTimeEndHour, breakTimeEndMinute, 0, 0);

        const breakTimeStartOffset = (1 + (breakTimeStartMillis - this.openTime) / TIME_CONSTANTS.HOUR_MILLIS) * unitHeight;
        const breakTimeDuration = (breakTimeEndMillis - breakTimeStartMillis) / TIME_CONSTANTS.MINUTE_MILLIS * unitHeight / 60;

        // 休憩時間前の業務時間
        const workTimeDiv1 = document.createElement('div');
        workTimeDiv1.className = 'work-time';
        workTimeDiv1.style.top = `${unitHeight}px`;
        workTimeDiv1.style.height = `${breakTimeStartOffset - unitHeight}px`;
        this.baseDiv.appendChild(workTimeDiv1);

        // 休憩時間後の業務時間
        const workTimeDiv2 = document.createElement('div');
        workTimeDiv2.className = 'work-time';
        workTimeDiv2.style.top = `${breakTimeStartOffset + breakTimeDuration}px`;
        workTimeDiv2.style.height = `${unitHeight * (this.closeTime - breakTimeEndMillis) / TIME_CONSTANTS.HOUR_MILLIS}px`;
        this.baseDiv.appendChild(workTimeDiv2);
    }

    /**
     * 休憩時間なしの業務時間表示を作成
     * @private
     */
    _createWorkTimeWithoutBreak(unitHeight) {
        const workTimeDiv = document.createElement('div');
        workTimeDiv.className = 'work-time';
        workTimeDiv.style.top = `${unitHeight}px`;
        workTimeDiv.style.height = `${unitHeight * this.hourDiff}px`;
        this.baseDiv.appendChild(workTimeDiv);
    }

    /**
     * 時間ラベルと補助線を追加
     * @private
     */
    _addTimeLabelsAndLines(openTimeMinute, unitHeight) {
        for (let i = 0; i <= this.hourDiff + 2; i++) {
            if (i === 0 && openTimeMinute !== 0) {
                continue;
            }
            
            // 時間ラベル
            const hourLabel = document.createElement('div');
            hourLabel.className = 'hour-label';
            hourLabel.style.top = `${i * 60 - openTimeMinute}px`;
            const hour = new Date(this.openTime + (i - 1) * TIME_CONSTANTS.HOUR_MILLIS).getHours();
            hourLabel.textContent = `${hour}:00`;
            this.baseDiv.appendChild(hourLabel);

            // 時間補助線
            const hourLine = document.createElement('div');
            hourLine.className = 'hour-line';
            hourLine.style.top = `${i * 60 - openTimeMinute}px`;
            this.baseDiv.appendChild(hourLine);
        }
    }

    /**
     * 現在時刻の線を更新
     */
    updateCurrentTimeLine() {
        const currentTime = new Date();
        
        // 現在時刻が業務時間内かチェック
        const isWithinWorkHours = currentTime.getTime() >= this.openTime && currentTime.getTime() <= this.closeTime;
        
        // 既存の線を再利用または作成
        if (!this.currentTimeLine) {
            this.currentTimeLine = document.createElement('div');
            this.currentTimeLine.id = 'currentTimeLine';
            this.currentTimeLine.className = 'current-time-line';
            this.parentDiv.appendChild(this.currentTimeLine);
        }
        
        if (isWithinWorkHours) {
            // 業務時間内の場合のみ表示
            const offset = (1 + (currentTime.getTime() - this.openTime) / TIME_CONSTANTS.HOUR_MILLIS) * TIME_CONSTANTS.UNIT_HEIGHT;
            this.currentTimeLine.style.top = `${offset}px`;
            this.currentTimeLine.style.display = 'block';
        } else {
            // 業務時間外の場合は非表示
            this.currentTimeLine.style.display = 'none';
        }
    }
}

/**
 * GoogleEventManager - Googleイベント管理クラス
 */
class GoogleEventManager {
    constructor(timeTableManager, googleEventsDiv) {
        this.timeTableManager = timeTableManager;
        this.googleEventsDiv = googleEventsDiv;
        this.isGoogleIntegrated = false;
    }

    /**
     * Google連携設定を適用
     * @param {boolean} isIntegrated - Google連携が有効かどうか
     */
    setGoogleIntegration(isIntegrated) {
        this.isGoogleIntegrated = isIntegrated;
    }

    /**
     * Googleカレンダーから予定を取得
     */
    fetchEvents() {
        console.log('fetchGoogleEvents');
        console.log('Google連携状態:', this.isGoogleIntegrated);
        
        if (!this.isGoogleIntegrated) {
            console.log('Google連携が無効です');
            return;
        }

        try {
            chrome.runtime.sendMessage({action: "getEvents"}, (response) => {
                console.log('イベント取得応答:', response);
                
                // 以前の表示をクリア
                this.googleEventsDiv.innerHTML = '';
                
                if (chrome.runtime.lastError) {
                    console.error('イベント取得エラー:', chrome.runtime.lastError);
                    return;
                }
                
                if (!response) {
                    console.error('イベント取得応答がありません');
                    return;
                }
                
                if (response.error) {
                    console.error('イベント取得エラー:', response.error);
                    const errorDiv = document.createElement('div');
                    errorDiv.className = 'error-message';
                    errorDiv.textContent = chrome.i18n.getMessage("errorPrefix") + response.error;
                    this.googleEventsDiv.appendChild(errorDiv);
                    return;
                }

                if (!response.events || response.events.length === 0) {
                    console.log('イベントがありません');
                    return;
                }

                console.log('イベント処理開始:', response.events.length + '件');
                this._processEvents(response.events);
            });
        } catch (error) {
            console.error('イベント取得例外:', error);
        }
    }

    /**
     * イベントデータを処理して表示
     * @private
     */
    _processEvents(events) {
        events.forEach(event => {
            console.log(event);
            switch (event.eventType) {
                case 'workingLocation':
                case 'focusTime':
                case 'outOfOffice':
                    // 作業場所、集中時間、外出の場合は何も表示しない
                    return;
                case 'default':
                    this._createGoogleEventElement(event);
                    break;
                default:
                    // その他のイベントタイプは表示しない
                    return;
            }
        });
    }

    /**
     * Googleイベント要素を作成
     * @private
     */
    _createGoogleEventElement(event) {
        // 終日イベントはスキップ
        if (event.start.date || event.end.date) {
            return;
        }

        const eventDiv = document.createElement('div');
        eventDiv.className = 'event google-event';
        
        const startDate = new Date(event.start.dateTime || event.start.date);
        const endDate = new Date(event.end.dateTime || event.end.date);
        
        const startOffset = (1 + (startDate - this.timeTableManager.openTime) / TIME_CONSTANTS.HOUR_MILLIS) * TIME_CONSTANTS.UNIT_HEIGHT;
        const duration = (endDate - startDate) / TIME_CONSTANTS.MINUTE_MILLIS * TIME_CONSTANTS.UNIT_HEIGHT / 60;
        
        if (duration < 30) {
            eventDiv.className = 'event google-event short'; // 30分未満の場合はpaddingを減らす
            eventDiv.style.height = `${duration}px`; // padding分を引かない
        } else {
            eventDiv.style.height = `${duration - 10}px`; // padding分を引く
        }

        eventDiv.style.top = `${startOffset}px`;
        let eventContent = `${startDate.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        })} - ${event.summary}`;

        // Google Meetのリンクが存在する場合は追加
        if (event.hangoutLink) {
            const meetLink = document.createElement('a');
            meetLink.href = event.hangoutLink;
            meetLink.target = "_blank";
            meetLink.textContent = eventContent;
            meetLink.style.display = 'block';
            eventDiv.appendChild(meetLink);
        } else {
            eventDiv.textContent = eventContent;
        }
        
        this.googleEventsDiv.appendChild(eventDiv);
    }
}

/**
 * LocalEventManager - ローカルイベント管理クラス
 */
class LocalEventManager {
    constructor(timeTableManager, localEventsDiv) {
        this.timeTableManager = timeTableManager;
        this.localEventsDiv = localEventsDiv;
        this.eventDialogElements = null;
    }

    /**
     * ダイアログ要素を設定
     * @param {Object} elements - ダイアログ関連の要素
     */
    setDialogElements(elements) {
        this.eventDialogElements = elements;
    }

    /**
     * ローカルイベントをロード
     */
    loadLocalEvents() {
        this.localEventsDiv.innerHTML = ''; // 以前の表示をクリア
        
        try {
            chrome.storage.sync.get({localEvents: []}, (data) => {
                console.log('ローカルイベント取得:', data);
                
                if (chrome.runtime.lastError) {
                    console.error('ローカルイベント取得エラー:', chrome.runtime.lastError);
                    return;
                }
                
                if (!data || !data.localEvents) {
                    console.log('ローカルイベントがありません');
                    return;
                }
                
                console.log('ローカルイベント処理開始:', data.localEvents.length + '件');
                data.localEvents.forEach(event => {
                    try {
                        const eventDiv = this._createEventDiv(event.title, event.startTime, event.endTime);
                        this.localEventsDiv.appendChild(eventDiv);
                    } catch (error) {
                        console.error('イベント表示エラー:', error, event);
                    }
                });
            });
        } catch (error) {
            console.error('ローカルイベント読み込み例外:', error);
        }
    }

    /**
     * 日付が変わった場合にローカルイベントをリセット
     */
    resetLocalEventsIfNewDay() {
        chrome.storage.sync.get({lastUpdateDate: '', localEvents: []}, (data) => {
            const lastUpdateDate = data.lastUpdateDate;
            const currentDate = this._getFormattedDate();

            // 日付が変わった場合、ローカルイベントをリセット
            if (currentDate !== lastUpdateDate) {
                chrome.storage.sync.set({
                    lastUpdateDate: currentDate,
                    localEvents: [] // イベントを空にする
                }, () => {
                    // 更新した後で、ローカルイベントエリアをクリア
                    this.localEventsDiv.innerHTML = '';
                });
            } else {
                // 日が変わっていない場合、ローカルイベントをロード
                this.loadLocalEvents();
            }
        });
    }

    /**
     * イベント要素を作成
     * @private
     */
    _createEventDiv(title, startTime, endTime) {
        const eventDiv = document.createElement('div');
        eventDiv.className = 'event local-event';
        
        const startDate = new Date();
        startDate.setHours(startTime.split(':')[0], startTime.split(':')[1], 0, 0);
        const endDate = new Date();
        endDate.setHours(endTime.split(':')[0], endTime.split(':')[1], 0, 0);

        const startOffset = (1 + (startDate - this.timeTableManager.openTime) / TIME_CONSTANTS.HOUR_MILLIS) * TIME_CONSTANTS.UNIT_HEIGHT;
        const duration = (endDate - startDate) / TIME_CONSTANTS.MINUTE_MILLIS * TIME_CONSTANTS.UNIT_HEIGHT / 60;

        if (duration < 30) {
            eventDiv.className = 'event local-event short';
            eventDiv.style.height = `${duration}px`;
        } else {
            eventDiv.style.height = `${duration - 10}px`;
        }
        
        eventDiv.style.top = `${startOffset}px`;
        eventDiv.textContent = `${startTime} - ${endTime}: ${title}`;

        // 編集機能を設定
        this._setupEventEdit(eventDiv, {title, startTime, endTime});

        return eventDiv;
    }

    /**
     * イベント編集機能をセットアップ
     * @private
     */
    _setupEventEdit(eventDiv, event) {
        const elements = this.eventDialogElements;
        
        eventDiv.addEventListener('click', () => {
            // 編集用ダイアログを表示
            elements.dialog.style.display = 'flex';

            // フォームに既存のイベント情報を設定
            elements.titleInput.value = event.title;
            elements.startTimeInput.value = event.startTime;
            elements.endTimeInput.value = event.endTime;

            // 保存ボタンがクリックされたときの処理
            elements.saveButton.onclick = () => {
                this._handleEventUpdate(event);
            };

            // 削除ボタンがクリックされたときの処理
            elements.deleteButton.onclick = () => {
                this._handleEventDelete(event);
            };
        });
    }

    /**
     * イベント更新処理
     * @private
     */
    _handleEventUpdate(originalEvent) {
        const elements = this.eventDialogElements;
        const newTitle = elements.titleInput.value;
        const newStartTime = elements.startTimeInput.value;
        const newEndTime = elements.endTimeInput.value;

        if (newTitle && newStartTime && newEndTime) {
            chrome.storage.sync.get({localEvents: []}, (data) => {
                const localEvents = data.localEvents;

                // 元のイベントを見つけて更新
                const eventIndex = localEvents.findIndex(e => 
                    e.title === originalEvent.title && 
                    e.startTime === originalEvent.startTime && 
                    e.endTime === originalEvent.endTime
                );

                if (eventIndex !== -1) {
                    localEvents[eventIndex] = {
                        title: newTitle,
                        startTime: newStartTime,
                        endTime: newEndTime
                    };

                    chrome.storage.sync.set({localEvents}, () => {
                        this._showAlertModal(chrome.i18n.getMessage("eventUpdated"));
                        this.loadLocalEvents(); // イベント表示を更新
                    });
                }
            });

            elements.dialog.style.display = 'none';
        } else {
            this._showAlertModal(chrome.i18n.getMessage("fillAllFields"));
        }
    }

    /**
     * イベント削除処理
     * @private
     */
    _handleEventDelete(event) {
        if (confirm(chrome.i18n.getMessage("confirmDeleteEvent"))) {
            chrome.storage.sync.get({localEvents: []}, (data) => {
                let localEvents = data.localEvents;
                localEvents = localEvents.filter(e => 
                    !(e.title === event.title && 
                      e.startTime === event.startTime && 
                      e.endTime === event.endTime)
                );

                chrome.storage.sync.set({localEvents}, () => {
                    this._showAlertModal(chrome.i18n.getMessage("eventDeleted"));
                    this.loadLocalEvents(); // イベント表示を更新
                });
            });

            this.eventDialogElements.dialog.style.display = 'none';
        }
    }

    /**
     * 新しいイベントを追加
     */
    addNewEvent() {
        const elements = this.eventDialogElements;
        const title = elements.titleInput.value;
        const startTime = elements.startTimeInput.value;
        const endTime = elements.endTimeInput.value;
        const currentDate = this._getFormattedDate();

        if (title && startTime && endTime) {
            const eventDiv = this._createEventDiv(title, startTime, endTime);
            this.localEventsDiv.appendChild(eventDiv);

            // ローカルイベントを storage.sync に保存
            chrome.storage.sync.get({localEvents: [], lastUpdateDate: ''}, (data) => {
                console.log(data);
                let localEvents = data.localEvents;
                const lastUpdateDate = data.lastUpdateDate;

                // 日付が変わっていた場合も考慮する
                if (currentDate !== lastUpdateDate) {
                    localEvents = []; // 日付が変わったらイベントをリセット
                }

                localEvents.push({title, startTime, endTime});
                chrome.storage.sync.set({
                    localEvents,
                    lastUpdateDate: currentDate // 日付を更新
                }, () => {
                    console.log(chrome.i18n.getMessage("eventSaved"));
                    this._showAlertModal(chrome.i18n.getMessage("eventSaved"));
                });
            });

            elements.dialog.style.display = 'none';
        } else {
            this._showAlertModal(chrome.i18n.getMessage("fillAllFields"));
        }
    }

    /**
     * 現在の日付を取得（YYYY-MM-DD形式）
     * @private
     */
    _getFormattedDate() {
        const today = new Date();
        return today.toISOString().split('T')[0]; // YYYY-MM-DD 形式の文字列を取得
    }

    /**
     * アラートモーダルを表示
     * @private
     */
    _showAlertModal(message) {
        const alertModal = document.getElementById('alertModal');
        const alertMessage = document.getElementById('alertMessage');
        const closeAlertButton = document.getElementById('closeAlertButton');
        const closeAlertModal = document.getElementById('closeAlertModal');

        alertMessage.textContent = message;
        alertModal.style.display = 'flex';

        closeAlertButton.onclick = () => {
            alertModal.style.display = 'none';
        };

        closeAlertModal.onclick = () => {
            alertModal.style.display = 'none';
        };

        window.onclick = (event) => {
            if (event.target === alertModal) {
                alertModal.style.display = 'none';
            }
        };
    }
}

/**
 * UIController - UI要素とイベントリスナーの管理
 */
class UIController {
    constructor() {
        this.timeTableManager = null;
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
        this.googleEventManager = new GoogleEventManager(this.timeTableManager, googleEventsDiv);
        this.localEventManager = new LocalEventManager(this.timeTableManager, localEventsDiv);

        // 時間選択リストの初期化
        this._initializeTimeList();
        
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
        for (let hour = 7; hour < 21; hour++) {
            for (let minute = 0; minute < 60; minute += 15) {
                const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
                const option = document.createElement('option');
                option.value = time;
                option.textContent = time;
                timeList.appendChild(option);
            }
        }
    }

    /**
     * 設定を読み込む
     * @private
     */
    _loadSettings() {
        try {
            chrome.storage.sync.get({
                googleIntegrated: false,
                openTime: '09:00',
                closeTime: '18:00',
                workTimeColor: '#d4d4d4',
                breakTimeFixed: false,
                breakTimeStart: '12:00',
                breakTimeEnd: '13:00',
                localEventColor: '#bbf2b1',
                googleEventColor: '#c3d6f7'
            }, (items) => {
                console.log('設定読み込み:', items);
                
                if (chrome.runtime.lastError) {
                    console.error('設定読み込みエラー:', chrome.runtime.lastError);
                    return;
                }

                try {
                    // CSS変数の設定
                    document.documentElement.style.setProperty('--side-calendar-work-time-color', items.workTimeColor);
                    document.documentElement.style.setProperty('--side-calendar-local-event-color', items.localEventColor);
                    document.documentElement.style.setProperty('--side-calendar-google-event-color', items.googleEventColor);

                    // 各マネージャーに設定を適用
                    this.googleEventManager.setGoogleIntegration(items.googleIntegrated);
                    this.timeTableManager.applySettings(items);
                    
                    console.log('タイムテーブル作成開始');
                    // タイムテーブルの作成
                    this.timeTableManager.createBaseTable(items.breakTimeFixed, items.breakTimeStart, items.breakTimeEnd);
                    
                    console.log('イベント取得開始');
                    // イベントの取得と表示 - 少し遅延を入れて確実に実行されるようにする
                    setTimeout(() => {
                        // Googleイベントの取得
                        if (items.googleIntegrated) {
                            console.log('Googleイベント取得開始');
                            this.googleEventManager.fetchEvents();
                        }
                        
                        // ローカルイベントの取得
                        console.log('ローカルイベント取得開始');
                        this.localEventManager.resetLocalEventsIfNewDay();
                        
                        // 現在時刻の線を更新
                        this.timeTableManager.updateCurrentTimeLine();
                    }, 100); // 100ミリ秒の遅延
                } catch (error) {
                    console.error('設定適用エラー:', error);
                }
            });
        } catch (error) {
            console.error('設定読み込み例外:', error);
        }
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
        const deleteEventButton = document.getElementById('deleteEventButton');
        const eventTitleInput = document.getElementById('eventTitle');
        const eventStartTimeInput = document.getElementById('eventStartTime');
        const eventEndTimeInput = document.getElementById('eventEndTime');

        // ローカルイベントマネージャーにダイアログ要素を設定
        this.localEventManager.setDialogElements({
            dialog: localEventDialog,
            titleInput: eventTitleInput,
            startTimeInput: eventStartTimeInput,
            endTimeInput: eventEndTimeInput,
            saveButton: saveEventButton,
            deleteButton: deleteEventButton
        });

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
