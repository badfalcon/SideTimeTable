/**
 * SideTimeTable - Utility Functions
 *
 * This file provides common functions and constants used throughout the extension.
 */

import { StorageHelper } from './storage-helper.js';

// Time-related constants
export const TIME_CONSTANTS = {
    HOUR_MILLIS: 3600000,  // Milliseconds per hour
    MINUTE_MILLIS: 60000,  // Milliseconds per minute
    UNIT_HEIGHT: 60,       // Height per hour (pixels)
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
    selectedCalendars: [], // Array of selected calendar IDs
    language: 'auto' // Language setting (auto/en/ja)
};

/**
 * Generate time selection list
 * @param {HTMLElement} timeListElement - datalist DOM element
 */
export function generateTimeList(timeListElement) {
    if (!timeListElement) return;
    
    timeListElement.innerHTML = ''; // Clear existing options
    
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
 * Get current date (YYYY-MM-DD format)
 * @returns {string} Date string in YYYY-MM-DD format
 */
export function getFormattedDate() {
    const today = new Date();
    return today.toISOString().split('T')[0]; // Get string in YYYY-MM-DD format
}

/**
 * Get specified date (YYYY-MM-DD format)
 * @param {Date} date - Target date
 * @returns {string} Date string in YYYY-MM-DD format
 */
export function getFormattedDateFromDate(date) {
    return date.toISOString().split('T')[0]; // Get string in YYYY-MM-DD format
}

/**
 * Save settings
 * @param {Object} settings - Settings object to save
 * @returns {Promise} Promise for save process
 */
export function saveSettings(settings) {
    return StorageHelper.set(settings);
}

/**
 * Load settings
 * @param {Object} defaultSettings - Default settings (uses DEFAULT_SETTINGS if omitted)
 * @returns {Promise<Object>} Promise that returns settings object
 */
export function loadSettings(defaultSettings = DEFAULT_SETTINGS) {
    return StorageHelper.get(defaultSettings, defaultSettings);
}

/**
 * Load local events
 * @returns {Promise<Array>} Promise that returns array of events
 */
export function loadLocalEvents() {
    return loadLocalEventsForDate(new Date());
}

/**
 * Load local events for specified date
 * @param {Date} targetDate - Target date
 * @returns {Promise<Array>} Promise that returns array of events
 */
export async function loadLocalEventsForDate(targetDate) {
    const targetDateStr = getFormattedDateFromDate(targetDate);
    const storageKey = `localEvents_${targetDateStr}`;
    const result = await StorageHelper.get([storageKey], { [storageKey]: [] });
    return result[storageKey] || [];
}

/**
 * Save local events
 * @param {Array} events - Array of events to save
 * @returns {Promise} Promise for save process
 */
export function saveLocalEvents(events) {
    return saveLocalEventsForDate(events, new Date());
}

/**
 * Save local events for specified date
 * @param {Array} events - Array of events to save
 * @param {Date} targetDate - Target date
 * @returns {Promise} Promise for save process
 */
export function saveLocalEventsForDate(events, targetDate) {
    const targetDateStr = getFormattedDateFromDate(targetDate);
    const storageKey = `localEvents_${targetDateStr}`;
    return StorageHelper.set({ [storageKey]: events });
}

/**
 * Reload side panel
 * @returns {Promise} Promise for reload process
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
 * Log error to console
 * @param {string} context - Context where the error occurred
 * @param {Error|string} error - Error object or error message
 */
export function logError(context, error) {
    console.error(`[${context}] Error:`, error);
}

/**
 * Display alert modal
 * @param {string} message - Message to display
 * @param {HTMLElement} alertModal - Alert modal DOM element
 * @param {HTMLElement} alertMessage - Element to display the message
 * @param {HTMLElement} closeButton - Close button
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
    
    // Close modal when clicking outside
    window.onclick = (event) => {
        if (event.target === alertModal) {
            alertModal.style.display = 'none';
        }
    };
}

/**
 * Save selected calendars
 * @param {Array<string>} selectedCalendars - Array of selected calendar IDs
 * @returns {Promise} Promise for save process
 */
export function saveSelectedCalendars(selectedCalendars) {
    return StorageHelper.set({ selectedCalendars });
}

/**
 * Load selected calendars
 * @returns {Promise<Array<string>>} Promise that returns array of selected calendar IDs
 */
export async function loadSelectedCalendars() {
    const result = await StorageHelper.get(['selectedCalendars'], { selectedCalendars: [] });
    return result.selectedCalendars || [];
}



