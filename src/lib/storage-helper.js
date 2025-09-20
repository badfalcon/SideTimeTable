/**
 * StorageHelper - Chrome storage operations wrapper
 *
 * This class provides a standardized interface for Chrome storage operations,
 * eliminating code duplication and providing consistent error handling.
 */

export class StorageHelper {
    /**
     * Retrieve data from Chrome storage
     * @param {string|Object|Array} keys - Storage keys to retrieve
     * @param {Object} defaultValues - Default values if keys don't exist
     * @returns {Promise<Object>} Retrieved data with defaults applied
     */
    static async get(keys, defaultValues = {}) {
        return new Promise((resolve, reject) => {
            try {
                chrome.storage.sync.get(keys, (result) => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                        return;
                    }
                    // Merge with defaults for any missing keys
                    const mergedResult = { ...defaultValues, ...result };
                    resolve(mergedResult);
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Store data in Chrome storage
     * @param {Object} data - Data to store
     * @returns {Promise<void>} Promise that resolves when data is saved
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
     * Remove data from Chrome storage
     * @param {string|Array<string>} keys - Keys to remove
     * @returns {Promise<void>} Promise that resolves when data is removed
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
     * Clear all data from Chrome storage
     * @returns {Promise<void>} Promise that resolves when storage is cleared
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
     * Get storage quota information
     * @returns {Promise<Object>} Storage quota information
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
}