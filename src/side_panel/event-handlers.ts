/**
 * SideTimeTable - イベント管理モジュール
 * 
 * このファイルはGoogleカレンダーイベントとローカルイベントの管理を行います。
 */

import { TIME_CONSTANTS, loadLocalEvents, saveLocalEvents, logError, showAlertModal, LocalEvent } from '../lib/utils';

// イベントレイアウトマネージャーに登録するイベントのインターフェース
interface LayoutEvent {
    startTime: Date | number;
    endTime: Date | number;
    element: HTMLElement;
    id: string;
    type?: 'google' | 'local';
}

// Googleカレンダーイベントのインターフェース
interface GoogleEvent {
    id?: string;
    summary: string;
    start: {
        dateTime?: string;
        date?: string;
    };
    end: {
        dateTime?: string;
        date?: string;
    };
    hangoutLink?: string;
    eventType?: string;
}

// イベントレイアウトマネージャーのインターフェース
interface EventLayoutManager {
    events: LayoutEvent[];
    registerEvent(event: LayoutEvent): void;
    removeEvent(id: string): boolean;
    calculateLayout(): void;
}

// タイムテーブルマネージャーのインターフェース
interface TimeTableManager {
    openTime: number;
    closeTime: number;
}

// ダイアログ要素のインターフェース
interface EventDialogElements {
    dialog: HTMLElement;
    titleInput: HTMLInputElement;
    startTimeInput: HTMLInputElement;
    endTimeInput: HTMLInputElement;
    saveButton: HTMLElement;
    deleteButton: HTMLElement;
}

// アラートモーダル要素のインターフェース
interface AlertModalElements {
    modal: HTMLElement;
    messageElement: HTMLElement;
    closeButton: HTMLElement;
}

/**
 * GoogleEventManager - Googleイベント管理クラス
 */
export class GoogleEventManager {
    private timeTableManager: TimeTableManager;
    private googleEventsDiv: HTMLElement;
    private eventLayoutManager: EventLayoutManager;
    private isGoogleIntegrated: boolean;

    /**
     * コンストラクタ
     * @param {TimeTableManager} timeTableManager - タイムテーブルマネージャーのインスタンス
     * @param {HTMLElement} googleEventsDiv - Googleイベント表示用のDOM要素
     * @param {EventLayoutManager} eventLayoutManager - イベントレイアウトマネージャーのインスタンス
     */
    constructor(timeTableManager: TimeTableManager, googleEventsDiv: HTMLElement, eventLayoutManager: EventLayoutManager) {
        this.timeTableManager = timeTableManager;
        this.googleEventsDiv = googleEventsDiv;
        this.eventLayoutManager = eventLayoutManager;
        this.isGoogleIntegrated = false;
    }

    /**
     * Google連携設定を適用
     * @param {boolean} isIntegrated - Google連携が有効かどうか
     */
    setGoogleIntegration(isIntegrated: boolean): void {
        this.isGoogleIntegrated = isIntegrated;
    }

    /**
     * Googleカレンダーから予定を取得
     */
    fetchEvents(): void {
        console.log('Googleイベント取得開始');
        console.log('Google連携状態:', this.isGoogleIntegrated);

        if (!this.isGoogleIntegrated) {
            console.log('Google連携が無効です');
            return;
        }

        try {
            chrome.runtime.sendMessage({action: "getEvents"}, (response: {events?: GoogleEvent[], error?: string}) => {
                console.log('イベント取得応答:', response);

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
                    const errorMessage = chrome.runtime.lastError.message || 'Unknown error';
                    logError('Googleイベント取得', errorMessage);
                    return;
                }

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
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logError('Googleイベント取得例外', errorMessage);
        }
    }

    /**
     * イベントデータを処理して表示
     * @private
     */
    private _processEvents(events: GoogleEvent[]): void {
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
    private _createGoogleEventElement(event: GoogleEvent): void {
        // 終日イベントはスキップ
        if (event.start.date || event.end.date) {
            return;
        }

        const eventDiv = document.createElement('div');
        eventDiv.className = 'event google-event';
        // ツールチップとしてイベントのタイトルを表示
        eventDiv.title = event.summary;

        const startDate = new Date(event.start.dateTime || event.start.date || '');
        const endDate = new Date(event.end.dateTime || event.end.date || '');

        const startOffset = (1 + (startDate.getTime() - this.timeTableManager.openTime) / TIME_CONSTANTS.HOUR_MILLIS) * TIME_CONSTANTS.UNIT_HEIGHT;
        const duration = (endDate.getTime() - startDate.getTime()) / TIME_CONSTANTS.MINUTE_MILLIS * TIME_CONSTANTS.UNIT_HEIGHT / 60;

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
    private timeTableManager: TimeTableManager;
    private localEventsDiv: HTMLElement;
    private eventLayoutManager: EventLayoutManager;
    private eventDialogElements: EventDialogElements | null;
    private alertModalElements: AlertModalElements | null;

    /**
     * コンストラクタ
     * @param {TimeTableManager} timeTableManager - タイムテーブルマネージャーのインスタンス
     * @param {HTMLElement} localEventsDiv - ローカルイベント表示用のDOM要素
     * @param {EventLayoutManager} eventLayoutManager - イベントレイアウトマネージャーのインスタンス
     */
    constructor(timeTableManager: TimeTableManager, localEventsDiv: HTMLElement, eventLayoutManager: EventLayoutManager) {
        this.timeTableManager = timeTableManager;
        this.localEventsDiv = localEventsDiv;
        this.eventLayoutManager = eventLayoutManager;
        this.eventDialogElements = null;
        this.alertModalElements = null;
    }

    /**
     * ダイアログ要素を設定
     * @param {EventDialogElements} elements - ダイアログ関連の要素
     */
    setDialogElements(elements: EventDialogElements): void {
        this.eventDialogElements = elements;
    }

    /**
     * アラートモーダル要素を設定
     * @param {AlertModalElements} elements - アラートモーダル関連の要素
     */
    setAlertModalElements(elements: AlertModalElements): void {
        this.alertModalElements = elements;
    }

    /**
     * ローカルイベントをロード
     */
    loadLocalEvents(): void {
        this.localEventsDiv.innerHTML = ''; // 以前の表示をクリア

        loadLocalEvents()
            .then(events => {
                console.log('ローカルイベント取得:', events.length + '件');

                events.forEach(event => {
                    try {
                        const eventDiv = this._createEventDiv(event.title, event.startTime, event.endTime);
                        this.localEventsDiv.appendChild(eventDiv);
                    } catch (error) {
                        const errorMessage = error instanceof Error ? error.message : String(error);
                        logError('イベント表示', errorMessage);
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
    private _createEventDiv(title: string, startTime: string, endTime: string): HTMLElement {
        const eventDiv = document.createElement('div');
        eventDiv.className = 'event local-event';
        // ツールチップとしてイベントのタイトルを表示
        eventDiv.title = title;

        const startDate = new Date();
        startDate.setHours(parseInt(startTime.split(':')[0]), parseInt(startTime.split(':')[1]), 0, 0);
        const endDate = new Date();
        endDate.setHours(parseInt(endTime.split(':')[0]), parseInt(endTime.split(':')[1]), 0, 0);

        const startOffset = (1 + (startDate.getTime() - this.timeTableManager.openTime) / TIME_CONSTANTS.HOUR_MILLIS) * TIME_CONSTANTS.UNIT_HEIGHT;
        const duration = (endDate.getTime() - startDate.getTime()) / TIME_CONSTANTS.MINUTE_MILLIS * TIME_CONSTANTS.UNIT_HEIGHT / 60;

        if (duration < 30) {
            eventDiv.className = 'event local-event short';
            eventDiv.style.height = `${duration}px`;
        } else {
            eventDiv.style.height = `${duration - 10}px`;
        }

        eventDiv.style.top = `${startOffset}px`;
        eventDiv.textContent = `${startTime} - ${endTime}: ${title}`;

        // 編集機能を設定
        const eventId = `local-${title}-${startTime}-${endTime}`;
        this._setupEventEdit(eventDiv, {id: eventId, title, startTime, endTime});

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
    private _setupEventEdit(eventDiv: HTMLElement, event: LocalEvent): void {
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
    private _handleEventUpdate(originalEvent: LocalEvent): void {
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
                            id: localEvents[eventIndex].id || `local-${Date.now()}`,
                            title: newTitle,
                            startTime: newStartTime,
                            endTime: newEndTime
                        };

                        return saveLocalEvents(localEvents);
                    }
                    return Promise.resolve();
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
    private _handleEventDelete(event: LocalEvent): void {
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
                    Array.from(eventElements).forEach(element => {
                        if (element.textContent?.includes(`${event.startTime} - ${event.endTime}: ${event.title}`)) {
                            element.remove();
                        }
                    });

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
    addNewEvent(): void {
        if (!this.eventDialogElements) return;

        const elements = this.eventDialogElements;
        const title = elements.titleInput.value;
        const startTime = elements.startTimeInput.value;
        const endTime = elements.endTimeInput.value;

        if (title && startTime && endTime) {
            loadLocalEvents()
                .then(localEvents => {
                    // 新しいイベントを追加
                    localEvents.push({
                        id: `local-${Date.now()}`,
                        title, 
                        startTime, 
                        endTime
                    });
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
    private _showAlertModal(message: string): void {
        if (this.alertModalElements) {
            const { modal, messageElement, closeButton } = this.alertModalElements;
            showAlertModal(message, modal, messageElement, closeButton);
        } else {
            alert(message);
        }
    }
}