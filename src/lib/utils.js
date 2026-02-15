/**
 * SideTimeTable - Utility Functions
 *
 * This module re-exports constants and functions from their dedicated modules
 * for backward compatibility, and contains remaining utility functions that
 * don't belong to a specific domain.
 */

import { StorageHelper } from './storage-helper.js';
import { formatDateString } from './format-utils.js';

// Re-export constants from constants.js
export { TIME_CONSTANTS, RECURRENCE_TYPES, STORAGE_KEYS, DEFAULT_SETTINGS } from './constants.js';

// Re-export recurrence functions from recurrence-engine.js
export {
    loadRecurringEvents,
    saveRecurringEvents,
    getRecurringEventsForDate,
    addRecurringEventException,
    deleteRecurringEvent
} from './recurrence-engine.js';

// Re-export formatDateString as getFormattedDateFromDate for backward compatibility
export { formatDateString as getFormattedDateFromDate } from './format-utils.js';

// Import constants needed locally
import { STORAGE_KEYS, DEFAULT_SETTINGS } from './constants.js';
import { getRecurringEventsForDate } from './recurrence-engine.js';

// Migration flag key
const MIGRATION_KEY = 'eventDataMigratedToLocal_v2';

/**
 * Migrate per-date event data from chrome.storage.sync to chrome.storage.local (one-time).
 */
export async function migrateEventDataToLocal() {
    try {
        const { [MIGRATION_KEY]: migrated } = await chrome.storage.local.get(MIGRATION_KEY);
        if (migrated) return;

        // If recurring events were accidentally moved to local, restore them to sync
        const localData = await StorageHelper.getLocal([STORAGE_KEYS.RECURRING_EVENTS], {});
        const localRecurring = localData[STORAGE_KEYS.RECURRING_EVENTS];
        if (localRecurring && localRecurring.length > 0) {
            const syncData = await StorageHelper.get([STORAGE_KEYS.RECURRING_EVENTS], {});
            const syncRecurring = syncData[STORAGE_KEYS.RECURRING_EVENTS];
            if (!syncRecurring || syncRecurring.length === 0) {
                await StorageHelper.set({ [STORAGE_KEYS.RECURRING_EVENTS]: localRecurring });
            }
            await chrome.storage.local.remove(STORAGE_KEYS.RECURRING_EVENTS);
        }

        // Migrate per-date local events from sync to local
        const allSyncData = await StorageHelper.get(null, {});
        const localEventEntries = {};
        const keysToRemove = [];
        for (const [key, value] of Object.entries(allSyncData)) {
            if (key.startsWith(STORAGE_KEYS.LOCAL_EVENTS_PREFIX)) {
                localEventEntries[key] = value;
                keysToRemove.push(key);
            }
        }
        if (Object.keys(localEventEntries).length > 0) {
            await StorageHelper.setLocal(localEventEntries);
            await StorageHelper.remove(keysToRemove);
        }

        await chrome.storage.local.set({ [MIGRATION_KEY]: true });
        console.log('[Migration] Per-date event data migrated to local storage');
    } catch (error) {
        console.error('[Migration] Failed to migrate event data:', error);
    }
}

/**
 * Generate the time selection list
 * @param {HTMLElement} timeListElement - The datalist DOM element
 */
export function generateTimeList(timeListElement) {
    if (!timeListElement) return;

    timeListElement.innerHTML = '';

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
 * Save the settings
 * @param {Object} settings - The settings object to save
 * @returns {Promise}
 */
export function saveSettings(settings) {
    return StorageHelper.set(settings);
}

/**
 * Load the settings
 * @param {Object} defaultSettings - The default settings
 * @returns {Promise<Object>}
 */
export function loadSettings(defaultSettings = DEFAULT_SETTINGS) {
    return StorageHelper.get(defaultSettings, defaultSettings);
}

/**
 * Load the local events for today
 * @returns {Promise<Array>}
 */
export function loadLocalEvents() {
    return loadLocalEventsForDate(new Date());
}

/**
 * Load the local events for the specified date
 * @param {Date} targetDate - The target date
 * @returns {Promise<Array>}
 */
export async function loadLocalEventsForDate(targetDate) {
    const targetDateStr = formatDateString(targetDate);
    const storageKey = `${STORAGE_KEYS.LOCAL_EVENTS_PREFIX}${targetDateStr}`;
    const result = await StorageHelper.getLocal([storageKey], { [storageKey]: [] });
    const dateSpecificEvents = result[storageKey] || [];

    const recurringEvents = await getRecurringEventsForDate(targetDate);

    return [...recurringEvents, ...dateSpecificEvents];
}

/**
 * Save the local events for the specified date
 * @param {Array} events - Events to save
 * @param {Date} targetDate - The target date
 * @returns {Promise}
 */
export async function saveLocalEventsForDate(events, targetDate) {
    const targetDateStr = formatDateString(targetDate);
    const storageKey = `${STORAGE_KEYS.LOCAL_EVENTS_PREFIX}${targetDateStr}`;
    return StorageHelper.setLocal({ [storageKey]: events });
}

/**
 * Reload the side panel
 * @returns {Promise}
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
                    reject(new Error('Reload failed'));
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
 * Log the error to the console
 * @param {string} context - The context
 * @param {Error|string} error - The error
 */
export function logError(context, error) {
    console.error(`[${context}] Error:`, error);
}

/**
 * Save the selected calendars
 * @param {Array<string>} selectedCalendars
 * @returns {Promise}
 */
export function saveSelectedCalendars(selectedCalendars) {
    return StorageHelper.set({ selectedCalendars });
}

/**
 * Load the selected calendars
 * @returns {Promise<Array<string>>}
 */
export async function loadSelectedCalendars() {
    const result = await StorageHelper.get(['selectedCalendars'], { selectedCalendars: [] });
    return result.selectedCalendars || [];
}
