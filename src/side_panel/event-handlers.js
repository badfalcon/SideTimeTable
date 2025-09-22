/**
 * SideTimeTable - イベント管理モジュール
 * 
 * このファイルはGoogleカレンダーイベントとローカルイベントの管理を行います。
 */

import {
    loadLocalEvents,
    loadLocalEventsForDate,
    loadSettings,
    logError,
    saveLocalEvents,
    showAlertModal,
    TIME_CONSTANTS
} from '../lib/utils.js';
import {createTimeOnDate} from '../lib/time-utils.js';
import {getDemoEvents, getDemoLocalEvents, isDemoMode} from '../lib/demo-data.js';

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
        this.lastFetchDate = null; // 最後にAPI呼び出しした日付
        this.currentFetchPromise = null; // 現在実行中のfetch Promise
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
    async fetchEvents(targetDate = null) {
        // 現在の設定を動的に確認
        const settings = await loadSettings();
        const isGoogleIntegrated = settings.googleIntegrated === true;

        if (!isGoogleIntegrated) {
            return Promise.resolve();
        }

        // デモモードの場合はモックデータを使用
        if (isDemoMode()) {
            return this._processDemoEvents();
        }

        // 進行中のリクエストがある場合はそれを返す（重複防止）
        if (this.currentFetchPromise) {
            return this.currentFetchPromise;
        }

        // 同じ日付での重複呼び出し制限チェック
        const targetDay = targetDate || new Date();
        const targetDateStr = targetDay.toDateString(); // 日付文字列で比較

        if (this.lastFetchDate === targetDateStr && this.currentFetchPromise) {
            return this.currentFetchPromise; // 既存のPromiseを返す
        }

        this.lastFetchDate = targetDateStr;

        // イベントを取得（Google色を直接使用）
        this.currentFetchPromise = new Promise((resolve, reject) => {
            const requestId = `req-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
            const message = { action: "getEvents", requestId };
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
        })
            .then(async response => {
                // 以前の表示をクリア
                this.googleEventsDiv.innerHTML = '';

                // Googleイベントのみをレイアウトマネージャーから削除
                if (this.eventLayoutManager && this.eventLayoutManager.events) {
                    const events = [...this.eventLayoutManager.events];
                    events.forEach(event => {
                        if (event && event.type === 'google') {
                            this.eventLayoutManager.removeEvent(event.id);
                        }
                    });
                }

                if (!response) {
                    logError('Googleイベント取得', '応答がありません');
                    return;
                }

                if (response.error) {
                    logError('Googleイベント取得', response.error);
                    const errorDiv = document.createElement('div');
                    errorDiv.className = 'error-message';
                    const rid = response.requestId ? ` [Request ID: ${response.requestId}]` : '';
                    const errType = response.errorType ? ` (${response.errorType})` : '';
                    errorDiv.textContent = (chrome.i18n.getMessage("errorPrefix") || 'エラー: ') + response.error + errType + rid;
                    this.googleEventsDiv.appendChild(errorDiv);
                    return;
                }

                // eventsプロパティの存在確認
                if (!response.events || !Array.isArray(response.events) || response.events.length === 0) {
                    return;
                }

                await this._processEvents(response.events);

                // イベントレイアウトを計算して適用
                if (this.eventLayoutManager && typeof this.eventLayoutManager.calculateLayout === 'function') {
                    this.eventLayoutManager.calculateLayout();
                }
            })
            .catch(error => {
                logError('Googleイベント取得例外', error);
            })
            .finally(() => {
                // リクエスト完了時にPromiseをクリア
                this.currentFetchPromise = null;
            });

        return this.currentFetchPromise;
    }

    /**
     * デモイベントを処理して表示
     * @private
     */
    async _processDemoEvents() {
        return new Promise(async (resolve) => {
            // 以前の表示をクリア
            this.googleEventsDiv.innerHTML = '';

            // Googleイベントのみをレイアウトマネージャーから削除
            const events = [...this.eventLayoutManager.events];
            events.forEach(event => {
                if (event && event.type === 'google') {
                    this.eventLayoutManager.removeEvent(event.id);
                }
            });

            // デモイベントを取得
            const demoEvents = await getDemoEvents();
            
            await this._processEvents(demoEvents);

            // イベントレイアウトを計算して適用
            this.eventLayoutManager.calculateLayout();
            
            resolve();
        });
    }

    /**
     * イベントデータを処理して表示
     * @private
     */
    async _processEvents(events) {
        for (let i = 0; i < events.length; i++) {
            try {
                const event = events[i];
                const uniqueId = `${event.id}-${i}`;

                switch (event.eventType) {
                    case 'workingLocation':
                    case 'focusTime':
                    case 'outOfOffice':
                        continue;
                    case 'default':
                        const uniqueEvent = { ...event, uniqueId };
                        await this._createGoogleEventElement(uniqueEvent);
                        break;
                    default:
                        continue;
                }
            } catch (error) {
                console.error(`イベント${i}の処理中にエラーが発生:`, error);
            }
        }
    }


    /**
     * Googleイベント要素を作成
     * @private
     */
    async _createGoogleEventElement(event) {
        // 終日イベントはスキップ
        if (event.start.date || event.end.date) {
            return;
        }

        const eventDiv = document.createElement('div');
        eventDiv.className = 'event google-event';
        eventDiv.title = event.summary;

        const startDate = new Date(event.start.dateTime || event.start.date);
        let endDate = new Date(event.end.dateTime || event.end.date);

        // 開始時間と終了時間が同じ場合は15分の予定として扱う
        if (startDate.getTime() >= endDate.getTime()) {
            endDate = new Date(startDate.getTime() + 15 * 60 * 1000); // 15分追加
        }

        // データ属性に時刻情報を追加
        eventDiv.dataset.startTime = startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        eventDiv.dataset.endTime = endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // イベントの詳細データを保存
        eventDiv.dataset.description = event.description || '';
        eventDiv.dataset.location = event.location || '';
        eventDiv.dataset.hangoutLink = event.hangoutLink || '';

        // クリックイベントの追加（新しいモーダルコンポーネントを使用）
        eventDiv.addEventListener('click', () => {
            // 親のSidePanelUIControllerからgoogleEventModalを取得
            const sidePanelController = window.sidePanelController;
            if (sidePanelController && sidePanelController.googleEventModal) {
                sidePanelController.googleEventModal.showEvent(event);
            }
        });

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
        
        // Google色を直接適用
        if (event.calendarBackgroundColor) {
            eventDiv.style.backgroundColor = event.calendarBackgroundColor;
            eventDiv.style.color = event.calendarForegroundColor;
        }
        
        // ロケール対応の時間表示を非同期で設定（参加者情報付き）
        await this._setEventContentWithLocale(eventDiv, startDate, event.summary, event);

        this.googleEventsDiv.appendChild(eventDiv);

        // イベントレイアウトマネージャーに登録
        const eventId = event.uniqueId || event.id || `google-${Date.now()}-${Math.random()}`;
        if (this.eventLayoutManager && typeof this.eventLayoutManager.registerEvent === 'function') {
            this.eventLayoutManager.registerEvent({
                startTime: startDate,
                endTime: endDate,
                element: eventDiv,
                title: event.summary,
                type: 'google',
                id: eventId,
                calendarId: event.calendarId
            });
        }
    }


    /**
     * ロケールに対応した時間表示でイベント内容を設定
     * @param {HTMLElement} eventDiv - イベント要素
     * @param {Date} startDate - 開始時刻
     * @param {string} summary - イベントのタイトル
     * @param {Object} event - イベント全体の情報
     * @private
     */
    async _setEventContentWithLocale(eventDiv, startDate, summary, event) {
        try {
            // 現在のロケールを取得
            const locale = await window.getCurrentLocale();

            // 時間をロケール形式でフォーマット
            const startHours = String(startDate.getHours()).padStart(2, '0');
            const startMinutes = String(startDate.getMinutes()).padStart(2, '0');
            const timeString = `${startHours}:${startMinutes}`;

            const formattedTime = window.formatTimeForLocale(timeString, locale);

            // 参加者情報がある場合は追加情報を表示
            let displayText = `${formattedTime} - ${summary}`;

            if (event.attendees && event.attendees.length > 0) {
                // 自分の参加ステータスを確認
                const myStatus = this._getMyAttendanceStatus(event.attendees);
                if (myStatus) {
                    const statusIcon = this._getStatusIcon(myStatus);
                    displayText = `${formattedTime} ${statusIcon} ${summary}`;
                }
            }

            eventDiv.textContent = displayText;
        } catch (error) {
            // エラーの場合は従来の表示方法を使用
            console.warn('ロケール時間フォーマットエラー:', error);
            eventDiv.textContent = `${startDate.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
            })} - ${summary}`;
        }
    }

    /**
     * 自分の参加ステータスを取得
     * @param {Array} attendees - 参加者配列
     * @returns {string|null} 参加ステータス
     * @private
     */
    _getMyAttendanceStatus(attendees) {
        // 簡単な実装：最初の参加者のステータスを返す
        // 実際には現在のユーザーのメールアドレスと照合する必要がある
        return attendees[0]?.responseStatus || null;
    }

    /**
     * ステータスに応じたアイコンを取得
     * @param {string} status - 参加ステータス
     * @returns {string} アイコン文字
     * @private
     */
    _getStatusIcon(status) {
        switch (status) {
            case 'accepted':
                return '✅';
            case 'declined':
                return '❌';
            case 'tentative':
                return '❓';
            default:
                return '⚪';
        }
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
    async loadLocalEvents(targetDate = null) {
        // 対象日付を更新
        this.currentTargetDate = targetDate || new Date();
        
        this.localEventsDiv.innerHTML = ''; // 以前の表示をクリア

        // デモモードの場合はモックデータを使用
        if (isDemoMode()) {
            const demoEvents = await getDemoLocalEvents();

            for (const event of demoEvents) {
                try {
                    const eventDiv = await this._createEventDiv(event.title, event.startTime, event.endTime);
                    this.localEventsDiv.appendChild(eventDiv);
                } catch (error) {
                    logError('デモイベント表示', error);
                }
            }
            return;
        }

        const loadFunction = targetDate ? 
            () => loadLocalEventsForDate(targetDate) : 
            () => loadLocalEvents();
            
        loadFunction()
            .then(async events => {

                for (const event of events) {
                    try {
                        const eventDiv = await this._createEventDiv(event.title, event.startTime, event.endTime);
                        this.localEventsDiv.appendChild(eventDiv);
                    } catch (error) {
                        logError('イベント表示', error);
                    }
                }

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
    async _createEventDiv(title, startTime, endTime) {
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
        
        // ロケール対応の時間表示を非同期で設定
        await this._setLocalEventContentWithLocale(eventDiv, startTime, endTime, title);

        // 編集機能を設定
        this._setupEventEdit(eventDiv, {title, startTime, endTime});

        // イベントレイアウトマネージャーに登録
        this.eventLayoutManager.registerEvent({
            startTime: startDate,
            endTime: endDate,
            element: eventDiv,
            type: 'local',
            title: title,
            id: `local-${title}-${startTime}-${endTime}`
        });

        return eventDiv;
    }

    /**
     * ロケールに対応した時間表示でローカルイベント内容を設定
     * @param {HTMLElement} eventDiv - イベント要素
     * @param {string} startTime - 開始時刻（HH:mm形式）
     * @param {string} endTime - 終了時刻（HH:mm形式）
     * @param {string} title - イベントのタイトル
     * @private
     */
    async _setLocalEventContentWithLocale(eventDiv, startTime, endTime, title) {
        try {
            // 現在のロケールを取得
            const locale = await window.getCurrentLocale();
            
            // 時間範囲をロケール形式でフォーマット
            const formattedTimeRange = window.formatTimeRangeForLocale(startTime, endTime, locale);
            eventDiv.textContent = `${formattedTimeRange}: ${title}`;
        } catch (error) {
            // エラーの場合は従来の表示方法を使用
            console.warn('ロケール時間フォーマットエラー:', error);
            eventDiv.textContent = `${startTime} - ${endTime}: ${title}`;
        }
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
                .then(async () => {
                    // イベント要素を作成して表示
                    const eventDiv = await this._createEventDiv(title, startTime, endTime);
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
