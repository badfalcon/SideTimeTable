/**
 * SideTimeTable - Storage Cleanup
 *
 * Removes obsolete storage keys that are no longer used by the current version.
 */

import { StorageHelper } from './storage-helper.js';
import { VALID_SYNC_KEYS, VALID_LOCAL_KEYS, VALID_LOCAL_KEY_PATTERNS } from './constants.js';

/**
 * Check whether a local storage key is valid.
 * A key is valid if it matches an exact key or matches a valid pattern (e.g. localEvents_YYYY-MM-DD).
 * @param {string} key
 * @returns {boolean}
 */
function isValidLocalKey(key) {
    if (VALID_LOCAL_KEYS.has(key)) return true;
    return VALID_LOCAL_KEY_PATTERNS.some(pattern => pattern.test(key));
}

/**
 * Remove obsolete keys from both sync and local Chrome storage.
 * Safe to call multiple times (idempotent).
 *
 * @returns {Promise<{sync: {removed: string[]}, local: {removed: string[]}}>}
 */
export async function cleanupObsoleteStorageKeys() {
    const result = { sync: { removed: [] }, local: { removed: [] } };

    try {
        const [syncData, localData] = await Promise.all([
            StorageHelper.get(null),
            StorageHelper.getLocal(null)
        ]);

        // Identify obsolete sync keys
        const obsoleteSyncKeys = Object.keys(syncData).filter(key => !VALID_SYNC_KEYS.has(key));
        if (obsoleteSyncKeys.length > 0) {
            await StorageHelper.remove(obsoleteSyncKeys);
            result.sync.removed = obsoleteSyncKeys;
        }

        // Identify obsolete local keys
        const obsoleteLocalKeys = Object.keys(localData).filter(key => !isValidLocalKey(key));
        if (obsoleteLocalKeys.length > 0) {
            await StorageHelper.removeLocal(obsoleteLocalKeys);
            result.local.removed = obsoleteLocalKeys;
        }

        // Log if anything was cleaned up
        const totalRemoved = result.sync.removed.length + result.local.removed.length;
        if (totalRemoved > 0) {
            console.log('[Storage Cleanup] Removed obsolete keys:', result);
        }
    } catch (error) {
        console.error('[Storage Cleanup] Failed:', error);
    }

    return result;
}
