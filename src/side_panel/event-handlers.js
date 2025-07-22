/**
 * SideTimeTable - イベント管理モジュール
 * 
 * このファイルはGoogleカレンダーイベントとローカルイベントの管理を行います。
 */

import { TIME_CONSTANTS, loadLocalEvents, saveLocalEvents, logError, showAlertModal, getFormattedDate } from '../lib/utils.js';

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
     * @param {Date} [date=new Date()] - 取得する日付（省略時は現在の日付）
     */
    fetchEvents(date = new Date()) {
        if (!this.isGoogleIntegrated) {
            // Google連携が無効でも、既存のイベントのレイアウトを計算
            this.eventLayoutManager.calculateLayout();
            return;
        }

        try {
            const dateStr = getFormattedDate(date);
            chrome.runtime.sendMessage({action: "getEvents", date: dateStr}, (response) => {
                // 以前の表示をクリア
                this.googleEventsDiv.innerHTML = '';

                // Googleイベントのみをレイアウトマネージャーから削除
                // 全イベントをクリアするのではなく、Googleイベントのみを削除
                const events = [...this.eventLayoutManager.events];
                events.forEach(event => {
                    if (event && event.type === 'google') {
                        this.eventLayoutManager.removeEvent(event.id);
                    }
                });

                if (chrome.runtime.lastError) {
                    logError('Googleイベント取得', chrome.runtime.lastError);
                    this.eventLayoutManager.calculateLayout();
                    return;
                }

                if (!response) {
                    logError('Googleイベント取得', '応答がありません');
                    this.eventLayoutManager.calculateLayout();
                    return;
                }

                if (response.error) {
                    logError('Googleイベント取得', response.error);
                    const errorDiv = document.createElement('div');
                    errorDiv.className = 'error-message';
                    errorDiv.textContent = chrome.i18n.getMessage("errorPrefix") + response.error;
                    this.googleEventsDiv.appendChild(errorDiv);
                    this.eventLayoutManager.calculateLayout();
                    return;
                }

                if (!response.events || response.events.length === 0) {
                    this.eventLayoutManager.calculateLayout();
                    return;
                }

                this._processEvents(response.events);

                // イベントレイアウトを計算して適用
                this.eventLayoutManager.calculateLayout();
            });
        } catch (error) {
            logError('Googleイベント取得例外', error);
            this.eventLayoutManager.calculateLayout();
        }
    }

    /**
     * イベントデータを処理して表示
     * @private
     */
    _processEvents(events) {
        events.forEach(event => {
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
        // ツールチップとしてイベントのタイトルを表示
        eventDiv.title = event.summary;

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

        // イベントレイアウトマネージャーに登録
        this.eventLayoutManager.registerEvent({
            startTime: startDate,
            endTime: endDate,
            element: eventDiv,
            type: 'google',
            id: event.id || `google-${Date.now()}-${Math.random()}`
        });
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
     * @param {Date} [date=new Date()] - 読み込む日付（省略時は現在の日付）
     */
    loadLocalEvents(date = new Date()) {
        this.localEventsDiv.innerHTML = ''; // 以前の表示をクリア

        loadLocalEvents(date)
            .then(events => {
                events.forEach(event => {
                    try {
                        const eventDiv = this._createEventDiv(event.title, event.startTime, event.endTime, date);
                        this.localEventsDiv.appendChild(eventDiv);
                    } catch (error) {
                        logError('イベント表示', error);
                    }
                });

                // ローカルイベントの表示後にレイアウト計算を行う
                this.eventLayoutManager.calculateLayout();
            })
            .catch(error => {
                logError('ローカルイベント読み込み', error);
                // エラー時にもレイアウト計算を行う
                this.eventLayoutManager.calculateLayout();
            });
    }

    /**
     * イベント要素を作成
     * @private
     * @param {string} title - イベントのタイトル
     * @param {string} startTime - 開始時刻（HH:MM形式）
     * @param {string} endTime - 終了時刻（HH:MM形式）
     * @param {Date} [date=new Date()] - イベントの日付
     */
    _createEventDiv(title, startTime, endTime, date = new Date()) {
        const eventDiv = document.createElement('div');
        eventDiv.className = 'event local-event';
        // ツールチップとしてイベントのタイトルを表示
        eventDiv.title = title;

        const startDate = new Date(date);
        startDate.setHours(startTime.split(':')[0], startTime.split(':')[1], 0, 0);
        const endDate = new Date(date);
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
        this._setupEventEdit(eventDiv, {title, startTime, endTime, date});

        // イベントレイアウトマネージャーに登録
        this.eventLayoutManager.registerEvent({
            startTime: startDate,
            endTime: endDate,
            element: eventDiv,
            type: 'local',
            id: `local-${title}-${startTime}-${endTime}-${getFormattedDate(date)}`
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
        const date = originalEvent.date || new Date();

        if (newTitle && newStartTime && newEndTime) {
            loadLocalEvents(date)
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

                        return saveLocalEvents(localEvents, date);
                    }
                })
                .then(() => {
                    this._showAlertModal(chrome.i18n.getMessage("eventUpdated") || 'イベントを更新しました');
                    this.loadLocalEvents(date); // イベント表示を更新
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
            const date = event.date || new Date();
            // イベントIDを生成
            const eventId = `local-${event.title}-${event.startTime}-${event.endTime}-${getFormattedDate(date)}`;

            loadLocalEvents(date)
                .then(localEvents => {
                    // 対象のイベントを除外
                    const updatedEvents = localEvents.filter(e => 
                        !(e.title === event.title && 
                          e.startTime === event.startTime && 
                          e.endTime === event.endTime)
                    );

                    return saveLocalEvents(updatedEvents, date);
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
     * @param {Date} [date=new Date()] - イベントの日付
     */
    addNewEvent(date = new Date()) {
        if (!this.eventDialogElements) return;

        const elements = this.eventDialogElements;
        const title = elements.titleInput.value;
        const startTime = elements.startTimeInput.value;
        const endTime = elements.endTimeInput.value;

        if (title && startTime && endTime) {
            loadLocalEvents(date)
                .then(localEvents => {
                    // 新しいイベントを追加
                    localEvents.push({title, startTime, endTime});
                    return saveLocalEvents(localEvents, date);
                })
                .then(() => {
                    // イベント要素を作成して表示
                    const eventDiv = this._createEventDiv(title, startTime, endTime, date);
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
