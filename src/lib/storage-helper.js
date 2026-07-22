/**
 * StorageHelper - Chrome storage operations wrapper
 *
 * Provides a standardized Promise-based interface for chrome.storage.sync and
 * chrome.storage.local operations, eliminating callback-based code duplication.
 *
 * ## 使い分け基準
 *
 * - **ドメインモデルの永続化** → `settings-storage.js` / `event-storage.js`
 *   のラッパー関数を使うこと。これらは `DEFAULT_SETTINGS` フィルタや
 *   `localEvents_YYYY-MM-DD` スコープ、recurring/date-specific の分離といった
 *   ドメイン不変条件を enforce する。
 *
 * - **Ad-hoc な UI 状態やフラグ**（memo content、tutorial 表示フラグ、
 *   `lastSeenVersion`、`lastReminderSyncTime` 等）→ StorageHelper を直接
 *   利用してよい。ドメイン制約がないため wrapper 化しても抽象化メリットが薄い。
 *
 * 判断に迷う場合は「複数箇所で同じキーの読み書きがあるか」「保存時に
 * キー検証や型変換が必要か」を基準にラッパー化を検討する。
 */

export class StorageHelper {
    /**
     * Retrieve the data from Chrome storage.
     * Pass null to retrieve all stored data.
     *
     * @param {string|Object|Array|null} keys - The storage keys to retrieve, or null for all
     * @param {Object} defaultValues - The default values for missing keys
     * @returns {Promise<Object>} The retrieved data merged with defaults
     */
    static async get(keys, defaultValues = {}) {
        return new Promise((resolve, reject) => {
            try {
                chrome.storage.sync.get(keys, (result) => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                        return;
                    }
                    // Merge with the defaults for any missing keys
                    const mergedResult = { ...defaultValues, ...result };
                    resolve(mergedResult);
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Store the data in Chrome storage
     * @param {Object} data - The data to store
     * @returns {Promise<void>} A promise that resolves when the data is saved
     */
    static async set(data) {
        return new Promise((resolve, reject) => {
            try {
                chrome.storage.sync.set(data, () => {
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
     * Remove the data from Chrome storage
     * @param {string|Array<string>} keys - The keys to remove
     * @returns {Promise<void>} A promise that resolves when the data is removed
     */
    static async remove(keys) {
        return new Promise((resolve, reject) => {
            try {
                chrome.storage.sync.remove(keys, () => {
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
     * Clear all the data from Chrome storage
     * @returns {Promise<void>} A promise that resolves when the storage is cleared
     */
    static async clear() {
        return new Promise((resolve, reject) => {
            try {
                chrome.storage.sync.clear(() => {
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
     * Get the storage quota information
     * @returns {Promise<Object>} The storage quota information
     */
    static async getBytesInUse(keys = null) {
        return new Promise((resolve, reject) => {
            try {
                chrome.storage.sync.getBytesInUse(keys, (bytesInUse) => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                        return;
                    }
                    resolve(bytesInUse);
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Remove the data from Chrome local storage
     * @param {string|Array<string>} keys - The keys to remove
     * @returns {Promise<void>} A promise that resolves when the data is removed
     */
    static async removeLocal(keys) {
        return new Promise((resolve, reject) => {
            try {
                chrome.storage.local.remove(keys, () => {
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
     * Retrieve the data from Chrome local storage
     * @param {string|Object|Array} keys - The storage keys to retrieve
     * @param {Object} defaultValues - The default values if the keys don't exist
     * @returns {Promise<Object>} The retrieved data with the defaults applied
     */
    static async getLocal(keys, defaultValues = {}) {
        return new Promise((resolve, reject) => {
            try {
                chrome.storage.local.get(keys, (result) => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                        return;
                    }
                    // Merge with the defaults for any missing keys
                    const mergedResult = { ...defaultValues, ...result };
                    resolve(mergedResult);
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Store the data in Chrome local storage
     * @param {Object} data - The data to store
     * @returns {Promise<void>} A promise that resolves when the data is saved
     */
    static async setLocal(data) {
        return new Promise((resolve, reject) => {
            try {
                chrome.storage.local.set(data, () => {
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
}