/**
 * SideTimeTable - Settings Storage
 *
 * Functions for persisting and retrieving extension settings and calendar selections.
 */

import { StorageHelper } from './storage-helper.js';
import { DEFAULT_SETTINGS } from './constants.js';

/**
 * Save the settings
 * @param {Object} settings - The settings object to save
 * @returns {Promise} A promise for the save process
 */
export function saveSettings(settings) {
    return StorageHelper.set(settings);
}

/**
 * Load the settings
 * @param {Object} defaultSettings - The default settings (uses DEFAULT_SETTINGS if omitted)
 * @returns {Promise<Object>} A promise that returns the settings object
 */
export function loadSettings(defaultSettings = DEFAULT_SETTINGS) {
    return StorageHelper.get(defaultSettings, defaultSettings);
}

/**
 * Save the selected calendars
 * @param {Array<string>} selectedCalendars - An array of the selected calendar IDs
 * @returns {Promise} A promise for the save process
 */
export function saveSelectedCalendars(selectedCalendars) {
    return StorageHelper.set({ selectedCalendars });
}

/**
 * Load the selected calendars
 * @returns {Promise<Array<string>>} A promise that returns an array of the selected calendar IDs
 */
export async function loadSelectedCalendars() {
    const result = await StorageHelper.get(['selectedCalendars'], { selectedCalendars: [] });
    return result.selectedCalendars || [];
}

/**
 * Save the calendar groups
 * @param {Array<Object>} calendarGroups - An array of group objects
 * @returns {Promise} A promise for the save process
 */
export function saveCalendarGroups(calendarGroups) {
    return StorageHelper.set({ calendarGroups });
}

/**
 * Load the calendar groups
 * @returns {Promise<Array<Object>>} A promise that returns an array of group objects
 */
export async function loadCalendarGroups() {
    const result = await StorageHelper.get(['calendarGroups'], { calendarGroups: [] });
    return sanitizeCalendarGroups(result.calendarGroups);
}

/**
 * Sanitize calendar groups loaded from storage to prevent crashes from malformed data
 * @param {*} raw - Raw value from storage
 * @returns {Array<Object>} Validated array of group objects
 */
function sanitizeCalendarGroups(raw) {
    if (!Array.isArray(raw)) return [];
    return raw
        .filter(g => g && typeof g === 'object')
        .map(g => ({
            id: typeof g.id === 'string' ? g.id : `group_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            name: (typeof g.name === 'string' ? g.name : 'Group').slice(0, 50),
            calendarIds: Array.isArray(g.calendarIds) ? g.calendarIds.filter(id => typeof id === 'string') : [],
            collapsed: typeof g.collapsed === 'boolean' ? g.collapsed : false
        }));
}
