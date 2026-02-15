/**
 * RecurrenceEngine - Recurrence logic for recurring events
 *
 * Extracted from utils.js. Handles all recurrence pattern matching,
 * exception management, and recurring event CRUD operations.
 */

import { StorageHelper } from './storage-helper.js';
import { RECURRENCE_TYPES, STORAGE_KEYS } from './constants.js';
import { formatDateString } from './format-utils.js';

/**
 * Load all recurring events from storage
 * @returns {Promise<Array>} Array of recurring events
 */
export async function loadRecurringEvents() {
    const key = STORAGE_KEYS.RECURRING_EVENTS;
    const result = await StorageHelper.get([key], { [key]: [] });
    return result[key] || [];
}

/**
 * Save recurring events to storage
 * @param {Array} events - Array of recurring events
 * @returns {Promise}
 */
export async function saveRecurringEvents(events) {
    return StorageHelper.set({ [STORAGE_KEYS.RECURRING_EVENTS]: events });
}

/**
 * Get recurring event instances that match a specific date
 * @param {Date} targetDate - The date to check
 * @returns {Promise<Array>} Array of event instances for the date
 */
export async function getRecurringEventsForDate(targetDate) {
    const recurringEvents = await loadRecurringEvents();
    const targetDateStr = formatDateString(targetDate);
    const matchingEvents = [];

    for (const event of recurringEvents) {
        if (!event.recurrence) continue;

        const { type, startDate, endDate, interval = 1, daysOfWeek = [] } = event.recurrence;

        // Check date range
        if (startDate && targetDateStr < startDate) continue;
        if (endDate && targetDateStr > endDate) continue;

        // Check exceptions
        const exceptions = event.recurrence.exceptions || [];
        if (exceptions.includes(targetDateStr)) continue;

        const eventStartDate = new Date(startDate + 'T00:00:00');
        const targetDateObj = new Date(targetDateStr + 'T00:00:00');

        if (_matchesRecurrencePattern(type, eventStartDate, targetDateObj, interval, daysOfWeek)) {
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
 * Check if a target date matches a recurrence pattern
 * @param {string} type - Recurrence type
 * @param {Date} eventStartDate - Event start date
 * @param {Date} targetDateObj - Target date
 * @param {number} interval - Recurrence interval
 * @param {Array<number>} daysOfWeek - Days of week for weekly recurrence
 * @returns {boolean}
 * @private
 */
function _matchesRecurrencePattern(type, eventStartDate, targetDateObj, interval, daysOfWeek) {
    switch (type) {
        case RECURRENCE_TYPES.DAILY: {
            const daysDiff = Math.floor((targetDateObj - eventStartDate) / (1000 * 60 * 60 * 24));
            return daysDiff >= 0 && daysDiff % interval === 0;
        }

        case RECURRENCE_TYPES.WEEKLY: {
            const targetDayOfWeek = targetDateObj.getDay();
            if (daysOfWeek.length > 0) {
                if (!daysOfWeek.includes(targetDayOfWeek)) return false;
            } else {
                if (targetDayOfWeek !== eventStartDate.getDay()) return false;
            }
            const startWeekStart = new Date(eventStartDate);
            startWeekStart.setDate(startWeekStart.getDate() - startWeekStart.getDay());
            const targetWeekStart = new Date(targetDateObj);
            targetWeekStart.setDate(targetWeekStart.getDate() - targetWeekStart.getDay());
            const weeksDiff = Math.round((targetWeekStart - startWeekStart) / (1000 * 60 * 60 * 24 * 7));
            return weeksDiff >= 0 && weeksDiff % interval === 0;
        }

        case RECURRENCE_TYPES.MONTHLY: {
            const eventDay = eventStartDate.getDate();
            const targetDay = targetDateObj.getDate();
            const lastDayOfTargetMonth = new Date(
                targetDateObj.getFullYear(), targetDateObj.getMonth() + 1, 0
            ).getDate();
            const effectiveEventDay = Math.min(eventDay, lastDayOfTargetMonth);
            if (effectiveEventDay !== targetDay) return false;

            const monthsDiff = (targetDateObj.getFullYear() - eventStartDate.getFullYear()) * 12 +
                               (targetDateObj.getMonth() - eventStartDate.getMonth());
            return monthsDiff >= 0 && monthsDiff % interval === 0;
        }

        case RECURRENCE_TYPES.WEEKDAYS: {
            const targetDayOfWeek = targetDateObj.getDay();
            return targetDayOfWeek >= 1 && targetDayOfWeek <= 5;
        }

        default:
            return false;
    }
}

/**
 * Add an exception (deleted instance) to a recurring event
 * @param {string} eventId - The recurring event ID
 * @param {string} dateStr - The date to exclude (YYYY-MM-DD)
 * @returns {Promise}
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
 * @returns {Promise}
 */
export async function deleteRecurringEvent(eventId) {
    const recurringEvents = await loadRecurringEvents();
    const updatedEvents = recurringEvents.filter(e => e.id !== eventId);
    await saveRecurringEvents(updatedEvents);
}
