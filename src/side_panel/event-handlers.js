/**
 * SideTimeTable - イベント管理モジュール
 * 
 * このファイルはGoogleカレンダーイベントとローカルイベントの管理を行います。
 */

import {
    loadCalendarColors,
    loadLocalEvents,
    loadLocalEventsForDate,
    logError,
    saveLocalEvents,
    showAlertModal,
    TIME_CONSTANTS
} from '../lib/utils.js';
import {createTimeOnDate} from '../lib/time-utils.js';

/**
 * GoogleEventManager - Googleイベント管理クラス
 */
export class GoogleEventManager {
    /**
     * コンストラクタ
     * @param {Object} timeTableManager - タイムテーブルマネージャーのインスタンス
     * @param {HTMLElement} googleEventsDiv - Googleイベント表示用のDOM要素
     * @param {Object} eventLayoutManager - イベントレイアウトマネージャーのインスタンス
     */
    constructor(timeTableManager, googleEventsDiv, eventLayoutManager) {
        this.timeTableManager = timeTableManager;
        this.googleEventsDiv = googleEventsDiv;
        this.eventLayoutManager = eventLayoutManager;
        this.isGoogleIntegrated = false;
        this.calendarColors = {};
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
     * @param {Date} targetDate - 対象の日付（省略時は今日）
     */
    fetchEvents(targetDate = null) {
        console.log('Googleイベント取得開始');
        console.log('Google連携状態:', this.isGoogleIntegrated);

        if (!this.isGoogleIntegrated) {
            console.log('Google連携が無効です');
            return;
        }

        // まずカレンダー色設定を読み込む
        loadCalendarColors()
            .then(calendarColors => {
                this.calendarColors = calendarColors;

                // イベントを取得
                return new Promise((resolve, reject) => {
                    const message = {action: "getEvents"};
                    if (targetDate) {
                        message.targetDate = targetDate.toISOString();
                    }
                    
                    chrome.runtime.sendMessage(message, (response) => {
                        if (chrome.runtime.lastError) {
                            reject(chrome.runtime.lastError);
                            return;
                        }
                        resolve(response);
                    });
                });
            })
            .then(response => {
                console.log('イベント取得応答:', response);

                // 以前の表示をクリア
                this.googleEventsDiv.innerHTML = '';

                // Googleイベントのみをレイアウトマネージャーから削除
                const events = [...this.eventLayoutManager.events];
                events.forEach(event => {
                    if (event && event.type === 'google') {
                        this.eventLayoutManager.removeEvent(event.id);
                    }
                });

                if (!response) {
                    logError('Googleイベント取得', '応答がありません');
                    return;
                }

                if (response.error) {
                    logError('Googleイベント取得', response.error);
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

                // イベントレイアウトを計算して適用
                this.eventLayoutManager.calculateLayout();
            })
            .catch(error => {
                logError('Googleイベント取得例外', error);
            });
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
        eventDiv.title = event.summary;

        const startDate = new Date(event.start.dateTime || event.start.date);
        const endDate = new Date(event.end.dateTime || event.end.date);

        // データ属性に時刻情報を追加
        eventDiv.dataset.startTime = startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        eventDiv.dataset.endTime = endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // イベントの詳細データを保存
        eventDiv.dataset.description = event.description || '';
        eventDiv.dataset.location = event.location || '';
        eventDiv.dataset.hangoutLink = event.hangoutLink || '';

        // クリックイベントの追加
        eventDiv.addEventListener('click', () => this._showEventDetails(event));

        // 24時間座標系での位置計算（0:00からの分数をピクセルに変換）
        const startOffset = (startDate.getHours() * 60 + startDate.getMinutes());
        const duration = (endDate - startDate) / TIME_CONSTANTS.MINUTE_MILLIS;

        if (duration < 30) {
            eventDiv.className = 'event google-event short'; // 30分未満の場合はpaddingを減らす
            eventDiv.style.height = `${duration}px`; // padding分を引かない
        } else {
            eventDiv.style.height = `${duration - 10}px`; // padding分を引く
        }

        eventDiv.style.top = `${startOffset}px`;
        
        // カスタムカレンダー色を適用
        if (event.calendarId && this.calendarColors[event.calendarId]) {
            eventDiv.style.backgroundColor = this.calendarColors[event.calendarId];
            // 背景色に応じてテキスト色を自動調整
            const backgroundColor = this.calendarColors[event.calendarId];
            eventDiv.style.color = this._getContrastingTextColor(backgroundColor);
        }
        
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
            meetLink.style.color = 'inherit'; // 親要素の色を継承
            eventDiv.appendChild(meetLink);
        } else {
            eventDiv.textContent = eventContent;
        }

        this.googleEventsDiv.appendChild(eventDiv);

        // イベントレイアウトマネージャーに登録
        this.eventLayoutManager.registerEvent({
            startTime: startDate,
            endTime: endDate,
            element: eventDiv,
            type: 'google',
            id: event.id || `google-${Date.now()}-${Math.random()}`,
            calendarId: event.calendarId
        });
    }

    /**
     * 背景色に対してコントラストの良いテキスト色を取得
     * @private
     */
    _getContrastingTextColor(backgroundColor) {
        // HEX色をRGBに変換
        const hex = backgroundColor.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        
        // 明度を計算 (0-255の範囲)
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        
        // 明度が128以上なら黒、未満なら白
        return brightness >= 128 ? '#000000' : '#ffffff';
    }

    /**
     * イベントの詳細を表示
     * @private
     */
    _showEventDetails(event) {
        const dialog = document.getElementById('googleEventDialog');
        const closeBtn = document.getElementById('closeGoogleEventDialog');

        // タイトル設定
        dialog.querySelector('.google-event-title').textContent = event.summary;

        // 日時設定
        const startDate = new Date(event.start.dateTime);
        const endDate = new Date(event.end.dateTime);
        dialog.querySelector('.google-event-time').textContent = `${startDate.toLocaleString()} - ${endDate.toLocaleString()}`;

        // 説明設定
        const descriptionEl = dialog.querySelector('.google-event-description');
        if (event.description) {
            descriptionEl.textContent = event.description;
            descriptionEl.style.display = 'block';
        } else {
            descriptionEl.style.display = 'none';
        }

        // 場所設定
        const locationEl = dialog.querySelector('.google-event-location');
        if (event.location) {
            locationEl.textContent = `場所: ${event.location}`;
            locationEl.style.display = 'block';
        } else {
            locationEl.style.display = 'none';
        }

        // Google Meetリンク設定
        const meetEl = dialog.querySelector('.google-event-meet');
        if (event.hangoutLink) {
            meetEl.innerHTML = `<a href="${event.hangoutLink}" target="_blank"><i class="fas fa-video"></i> Google Meetで参加</a>`;
            meetEl.style.display = 'block';
        } else {
            meetEl.style.display = 'none';
        }

        // モーダルを表示
        dialog.style.display = 'flex';

        // 閉じるボタンのイベントリスナー
        closeBtn.onclick = () => {
            dialog.style.display = 'none';
        };

        // モーダルの外側をクリックしたときに閉じる
        dialog.onclick = (e) => {
            if (e.target === dialog) {
                dialog.style.display = 'none';
            }
        };
    }
}

/**
 * LocalEventManager - ローカルイベント管理クラス
 */
export class LocalEventManager {
    /**
     * コンストラクタ
     * @param {Object} timeTableManager - タイムテーブルマネージャーのインスタンス
     * @param {HTMLElement} localEventsDiv - ローカルイベント表示用のDOM要素
     * @param {Object} eventLayoutManager - イベントレイアウトマネージャーのインスタンス
     */
    constructor(timeTableManager, localEventsDiv, eventLayoutManager) {
        this.timeTableManager = timeTableManager;
        this.localEventsDiv = localEventsDiv;
        this.eventLayoutManager = eventLayoutManager;
        this.eventDialogElements = null;
        this.alertModalElements = null;
        this.currentTargetDate = new Date(); // 現在表示中の日付
    }

    /**
     * ダイアログ要素を設定
     * @param {Object} elements - ダイアログ関連の要素
     */
    setDialogElements(elements) {
        this.eventDialogElements = elements;
    }

    /**
     * アラートモーダル要素を設定
     * @param {Object} elements - アラートモーダル関連の要素
     */
    setAlertModalElements(elements) {
        this.alertModalElements = elements;
    }

    /**
     * ローカルイベントをロード
     * @param {Date} targetDate - 対象の日付（省略時は今日）
     */
    loadLocalEvents(targetDate = null) {
        // 対象日付を更新
        this.currentTargetDate = targetDate || new Date();
        
        this.localEventsDiv.innerHTML = ''; // 以前の表示をクリア

        const loadFunction = targetDate ? 
            () => loadLocalEventsForDate(targetDate) : 
            () => loadLocalEvents();
            
        loadFunction()
            .then(events => {
                console.log('ローカルイベント取得:', events.length + '件');

                events.forEach(event => {
                    try {
                        const eventDiv = this._createEventDiv(event.title, event.startTime, event.endTime);
                        this.localEventsDiv.appendChild(eventDiv);
                    } catch (error) {
                        logError('イベント表示', error);
                    }
                });

                // 注: レイアウト計算はside_panel.jsで行うため、ここでは行わない
            })
            .catch(error => {
                logError('ローカルイベント読み込み', error);
            });
    }

    /**
     * イベント要素を作成
     * @private
     */
    _createEventDiv(title, startTime, endTime) {
        const eventDiv = document.createElement('div');
        eventDiv.className = 'event local-event';
        eventDiv.title = title;

        // 対象日付に時間を設定
        const [startHours, startMinutes] = startTime.split(':');
        const [endHours, endMinutes] = endTime.split(':');
        
        const startDate = createTimeOnDate(this.currentTargetDate, parseInt(startHours), parseInt(startMinutes));
        const endDate = createTimeOnDate(this.currentTargetDate, parseInt(endHours), parseInt(endMinutes));

        // データ属性に時刻情報を追加
        eventDiv.dataset.startTime = startTime;
        eventDiv.dataset.endTime = endTime;

        // 24時間座標系での位置計算（0:00からの分数をピクセルに変換）
        const startOffset = (startDate.getHours() * 60 + startDate.getMinutes());
        const duration = (endDate.getTime() - startDate.getTime()) / TIME_CONSTANTS.MINUTE_MILLIS;

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

        // イベントレイアウトマネージャーに登録
        this.eventLayoutManager.registerEvent({
            startTime: startDate,
            endTime: endDate,
            element: eventDiv,
            type: 'local',
            id: `local-${title}-${startTime}-${endTime}`
        });

        return eventDiv;
    }

    /**
     * イベント編集機能をセットアップ
     * @private
     */
    _setupEventEdit(eventDiv, event) {
        if (!this.eventDialogElements) return;

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
        if (!this.eventDialogElements) return;

        const elements = this.eventDialogElements;
        const newTitle = elements.titleInput.value;
        const newStartTime = elements.startTimeInput.value;
        const newEndTime = elements.endTimeInput.value;

        if (newTitle && newStartTime && newEndTime) {
            loadLocalEvents()
                .then(localEvents => {
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

                        return saveLocalEvents(localEvents);
                    }
                })
                .then(() => {
                    this._showAlertModal(chrome.i18n.getMessage("eventUpdated") || 'イベントを更新しました');
                    this.loadLocalEvents(); // イベント表示を更新
                })
                .catch(error => {
                    logError('イベント更新', error);
                    this._showAlertModal('イベントの更新に失敗しました');
                })
                .finally(() => {
                    elements.dialog.style.display = 'none';
                });
        } else {
            this._showAlertModal(chrome.i18n.getMessage("fillAllFields") || '全ての項目を入力してください');
        }
    }

    /**
     * イベント削除処理
     * @private
     */
    _handleEventDelete(event) {
        if (confirm(chrome.i18n.getMessage("confirmDeleteEvent") || 'イベントを削除しますか？')) {
            // イベントIDを生成
            const eventId = `local-${event.title}-${event.startTime}-${event.endTime}`;

            loadLocalEvents()
                .then(localEvents => {
                    // 対象のイベントを除外
                    const updatedEvents = localEvents.filter(e => 
                        !(e.title === event.title && 
                          e.startTime === event.startTime && 
                          e.endTime === event.endTime)
                    );

                    return saveLocalEvents(updatedEvents);
                })
                .then(() => {
                    this._showAlertModal(chrome.i18n.getMessage("eventDeleted") || 'イベントを削除しました');

                    // イベント表示を更新（DOM要素の削除）
                    const eventElements = this.localEventsDiv.querySelectorAll('.local-event');
                    for (const element of eventElements) {
                        if (element.textContent.includes(`${event.startTime} - ${event.endTime}: ${event.title}`)) {
                            element.remove();
                            break;
                        }
                    }

                    // イベントレイアウトマネージャーから削除してからレイアウトを再計算
                    this.eventLayoutManager.removeEvent(eventId);
                    this.eventLayoutManager.calculateLayout();
                })
                .catch(error => {
                    logError('イベント削除', error);
                    this._showAlertModal('イベントの削除に失敗しました');
                })
                .finally(() => {
                    if (this.eventDialogElements) {
                        this.eventDialogElements.dialog.style.display = 'none';
                    }
                });
        }
    }

    /**
     * 新しいイベントを追加
     */
    addNewEvent() {
        if (!this.eventDialogElements) return;

        const elements = this.eventDialogElements;
        const title = elements.titleInput.value;
        const startTime = elements.startTimeInput.value;
        const endTime = elements.endTimeInput.value;

        if (title && startTime && endTime) {
            loadLocalEvents()
                .then(localEvents => {
                    // 新しいイベントを追加
                    localEvents.push({title, startTime, endTime});
                    return saveLocalEvents(localEvents);
                })
                .then(() => {
                    // イベント要素を作成して表示
                    const eventDiv = this._createEventDiv(title, startTime, endTime);
                    this.localEventsDiv.appendChild(eventDiv);

                    // イベントレイアウトを再計算
                    this.eventLayoutManager.calculateLayout();

                    this._showAlertModal(chrome.i18n.getMessage("eventSaved") || 'イベントを保存しました');
                })
                .catch(error => {
                    logError('イベント追加', error);
                    this._showAlertModal('イベントの保存に失敗しました');
                })
                .finally(() => {
                    elements.dialog.style.display = 'none';
                });
        } else {
            this._showAlertModal(chrome.i18n.getMessage("fillAllFields") || '全ての項目を入力してください');
        }
    }

    /**
     * アラートモーダルを表示
     * @private
     */
    _showAlertModal(message) {
        if (this.alertModalElements) {
            const { modal, messageElement, closeButton } = this.alertModalElements;
            showAlertModal(message, modal, messageElement, closeButton);
        } else {
            alert(message);
        }
    }
}
