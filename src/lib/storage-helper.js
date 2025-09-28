/**
 * StorageHelper - Chrome storage operations wrapper
 *
 * This class provides a standardized interface for Chrome storage operations,
 * eliminating code duplication and providing consistent error handling.
 */

export class StorageHelper {
    /**
     * Retrieve the data from Chrome storage
     * @param {string|Object|Array} keys - The storage keys to retrieve
     * @param {Object} defaultValues - The default values if the keys don't exist
     * @returns {Promise<Object>} The retrieved data with the defaults applied
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
}