/**
 * SideTimeTable - Event Storage
 *
 * Functions for persisting and retrieving local and recurring events.
 */

import { StorageHelper } from './storage-helper.js';
import { STORAGE_KEYS, RECURRENCE_TYPES } from './constants.js';
import { getFormattedDateFromDate } from './utils.js';

// Migration flag key
const MIGRATION_KEY = 'eventDataMigratedToLocal_v2';

/**
 * Migrate per-date event data from chrome.storage.sync to chrome.storage.local (one-time).
 * Recurring events stay in sync for cross-device synchronization.
 * Per-date events (localEvents_YYYY-MM-DD) move to local to avoid sync quota limits.
 */
export async function migrateEventDataToLocal() {
    try {
        const { [MIGRATION_KEY]: migrated } = await chrome.storage.local.get(MIGRATION_KEY);
        if (migrated) return;

        // If recurring events were accidentally moved to local, restore them to sync
        const localData = await StorageHelper.getLocal([STORAGE_KEYS.RECURRING_EVENTS], {});
        const localRecurring = localData[STORAGE_KEYS.RECURRING_EVENTS];
        if (localRecurring && localRecurring.length > 0) {
            // Only restore if sync doesn't already have data
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
    } catch (error) {
        console.error('[Migration] Failed to migrate event data:', error);
    }
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
    const storageKey = `${STORAGE_KEYS.LOCAL_EVENTS_PREFIX}${targetDateStr}`;
    const result = await StorageHelper.getLocal([storageKey], { [storageKey]: [] });
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
    const key = STORAGE_KEYS.RECURRING_EVENTS;
    const result = await StorageHelper.get([key], { [key]: [] });
    return result[key] || [];
}

/**
 * Save recurring events
 * @param {Array} events - An array of recurring events to save
 * @returns {Promise} A promise for the save process
 */
export async function saveRecurringEvents(events) {
    return StorageHelper.set({ [STORAGE_KEYS.RECURRING_EVENTS]: events });
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
    const storageKey = `${STORAGE_KEYS.LOCAL_EVENTS_PREFIX}${targetDateStr}`;
    return StorageHelper.setLocal({ [storageKey]: events });
}
