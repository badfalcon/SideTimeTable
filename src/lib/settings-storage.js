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
