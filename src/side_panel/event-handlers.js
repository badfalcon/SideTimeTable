/**
 * SideTimeTable - イベント管理モジュール
 * 
 * このファイルはGoogleカレンダーイベントとローカルイベントの管理を行います。
 */

import {
    loadLocalEvents,
    loadLocalEventsForDate,
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
        this.lastFetchTime = 0; // 最後のAPI呼び出し時刻
        this.minFetchInterval = 30000; // 30秒間隔の制限
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
    fetchEvents(targetDate = null) {
        console.log('Googleイベント取得開始');
        console.log('Google連携状態:', this.isGoogleIntegrated);

        if (!this.isGoogleIntegrated) {
            console.log('Google連携が無効です');
            return Promise.resolve();
        }

        // デモモードの場合はモックデータを使用
        if (isDemoMode()) {
            console.log('デモモードでモックデータを使用します');
            return this._processDemoEvents();
        }

        // 進行中のリクエストがある場合はそれを返す（重複防止）
        if (this.currentFetchPromise) {
            console.log('既にイベント取得中です。既存のPromiseを返します');
            return this.currentFetchPromise;
        }

        // API呼び出し頻度制限チェック
        const now = Date.now();
        if (now - this.lastFetchTime < this.minFetchInterval) {
            console.log('API呼び出し頻度制限により、スキップします');
            return Promise.resolve();
        }

        this.lastFetchTime = now;

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
                    const rid = response.requestId ? ` [Request ID: ${response.requestId}]` : '';
                    const errType = response.errorType ? ` (${response.errorType})` : '';
                    errorDiv.textContent = (chrome.i18n.getMessage("errorPrefix") || 'エラー: ') + response.error + errType + rid;
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
    _processDemoEvents() {
        return new Promise((resolve) => {
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
            const demoEvents = getDemoEvents();
            console.log('デモイベント処理開始:', demoEvents.length + '件');
            
            this._processEvents(demoEvents);

            // イベントレイアウトを計算して適用
            this.eventLayoutManager.calculateLayout();
            
            resolve();
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
        
        // Google色を直接適用
        if (event.calendarBackgroundColor) {
            eventDiv.style.backgroundColor = event.calendarBackgroundColor;
            eventDiv.style.color = event.calendarForegroundColor;
        }
        
        let eventContent = `${startDate.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        })} - ${event.summary}`;

        eventDiv.textContent = eventContent;

        this.googleEventsDiv.appendChild(eventDiv);

        // イベントレイアウトマネージャーに登録
        this.eventLayoutManager.registerEvent({
            startTime: startDate,
            endTime: endDate,
            element: eventDiv,
            title: event.summary,
            type: 'google',
            id: event.id || `google-${Date.now()}-${Math.random()}`,
            calendarId: event.calendarId
        });
    }


    /**
     * イベントの詳細を表示
     * @private
     */
    _showEventDetails(event) {
        const dialog = document.getElementById('googleEventDialog');
        const closeBtn = document.getElementById('closeGoogleEventDialog');

        // タイトル設定（タイトル自体をGoogleカレンダーのイベントページへのリンクにする）
        const titleEl = dialog.querySelector('.google-event-title');
        titleEl.innerHTML = '';

        const titleText = event.summary || '(無題)';

        // 最優先は API レスポンスの htmlLink
        let linkHref = event.htmlLink || '';

        if (linkHref) {
            const a = document.createElement('a');
            a.href = linkHref;
            a.target = '_blank';
            a.rel = 'noopener';
            a.textContent = titleText;
            // 見た目の調整（最小差分: 下線 + 色継承）
            a.style.color = 'inherit';
            a.style.textDecoration = 'underline';
            a.title = 'カレンダーで開く';
            titleEl.appendChild(a);
        } else {
            // リンクが作れない場合はテキスト表示にフォールバック
            titleEl.textContent = titleText;
        }

        // カレンダー名設定
        const calendarEl = dialog.querySelector('.google-event-calendar');
        if (event.calendarName) {
            calendarEl.textContent = `カレンダー: ${event.calendarName}`;
            calendarEl.style.display = 'block';
        } else {
            calendarEl.style.display = 'none';
        }

        // 日時設定
        const startDate = new Date(event.start.dateTime);
        const endDate = new Date(event.end.dateTime);
        dialog.querySelector('.google-event-time').textContent = `${startDate.toLocaleString()} - ${endDate.toLocaleString()}`;

        // 説明設定
        const descriptionEl = dialog.querySelector('.google-event-description');
        if (event.description) {
            // HTMLタグを適切に処理するためinnerHTMLを使用
            descriptionEl.innerHTML = this._sanitizeHtml(event.description);
            descriptionEl.style.display = 'block';
        } else {
            descriptionEl.style.display = 'none';
        }

        // 場所設定（テキストのみ）
        const locationEl = dialog.querySelector('.google-event-location');
        let mapsUrl = '';
        if (event.location) {
            const locationText = `場所: ${event.location}`;
            mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`;
            locationEl.textContent = locationText;
            locationEl.style.display = 'block';
        } else {
            locationEl.style.display = 'none';
        }

        // アクションボタン領域（Meet と Map を横並び）
        const meetEl = dialog.querySelector('.google-event-meet');
        const buttons = [];
        // Meet ボタン
        if (event.hangoutLink) {
            buttons.push(`<button class="btn btn-primary" id="openMeetButton" title="Google Meet を新しいタブで開く"><i class="fas fa-video"></i> Meetを開く</button>`);
        }
        // Map ボタン（場所がある場合）
        if (mapsUrl) {
            buttons.push(`<button class="btn btn-secondary" id="openMapButton" title="Google マップで開く"><i class="fas fa-map-marker-alt"></i> マップを開く</button>`);
        }
        if (buttons.length > 0) {
            meetEl.innerHTML = buttons.join(' ');
            // クリックハンドラ
            const openMeetButton = dialog.querySelector('#openMeetButton');
            if (openMeetButton) {
                openMeetButton.onclick = () => {
                    try {
                        window.open(event.hangoutLink, '_blank', 'noopener');
                    } catch (e) {
                        console.error('Meetを開けませんでした:', e);
                    }
                };
            }
            const openMapButton = dialog.querySelector('#openMapButton');
            if (openMapButton) {
                openMapButton.onclick = () => {
                    try {
                        window.open(mapsUrl, '_blank', 'noopener');
                    } catch (e) {
                        console.error('マップを開けませんでした:', e);
                    }
                };
            }
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

    /**
     * HTMLをサニタイズ（安全なタグのみ許可）
     * @param {string} html - サニタイズするHTML文字列
     * @returns {string} サニタイズされたHTML文字列
     * @private
     */
    _sanitizeHtml(html) {
        // 改行をbrタグに変換
        let sanitized = html.replace(/\n/g, '<br>');
        
        // 安全なHTMLタグのみを許可
        const allowedTags = ['a', 'br', 'b', 'strong', 'i', 'em', 'u', 'p', 'div', 'span'];
        const allowedAttributes = ['href', 'target', 'title'];
        
        // 簡易HTMLサニタイザー
        // より厳密な場合は DOMPurify などのライブラリを使用することを推奨
        sanitized = sanitized.replace(/<(\/?)([\w]+)([^>]*)>/g, (match, slash, tag, attrs) => {
            const lowerTag = tag.toLowerCase();
            
            if (!allowedTags.includes(lowerTag)) {
                return ''; // 許可されていないタグは削除
            }
            
            if (slash) {
                return `</${lowerTag}>`;
            }
            
            // 属性をフィルタリング
            const filteredAttrs = attrs.replace(/(\w+)=["']([^"']*)["']/g, (attrMatch, name, value) => {
                if (allowedAttributes.includes(name.toLowerCase())) {
                    // target="_blank"の場合はrel="noopener"を追加
                    if (name.toLowerCase() === 'target' && value === '_blank') {
                        return `${name}="${value}" rel="noopener"`;
                    }
                    return `${name}="${value}"`;
                }
                return '';
            });
            
            return `<${lowerTag}${filteredAttrs}>`;
        });
        
        return sanitized;
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

        // デモモードの場合はモックデータを使用
        if (isDemoMode()) {
            console.log('デモモードでローカルモックデータを使用します');
            const demoEvents = getDemoLocalEvents();
            console.log('デモローカルイベント取得:', demoEvents.length + '件');

            demoEvents.forEach(event => {
                try {
                    const eventDiv = this._createEventDiv(event.title, event.startTime, event.endTime);
                    this.localEventsDiv.appendChild(eventDiv);
                } catch (error) {
                    logError('デモイベント表示', error);
                }
            });
            return;
        }

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
            title: title,
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
