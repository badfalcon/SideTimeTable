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

// Recurrence type constants
export const RECURRENCE_TYPES = {
    NONE: 'none',
    DAILY: 'daily',
    WEEKLY: 'weekly',
    MONTHLY: 'monthly',
    WEEKDAYS: 'weekdays'
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
    currentTimeLineColor: '#ff0000', // Current time line color
    selectedCalendars: [], // An array of the selected calendar IDs
    language: 'auto', // Language setting (auto/en/ja)
    googleEventReminder: false, // Automatic reminder for Google events
    reminderMinutes: 5 // Reminder time in minutes before event starts
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
    const dateSpecificEvents = result[storageKey] || [];

    // Get recurring events that apply to this date
    const recurringEvents = await getRecurringEventsForDate(targetDate);

    // Combine and return (recurring events first, then date-specific)
    return [...recurringEvents, ...dateSpecificEvents];
}

/**
 * Load all recurring events
 * @returns {Promise<Array>} A promise that returns an array of recurring events
 */
export async function loadRecurringEvents() {
    const result = await StorageHelper.get(['recurringEvents'], { recurringEvents: [] });
    return result.recurringEvents || [];
}

/**
 * Save recurring events
 * @param {Array} events - An array of recurring events to save
 * @returns {Promise} A promise for the save process
 */
export async function saveRecurringEvents(events) {
    return StorageHelper.set({ recurringEvents: events });
}

/**
 * Get recurring events that apply to a specific date
 * @param {Date} targetDate - The target date
 * @returns {Promise<Array>} A promise that returns an array of event instances for the date
 */
export async function getRecurringEventsForDate(targetDate) {
    const recurringEvents = await loadRecurringEvents();
    const targetDateStr = getFormattedDateFromDate(targetDate);
    const matchingEvents = [];

    for (const event of recurringEvents) {
        if (!event.recurrence) continue;

        const { type, startDate, endDate, interval = 1, daysOfWeek = [] } = event.recurrence;

        // Check if target date is within the recurrence range
        if (startDate && targetDateStr < startDate) continue;
        if (endDate && targetDateStr > endDate) continue;

        // Check if this event has an exception for this date (deleted instance)
        const exceptions = event.recurrence.exceptions || [];
        if (exceptions.includes(targetDateStr)) continue;

        // Check if the event applies to the target date based on recurrence type
        const eventStartDate = new Date(startDate + 'T00:00:00');
        const targetDateObj = new Date(targetDateStr + 'T00:00:00');

        let matches = false;

        switch (type) {
            case RECURRENCE_TYPES.DAILY: {
                // Calculate days difference and check if it matches the interval
                const daysDiff = Math.floor((targetDateObj - eventStartDate) / (1000 * 60 * 60 * 24));
                matches = daysDiff >= 0 && daysDiff % interval === 0;
                break;
            }
            case RECURRENCE_TYPES.WEEKLY: {
                // Check if the day of week matches
                const targetDayOfWeek = targetDateObj.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
                if (daysOfWeek.length > 0) {
                    // If specific days are set, check if target day matches
                    if (!daysOfWeek.includes(targetDayOfWeek)) break;
                } else {
                    // If no specific days, use the start date's day of week
                    const startDayOfWeek = eventStartDate.getDay();
                    if (targetDayOfWeek !== startDayOfWeek) break;
                }
                // Calculate weeks difference from the start of the week containing the start date
                const startWeekStart = new Date(eventStartDate);
                startWeekStart.setDate(startWeekStart.getDate() - startWeekStart.getDay());
                const targetWeekStart = new Date(targetDateObj);
                targetWeekStart.setDate(targetWeekStart.getDate() - targetWeekStart.getDay());
                const weeksDiff = Math.round((targetWeekStart - startWeekStart) / (1000 * 60 * 60 * 24 * 7));
                matches = weeksDiff >= 0 && weeksDiff % interval === 0;
                break;
            }
            case RECURRENCE_TYPES.MONTHLY: {
                // Check if the day of month matches (with month-end handling)
                const eventDay = eventStartDate.getDate();
                const targetDay = targetDateObj.getDate();
                const targetYear = targetDateObj.getFullYear();
                const targetMonth = targetDateObj.getMonth();

                // Get the last day of the target month
                const lastDayOfTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();

                // Check if this is the correct day
                // If the event day is greater than the last day of the month,
                // show on the last day of the month instead
                const effectiveEventDay = Math.min(eventDay, lastDayOfTargetMonth);
                if (effectiveEventDay !== targetDay) break;

                // Calculate months difference
                const monthsDiff = (targetDateObj.getFullYear() - eventStartDate.getFullYear()) * 12 +
                                   (targetDateObj.getMonth() - eventStartDate.getMonth());
                matches = monthsDiff >= 0 && monthsDiff % interval === 0;
                break;
            }
            case RECURRENCE_TYPES.WEEKDAYS: {
                // Monday to Friday only
                const targetDayOfWeek = targetDateObj.getDay();
                matches = targetDayOfWeek >= 1 && targetDayOfWeek <= 5;
                break;
            }
        }

        if (matches) {
            // Create an instance of the recurring event for this date
            matchingEvents.push({
                ...event,
                isRecurringInstance: true,
                instanceDate: targetDateStr,
                originalId: event.id
            });
        }
    }

    return matchingEvents;
}

/**
 * Add an exception (deleted instance) to a recurring event
 * @param {string} eventId - The recurring event ID
 * @param {string} dateStr - The date to exclude (YYYY-MM-DD format)
 * @returns {Promise} A promise for the save process
 */
export async function addRecurringEventException(eventId, dateStr) {
    const recurringEvents = await loadRecurringEvents();
    const eventIndex = recurringEvents.findIndex(e => e.id === eventId);

    if (eventIndex !== -1) {
        if (!recurringEvents[eventIndex].recurrence.exceptions) {
            recurringEvents[eventIndex].recurrence.exceptions = [];
        }
        if (!recurringEvents[eventIndex].recurrence.exceptions.includes(dateStr)) {
            recurringEvents[eventIndex].recurrence.exceptions.push(dateStr);
        }
        await saveRecurringEvents(recurringEvents);
    }
}

/**
 * Delete a recurring event entirely
 * @param {string} eventId - The recurring event ID
 * @returns {Promise} A promise for the delete process
 */
export async function deleteRecurringEvent(eventId) {
    const recurringEvents = await loadRecurringEvents();
    const updatedEvents = recurringEvents.filter(e => e.id !== eventId);
    await saveRecurringEvents(updatedEvents);
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



