/**
 * SideTimeTable - Utility Functions
 *
 * This file provides common functions and constants used throughout the extension.
 */

import { StorageHelper } from './storage-helper.js';

// Time-related constants
export const TIME_CONSTANTS = {
    HOUR_MILLIS: 3600000,  // The milliseconds per hour
    MINUTE_MILLIS: 60000,  // The milliseconds per minute
    UNIT_HEIGHT: 60,       // The height per hour (pixels)
    DEFAULT_OPEN_HOUR: '09:00',
    DEFAULT_CLOSE_HOUR: '18:00',
    DEFAULT_BREAK_START: '12:00',
    DEFAULT_BREAK_END: '13:00'
};

// Default settings
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
    selectedCalendars: [], // An array of the selected calendar IDs
    language: 'auto' // Language setting (auto/en/ja)
};

/**
 * Generate the time selection list
 * @param {HTMLElement} timeListElement - The datalist DOM element
 */
export function generateTimeList(timeListElement) {
    if (!timeListElement) return;
    
    timeListElement.innerHTML = ''; // Clear the existing options
    
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
 * Get the specified date (YYYY-MM-DD format)
 * @param {Date} date - The target date
 * @returns {string} The date string in YYYY-MM-DD format
 */
export function getFormattedDateFromDate(date) {
    // Use the local timezone to avoid the date-shifting issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

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
 * Load the local events
 * @returns {Promise<Array>} A promise that returns an array of events
 */
export function loadLocalEvents() {
    return loadLocalEventsForDate(new Date());
}

/**
 * Load the local events for the specified date
 * @param {Date} targetDate - The target date
 * @returns {Promise<Array>} A promise that returns an array of events
 */
export async function loadLocalEventsForDate(targetDate) {
    const targetDateStr = getFormattedDateFromDate(targetDate);
    const storageKey = `localEvents_${targetDateStr}`;
    const result = await StorageHelper.get([storageKey], { [storageKey]: [] });
    return result[storageKey] || [];
}


/**
 * Save the local events for the specified date
 * @param {Array} events - An array of the events to save
 * @param {Date} targetDate - The target date
 * @returns {Promise} A promise for the save process
 */
export async function saveLocalEventsForDate(events, targetDate) {
    const targetDateStr = getFormattedDateFromDate(targetDate);
    const storageKey = `localEvents_${targetDateStr}`;
    return StorageHelper.set({ [storageKey]: events });
}

/**
 * Reload the side panel
 * @returns {Promise} A promise for the reload process
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
 * @param {string} context - The context where the error occurred
 * @param {Error|string} error - The error object or the error message
 */
export function logError(context, error) {
    console.error(`[${context}] Error:`, error);
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



