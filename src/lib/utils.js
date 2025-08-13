/**
 * SideTimeTable - ユーティリティ関数
 * 
 * このファイルは拡張機能全体で使用される共通の関数や定数を提供します。
 */

// 時間関連の定数
export const TIME_CONSTANTS = {
    HOUR_MILLIS: 3600000,  // 1時間あたりのミリ秒数
    MINUTE_MILLIS: 60000,  // 1分あたりのミリ秒数
    UNIT_HEIGHT: 60,       // 1時間あたりの高さ（ピクセル）
    DEFAULT_OPEN_HOUR: '09:00',
    DEFAULT_CLOSE_HOUR: '18:00',
    DEFAULT_BREAK_START: '12:00',
    DEFAULT_BREAK_END: '13:00'
};

// デフォルト設定
export const DEFAULT_SETTINGS = {
    googleIntegrated: false,
    openTime: TIME_CONSTANTS.DEFAULT_OPEN_HOUR,
    closeTime: TIME_CONSTANTS.DEFAULT_CLOSE_HOUR,
    workTimeColor: '#d4d4d4',
    breakTimeFixed: false,
    breakTimeStart: TIME_CONSTANTS.DEFAULT_BREAK_START,
    breakTimeEnd: TIME_CONSTANTS.DEFAULT_BREAK_END,
    localEventColor: '#bbf2b1',
    googleEventColor: '#c3d6f7',
    selectedCalendars: [], // 選択されたカレンダーID配列
    availableCalendars: {}, // 利用可能なカレンダー情報
    calendarColors: {} // カレンダーごとのカスタム色設定
};

/**
 * 時間選択リストを生成する
 * @param {HTMLElement} timeListElement - datalistのDOM要素
 */
export function generateTimeList(timeListElement) {
    if (!timeListElement) return;
    
    timeListElement.innerHTML = ''; // 既存の選択肢をクリア
    
    for (let hour = 7; hour < 21; hour++) {
        for (let minute = 0; minute < 60; minute += 15) {
            const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
            const option = document.createElement('option');
            option.value = time;
            option.textContent = time;
            timeListElement.appendChild(option);
        }
    }
}

/**
 * 現在の日付を取得（YYYY-MM-DD形式）
 * @returns {string} YYYY-MM-DD形式の日付文字列
 */
export function getFormattedDate() {
    const today = new Date();
    return today.toISOString().split('T')[0]; // YYYY-MM-DD 形式の文字列を取得
}

/**
 * 指定した日付を取得（YYYY-MM-DD形式）
 * @param {Date} date - 対象の日付
 * @returns {string} YYYY-MM-DD形式の日付文字列
 */
export function getFormattedDateFromDate(date) {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD 形式の文字列を取得
}

/**
 * 設定を保存する
 * @param {Object} settings - 保存する設定オブジェクト
 * @returns {Promise} 保存処理のPromise
 */
export function saveSettings(settings) {
    return new Promise((resolve, reject) => {
        try {
            chrome.storage.sync.set(settings, () => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                    return;
                }
                resolve();
            });
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * 設定を読み込む
 * @param {Object} defaultSettings - デフォルト設定（省略時はDEFAULT_SETTINGSを使用）
 * @returns {Promise<Object>} 設定オブジェクトを返すPromise
 */
export function loadSettings(defaultSettings = DEFAULT_SETTINGS) {
    return new Promise((resolve, reject) => {
        try {
            chrome.storage.sync.get(defaultSettings, (items) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                    return;
                }
                resolve(items);
            });
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * ローカルイベントを読み込む
 * @returns {Promise<Array>} イベントの配列を返すPromise
 */
export function loadLocalEvents() {
    return loadLocalEventsForDate(new Date());
}

/**
 * 指定した日付のローカルイベントを読み込む
 * @param {Date} targetDate - 対象の日付
 * @returns {Promise<Array>} イベントの配列を返すPromise
 */
export function loadLocalEventsForDate(targetDate) {
    return new Promise((resolve, reject) => {
        try {
            const targetDateStr = getFormattedDateFromDate(targetDate);
            const storageKey = `localEvents_${targetDateStr}`;
            
            chrome.storage.sync.get({[storageKey]: []}, (data) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                    return;
                }
                
                resolve(data[storageKey] || []);
            });
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * ローカルイベントを保存する
 * @param {Array} events - 保存するイベントの配列
 * @returns {Promise} 保存処理のPromise
 */
export function saveLocalEvents(events) {
    return saveLocalEventsForDate(events, new Date());
}

/**
 * 指定した日付のローカルイベントを保存する
 * @param {Array} events - 保存するイベントの配列
 * @param {Date} targetDate - 対象の日付
 * @returns {Promise} 保存処理のPromise
 */
export function saveLocalEventsForDate(events, targetDate) {
    return new Promise((resolve, reject) => {
        try {
            const targetDateStr = getFormattedDateFromDate(targetDate);
            const storageKey = `localEvents_${targetDateStr}`;
            
            chrome.storage.sync.set({
                [storageKey]: events
            }, () => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                    return;
                }
                resolve();
            });
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * サイドパネルをリロードする
 * @returns {Promise} リロード処理のPromise
 */
export function reloadSidePanel() {
    return new Promise((resolve, reject) => {
        try {
            chrome.runtime.sendMessage({ action: "reloadSideTimeTable" }, (response) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                    return;
                }
                
                if (!response || !response.success) {
                    reject(new Error('リロードに失敗しました'));
                    return;
                }
                
                resolve();
            });
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * エラーをログに記録する
 * @param {string} context - エラーが発生したコンテキスト
 * @param {Error|string} error - エラーオブジェクトまたはエラーメッセージ
 */
export function logError(context, error) {
    console.error(`[${context}] エラー:`, error);
}

/**
 * アラートモーダルを表示する
 * @param {string} message - 表示するメッセージ
 * @param {HTMLElement} alertModal - アラートモーダルのDOM要素
 * @param {HTMLElement} alertMessage - メッセージを表示する要素
 * @param {HTMLElement} closeButton - 閉じるボタン
 */
export function showAlertModal(message, alertModal, alertMessage, closeButton) {
    if (!alertModal || !alertMessage) return;
    
    alertMessage.textContent = message;
    alertModal.style.display = 'flex';
    
    if (closeButton) {
        closeButton.onclick = () => {
            alertModal.style.display = 'none';
        };
    }
    
    // モーダル外クリックで閉じる
    window.onclick = (event) => {
        if (event.target === alertModal) {
            alertModal.style.display = 'none';
        }
    };
}

/**
 * 選択されたカレンダーを保存する
 * @param {Array<string>} selectedCalendars - 選択されたカレンダーIDの配列
 * @returns {Promise} 保存処理のPromise
 */
export function saveSelectedCalendars(selectedCalendars) {
    return new Promise((resolve, reject) => {
        try {
            chrome.storage.sync.set({ selectedCalendars }, () => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                    return;
                }
                resolve();
            });
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * 選択されたカレンダーを読み込む
 * @returns {Promise<Array<string>>} 選択されたカレンダーIDの配列を返すPromise
 */
export function loadSelectedCalendars() {
    return new Promise((resolve, reject) => {
        try {
            chrome.storage.sync.get({ selectedCalendars: [] }, (data) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                    return;
                }
                resolve(data.selectedCalendars || []);
            });
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * 利用可能なカレンダー情報を保存する
 * @param {Object} availableCalendars - カレンダー情報オブジェクト
 * @returns {Promise} 保存処理のPromise
 */
export function saveAvailableCalendars(availableCalendars) {
    return new Promise((resolve, reject) => {
        try {
            chrome.storage.sync.set({ availableCalendars }, () => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                    return;
                }
                resolve();
            });
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * 利用可能なカレンダー情報を読み込む
 * @returns {Promise<Object>} カレンダー情報オブジェクトを返すPromise
 */
export function loadAvailableCalendars() {
    return new Promise((resolve, reject) => {
        try {
            chrome.storage.sync.get({ availableCalendars: {} }, (data) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                    return;
                }
                resolve(data.availableCalendars || {});
            });
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * カレンダー色設定を保存する
 * @param {Object} calendarColors - カレンダーIDをキーとする色設定オブジェクト
 * @returns {Promise} 保存処理のPromise
 */
export function saveCalendarColors(calendarColors) {
    return new Promise((resolve, reject) => {
        try {
            chrome.storage.sync.set({ calendarColors }, () => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                    return;
                }
                resolve();
            });
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * カレンダー色設定を読み込む
 * @returns {Promise<Object>} カレンダー色設定オブジェクトを返すPromise
 */
export function loadCalendarColors() {
    return new Promise((resolve, reject) => {
        try {
            chrome.storage.sync.get({ calendarColors: {} }, (data) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                    return;
                }
                resolve(data.calendarColors || {});
            });
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * デフォルトカラーパレットからカレンダー用の色を取得
 * @param {number} index - カレンダーのインデックス
 * @returns {string} HEX色コード
 */
export function getDefaultCalendarColor(index) {
    const defaultColors = [
        '#3174ad', // Blue
        '#d06b64', // Red
        '#f83a22', // Dark Red
        '#fa573c', // Orange Red
        '#ff7537', // Orange
        '#ffad46', // Yellow Orange
        '#42d692', // Green
        '#16a765', // Dark Green
        '#7986cb', // Light Blue
        '#9fc6e7', // Lighter Blue
        '#4285f4', // Google Blue
        '#9aa0a6', // Gray
        '#795548', // Brown
        '#e91e63', // Pink
        '#9c27b0', // Purple
    ];
    return defaultColors[index % defaultColors.length];
}
