/**
 * SideTimeTable - Local Event Service
 *
 * Encapsulates CRUD operations for local events (both date-specific and recurring).
 * DOM-free: only handles data persistence and alarm management.
 */

import { RECURRENCE_TYPES } from '../../lib/constants.js';
import {
    loadLocalEventsForDate, saveLocalEventsForDate,
    loadRecurringEvents, saveRecurringEvents,
    addRecurringEventException, deleteRecurringEvent
} from '../../lib/event-storage.js';
import { getFormattedDateFromDate } from '../../lib/utils.js';
import { AlarmManager } from '../../lib/alarm-manager.js';

export class LocalEventService {
    /**
     * Generate a unique local event ID
     * @returns {string}
     */
    static generateId() {
        return `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Create a new local event
     * @param {Object} eventData - The event form data
     * @param {Date} currentDate - The date to associate the event with
     */
    async createEvent(eventData, currentDate) {
        if (!eventData.title || !eventData.startTime) {
            throw new Error('title and startTime are required');
        }
        const isRecurring = eventData.recurrence && eventData.recurrence.type !== RECURRENCE_TYPES.NONE;

        const newEvent = {
            id: LocalEventService.generateId(),
            title: eventData.title,
            description: eventData.description || '',
            startTime: eventData.startTime,
            endTime: eventData.endTime,
            reminder: eventData.reminder !== false
        };

        if (isRecurring) {
            newEvent.recurrence = eventData.recurrence;
            const recurringEvents = await loadRecurringEvents();
            recurringEvents.push(newEvent);
            await saveRecurringEvents(recurringEvents);
        } else {
            const localEvents = await loadLocalEventsForDate(currentDate);
            const nonRecurringEvents = localEvents.filter(e => !e.isRecurringInstance);
            nonRecurringEvents.push(newEvent);
            await saveLocalEventsForDate(nonRecurringEvents, currentDate);

            if (newEvent.reminder) {
                const dateStr = getFormattedDateFromDate(currentDate);
                await AlarmManager.setReminder(newEvent, dateStr);
            }
        }
    }

    /**
     * Update an existing local event
     * @param {Object} eventData - The updated form data
     * @param {Object} currentEvent - The event being edited
     * @param {Date} currentDate - The current date context
     */
    async updateEvent(eventData, currentEvent, currentDate) {
        const isRecurring = eventData.recurrence && eventData.recurrence.type !== RECURRENCE_TYPES.NONE;

        if (currentEvent.isRecurringInstance || currentEvent.recurrence) {
            return await this._editRecurringEvent(eventData, currentEvent, isRecurring, currentDate);
        } else {
            return await this._editDateSpecificEvent(eventData, currentEvent, isRecurring, currentDate);
        }
    }

    /**
     * Delete a local event
     * @param {Object} event - The event to delete
     * @param {string|null} deleteType - 'this' for single instance, 'all' for entire series
     * @param {Date} currentDate - The current date context
     */
    async deleteEvent(event, deleteType, currentDate) {
        if (event.isRecurringInstance || event.recurrence) {
            const eventId = event.originalId || event.id;

            if (deleteType === 'all') {
                await deleteRecurringEvent(eventId);
            } else {
                const dateStr = event.instanceDate || getFormattedDateFromDate(currentDate);
                await addRecurringEventException(eventId, dateStr);
            }
        } else {
            const localEvents = await loadLocalEventsForDate(currentDate);
            const nonRecurringEvents = localEvents.filter(e => !e.isRecurringInstance);

            if (event.id) {
                const dateStr = getFormattedDateFromDate(currentDate);
                await AlarmManager.clearReminder(event.id, dateStr);
            }

            const updatedEvents = nonRecurringEvents.filter(e => e.id !== event.id);
            await saveLocalEventsForDate(updatedEvents, currentDate);
        }
    }

    /**
     * Edit a recurring event (update entire series)
     * @private
     */
    async _editRecurringEvent(eventData, currentEvent, isRecurring, currentDate) {
        const recurringEvents = await loadRecurringEvents();
        const eventId = currentEvent.originalId || currentEvent.id;
        const eventIndex = recurringEvents.findIndex(e => e.id === eventId);

        if (eventIndex === -1) return false;

        recurringEvents[eventIndex] = {
            ...recurringEvents[eventIndex],
            title: eventData.title,
            description: eventData.description || '',
            startTime: eventData.startTime,
            endTime: eventData.endTime,
            reminder: eventData.reminder !== false,
            recurrence: isRecurring ? eventData.recurrence : null
        };

        if (!isRecurring) {
            // Convert recurring → date-specific
            const removedEvent = recurringEvents.splice(eventIndex, 1)[0];
            await saveRecurringEvents(recurringEvents);

            const localEvents = await loadLocalEventsForDate(currentDate);
            const nonRecurringEvents = localEvents.filter(e => !e.isRecurringInstance);
            nonRecurringEvents.push({
                id: removedEvent.id,
                title: eventData.title,
                description: eventData.description || '',
                startTime: eventData.startTime,
                endTime: eventData.endTime,
                reminder: eventData.reminder !== false
            });
            await saveLocalEventsForDate(nonRecurringEvents, currentDate);
        } else {
            await saveRecurringEvents(recurringEvents);
        }
    }

    /**
     * Edit a date-specific (non-recurring) event
     * @private
     */
    async _editDateSpecificEvent(eventData, currentEvent, isRecurring, currentDate) {
        const localEvents = await loadLocalEventsForDate(currentDate);
        const nonRecurringEvents = localEvents.filter(e => !e.isRecurringInstance);
        const eventIndex = nonRecurringEvents.findIndex(e => e.id === currentEvent.id);

        if (eventIndex === -1) return false;

        const existingEvent = nonRecurringEvents[eventIndex];
        const dateStr = getFormattedDateFromDate(currentDate);

        // Clear old reminder
        if (existingEvent.id) {
            await AlarmManager.clearReminder(existingEvent.id, dateStr);
        }

        if (isRecurring) {
            // Convert date-specific → recurring
            const newRecurringEvent = {
                id: existingEvent.id || LocalEventService.generateId(),
                title: eventData.title,
                description: eventData.description || '',
                startTime: eventData.startTime,
                endTime: eventData.endTime,
                reminder: eventData.reminder !== false,
                recurrence: eventData.recurrence
            };

            nonRecurringEvents.splice(eventIndex, 1);
            await saveLocalEventsForDate(nonRecurringEvents, currentDate);

            const recurringEvents = await loadRecurringEvents();
            recurringEvents.push(newRecurringEvent);
            await saveRecurringEvents(recurringEvents);
        } else {
            // Update as regular event
            nonRecurringEvents[eventIndex] = {
                id: existingEvent.id || LocalEventService.generateId(),
                title: eventData.title,
                description: eventData.description || '',
                startTime: eventData.startTime,
                endTime: eventData.endTime,
                reminder: eventData.reminder !== false
            };

            await saveLocalEventsForDate(nonRecurringEvents, currentDate);

            if (nonRecurringEvents[eventIndex].reminder) {
                await AlarmManager.setReminder(nonRecurringEvents[eventIndex], dateStr);
            }
        }
    }
}
