/**
 * LocalEventRenderer - DOM element creation for local events
 *
 * Extracts rendering responsibilities from LocalEventManager so the manager
 * handles only data loading and orchestration while this module handles DOM
 * element construction.
 */

import { RECURRENCE_TYPES } from '../lib/constants.js';
import { createTimeOnDate } from '../lib/time-utils.js';
import {
    onClickOnly,
    resolveLocaleSettings,
    EventElementFactory
} from './event-element-factory.js';

export class LocalEventRenderer {

    /**
     * Create a local event element
     * @param {Object} event - The event data
     * @param {Object} config - Configuration from the manager
     * @param {Date} config.currentTargetDate - The date currently being displayed
     * @param {number} config.maxWidth - Maximum width for the event element
     * @param {Function|null} config.onEventClick - Callback for event clicks
     * @returns {Promise<{element: HTMLElement, startTime: Date, endTime: Date, eventId: string}>}
     */
    async createEventElement(event, config = {}) {
        const { title, startTime, endTime } = event;

        // Set the time on the target date
        const [startHours, startMinutes] = startTime.split(':');
        const [endHours, endMinutes] = endTime.split(':');

        const startDate = createTimeOnDate(config.currentTargetDate, parseInt(startHours), parseInt(startMinutes));
        const endDate = createTimeOnDate(config.currentTargetDate, parseInt(endHours), parseInt(endMinutes));

        // Create the positioned event element via the factory
        const { eventDiv } = EventElementFactory.createEventElement({
            startDate,
            endDate,
            cssClass: 'event local-event',
            tooltip: title,
            initialWidth: config.maxWidth,
            displayDate: config.currentTargetDate
        });

        // Add time information to data attributes
        eventDiv.dataset.startTime = startTime;
        eventDiv.dataset.endTime = endTime;

        // Recurring instances keep the ID of the event they were generated from,
        // which is also the ID reminders are registered under.
        const eventId = event.originalId || event.id || `local-${title}-${startTime}-${endTime}`;
        eventDiv.dataset.eventId = eventId;

        // Check if this is a recurring event
        const isRecurring = event.isRecurringInstance || (event.recurrence && event.recurrence.type !== RECURRENCE_TYPES.NONE);

        // Set locale-aware time display asynchronously
        await this._setLocalEventContentWithLocale(eventDiv, startTime, endTime, title, isRecurring);

        // Setup the edit functionality
        this._setupEventEdit(eventDiv, event, config.onEventClick);

        return { element: eventDiv, startTime: startDate, endTime: endDate, eventId };
    }

    /**
     * Set local event content with locale-aware time display
     * @param {HTMLElement} eventDiv - The event element
     * @param {string} startTime - The start time (HH:mm format)
     * @param {string} endTime - The end time (HH:mm format)
     * @param {string} title - The event title
     * @param {boolean} isRecurring - Whether this is a recurring event
     * @private
     */
    async _setLocalEventContentWithLocale(eventDiv, startTime, endTime, title, isRecurring = false) {
        const [locale, timeFormat] = await resolveLocaleSettings();
        const parts = {
            title,
            start: startTime,
            end: endTime,
            iconClass: isRecurring ? 'fa-solid fa-repeat' : '',
            timeFormat,
            locale
        };

        eventDiv.innerHTML = '';
        eventDiv.appendChild(EventElementFactory.createEventBody(parts));
        eventDiv.title = EventElementFactory.buildTooltip(parts);
    }

    /**
     * Setup event edit functionality
     * @param {HTMLElement} eventDiv - The event element
     * @param {Object} event - The event data
     * @param {Function|null} onEventClick - The callback for event clicks
     * @private
     */
    _setupEventEdit(eventDiv, event, onEventClick) {
        onClickOnly(eventDiv, () => {
            if (onEventClick) onEventClick(event);
        });
    }
}
