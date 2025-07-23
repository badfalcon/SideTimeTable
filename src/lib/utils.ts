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

// 設定のインターフェース
export interface Settings {
    googleIntegrated: boolean;
    openTime: string;
    closeTime: string;
    workTimeColor: string;
    breakTimeFixed: boolean;
    breakTimeStart: string;
    breakTimeEnd: string;
    localEventColor: string;
    googleEventColor: string;
}

// ローカルイベントのインターフェース
export interface LocalEvent {
    id: string;
    title: string;
    startTime: string;
    endTime: string;
}

// デフォルト設定
export const DEFAULT_SETTINGS: Settings = {
    googleIntegrated: false,
    openTime: TIME_CONSTANTS.DEFAULT_OPEN_HOUR,
    closeTime: TIME_CONSTANTS.DEFAULT_CLOSE_HOUR,
    workTimeColor: '#d4d4d4',
    breakTimeFixed: false,
    breakTimeStart: TIME_CONSTANTS.DEFAULT_BREAK_START,
    breakTimeEnd: TIME_CONSTANTS.DEFAULT_BREAK_END,
    localEventColor: '#bbf2b1',
    googleEventColor: '#c3d6f7'
};

/**
 * 時間選択リストを生成する
 * @param {HTMLElement} timeListElement - datalistのDOM要素
 */
export function generateTimeList(timeListElement: HTMLElement | null): void {
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
export function getFormattedDate(): string {
    const today = new Date();
    return today.toISOString().split('T')[0]; // YYYY-MM-DD 形式の文字列を取得
}

/**
 * 設定を保存する
 * @param {Settings} settings - 保存する設定オブジェクト
 * @returns {Promise<void>} 保存処理のPromise
 */
export function saveSettings(settings: Partial<Settings>): Promise<void> {
    return new Promise<void>((resolve, reject) => {
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
 * @param {Settings} defaultSettings - デフォルト設定（省略時はDEFAULT_SETTINGSを使用）
 * @returns {Promise<Settings>} 設定オブジェクトを返すPromise
 */
export function loadSettings(defaultSettings: Settings = DEFAULT_SETTINGS): Promise<Settings> {
    return new Promise<Settings>((resolve, reject) => {
        try {
            chrome.storage.sync.get(defaultSettings, (items) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                    return;
                }
                resolve(items as Settings);
            });
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * ローカルイベントを読み込む
 * @returns {Promise<LocalEvent[]>} イベントの配列を返すPromise
 */
export function loadLocalEvents(): Promise<LocalEvent[]> {
    return new Promise<LocalEvent[]>((resolve, reject) => {
        try {
            chrome.storage.sync.get({localEvents: [], lastUpdateDate: ''}, (data) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                    return;
                }
                
                // 日付が変わっていたら空の配列を返す
                const currentDate = getFormattedDate();
                if (currentDate !== data.lastUpdateDate) {
                    resolve([]);
                    return;
                }
                
                resolve(data.localEvents || []);
            });
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * ローカルイベントを保存する
 * @param {LocalEvent[]} events - 保存するイベントの配列
 * @returns {Promise<void>} 保存処理のPromise
 */
export function saveLocalEvents(events: LocalEvent[]): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        try {
            const currentDate = getFormattedDate();
            chrome.storage.sync.set({
                localEvents: events,
                lastUpdateDate: currentDate
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
 * @returns {Promise<void>} リロード処理のPromise
 */
export function reloadSidePanel(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
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
export function logError(context: string, error: Error | string): void {
    console.error(`[${context}] エラー:`, error);
}

/**
 * アラートモーダルを表示する
 * @param {string} message - 表示するメッセージ
 * @param {HTMLElement} alertModal - アラートモーダルのDOM要素
 * @param {HTMLElement} alertMessage - メッセージを表示する要素
 * @param {HTMLElement} closeButton - 閉じるボタン
 */
export function showAlertModal(
    message: string, 
    alertModal: HTMLElement | null, 
    alertMessage: HTMLElement | null, 
    closeButton: HTMLElement | null
): void {
    if (!alertModal || !alertMessage) return;
    
    alertMessage.textContent = message;
    alertModal.style.display = 'flex';
    
    if (closeButton) {
        closeButton.onclick = () => {
            alertModal.style.display = 'none';
        };
    }
    
    // モーダル外クリックで閉じる
    window.onclick = (event: MouseEvent) => {
        if (event.target === alertModal) {
            alertModal.style.display = 'none';
        }
    };
}