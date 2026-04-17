/**
 * SideTimeTable - Utility Functions
 *
 * Pure utility functions used throughout the extension.
 */

/**
 * Return black or white depending on which provides better contrast against the given hex color.
 * @param {string} hexColor - e.g. '#1e1e2e'
 * @returns {string} '#000000' or '#ffffff'
 */
export function getContrastColor(hexColor) {
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#000000' : '#ffffff';
}

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

import { sendMessage } from './chrome-messaging.js';

/**
 * Reload the side panel
 * @returns {Promise} A promise for the reload process
 */
export async function reloadSidePanel() {
    const response = await sendMessage({ action: "reloadSideTimeTable" });
    if (!response || !response.success) {
        throw new Error('Reload failed');
    }
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
 * Log a warning to the console
 * @param {string} context - The context where the warning occurred
 * @param {*} message - The warning message or related data
 */
export function logWarn(context, message) {
    console.warn(`[${context}] Warning:`, message);
}
