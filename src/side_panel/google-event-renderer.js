/**
 * GoogleEventRenderer - DOM element creation for Google Calendar events
 *
 * Extracts rendering responsibilities from GoogleEventManager so the manager
 * handles only data fetching and orchestration while this module handles DOM
 * element construction.
 */

import {
    EVENT_STYLING,
    onClickOnly,
    resolveLocaleSettings,
    EventElementFactory
} from './event-element-factory.js';

export class GoogleEventRenderer {

    /**
     * Create an all-day event chip element
     * @param {Object} event - The event data
     * @param {Object} options - Rendering options
     * @param {boolean} [options.isOutOfOffice=false] - Whether this is an OOO event
     * @param {Object} config - Configuration from the manager
     * @param {boolean} config.useGoogleCalendarColors - Whether to apply Google Calendar colors
     * @param {Date|null} config.currentTargetDate - The date currently being displayed
     * @param {Function} [config.onEventClick] - Callback when event is clicked
     * @returns {{element: HTMLElement}} Object wrapping the created chip element
     */
    createAllDayEventElement(event, options = {}, config = {}) {
        const chip = document.createElement('div');
        chip.className = options.isOutOfOffice
            ? 'all-day-event-chip all-day-event-chip-ooo'
            : 'all-day-event-chip';

        const title = event.summary || (options.isOutOfOffice
            ? window.getLocalizedMessage('outOfOffice')
            : window.getLocalizedMessage('allDay'));

        // Calculate day progress for multi-day events (e.g. Day 2/3)
        let dayCount = 1;
        let currentDay = 1;
        if (event.start.date && event.end.date) {
            const MS_PER_DAY = 24 * 60 * 60 * 1000;
            const start = new Date(event.start.date + 'T00:00:00');
            const end = new Date(event.end.date + 'T00:00:00');
            dayCount = Math.round((end - start) / MS_PER_DAY);
            if (config.currentTargetDate) {
                const viewing = new Date(config.currentTargetDate.getFullYear(), config.currentTargetDate.getMonth(), config.currentTargetDate.getDate());
                currentDay = Math.min(dayCount, Math.max(1, Math.round((viewing - start) / MS_PER_DAY) + 1));
            }
        }

        chip.title = title;
        const titleSpan = document.createElement('span');
        titleSpan.className = 'all-day-event-chip-title';
        titleSpan.textContent = title;
        chip.appendChild(titleSpan);

        if (dayCount > 1) {
            const badge = document.createElement('span');
            badge.className = 'all-day-event-chip-days';
            const template = window.getLocalizedMessage('multiDayProgress');
            badge.textContent = template
                ? template.replace('$1', currentDay).replace('$2', dayCount)
                : `${currentDay}/${dayCount}`;
            chip.appendChild(badge);
        }

        if (event.calendarId) {
            chip.dataset.calendarId = event.calendarId;
        }

        if (event.id) {
            chip.dataset.eventId = event.id;
        }

        // The calendar's colour tints the chip (see .has-calendar-color)
        if (config.useGoogleCalendarColors && event.calendarBackgroundColor) {
            chip.style.setProperty('--event-color', event.calendarBackgroundColor);
            chip.classList.add('has-calendar-color');
        }

        // Open modal on click
        onClickOnly(chip, () => {
            if (config.onEventClick) config.onEventClick(event);
        });

        return { element: chip };
    }

    /**
     * Create a timed Google event element
     * @param {Object} event - The event data
     * @param {Object} options - Rendering options
     * @param {boolean} [options.isOutOfOffice=false] - Whether this is an OOO event
     * @param {Object} config - Configuration from the manager
     * @param {boolean} config.useGoogleCalendarColors - Whether to apply Google Calendar colors
     * @param {number} config.maxWidth - Maximum width for the event element
     * @param {Function} [config.onEventClick] - Callback when event is clicked
     * @returns {Promise<{element: HTMLElement, startTime: Date, endTime: Date}>}
     */
    async createTimedEventElement(event, options = {}, config = {}) {
        // Safety guard: all-day events should not reach here
        if (event.start.date || event.end.date) {
            return null;
        }

        const startDate = new Date(event.start.dateTime || event.start.date);
        let endDate = new Date(event.end.dateTime || event.end.date);

        // If the start and end times are the same, treat as a default duration appointment
        if (startDate.getTime() >= endDate.getTime()) {
            endDate = new Date(startDate.getTime() + EVENT_STYLING.DEFAULT_VALUES.ZERO_DURATION_MINUTES * 60 * 1000);
        }

        // Create the positioned event element via the factory
        const cssClass = options.isOutOfOffice
            ? 'event google-event google-event-ooo'
            : 'event google-event';
        const title = event.summary || (options.isOutOfOffice ? window.getLocalizedMessage('outOfOffice') : '');
        const { eventDiv } = EventElementFactory.createEventElement({
            startDate,
            endDate,
            cssClass,
            tooltip: title,
            initialWidth: config.maxWidth,
            displayDate: config.currentTargetDate
        });

        // Add time information to data attributes
        eventDiv.dataset.startTime = startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        eventDiv.dataset.endTime = endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // The Calendar event ID, so a reminder notification can scroll to this
        // block. Not uniqueId: reminders are keyed by the Calendar ID.
        if (event.id) {
            eventDiv.dataset.eventId = event.id;
        }


        // Add the click event
        onClickOnly(eventDiv, () => {
            if (config.onEventClick) config.onEventClick(event);
        });

        // The calendar's colour tints the block and its text
        // (unless disabled by user setting; see .has-calendar-color)
        if (config.useGoogleCalendarColors && event.calendarBackgroundColor) {
            eventDiv.style.setProperty('--event-color', event.calendarBackgroundColor);
            eventDiv.classList.add('has-calendar-color');
        }

        // Set the locale-aware time display asynchronously
        await this._setEventContentWithLocale(eventDiv, startDate, endDate, title, event, options);

        return { element: eventDiv, startTime: startDate, endTime: endDate };
    }

    /**
     * Set event content with locale-aware time display
     * @param {HTMLElement} eventDiv - The event element
     * @param {Date} startDate - The start time
     * @param {Date} endDate - The end time
     * @param {string} summary - The event title
     * @param {Object} event - The full event information
     * @param {Object} options - Rendering options (isOutOfOffice)
     * @private
     */
    async _setEventContentWithLocale(eventDiv, startDate, endDate, summary, event, options = {}) {
        const [locale, timeFormat] = await resolveLocaleSettings();
        const hhmm = (date) => `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
        const parts = {
            title: summary,
            start: hhmm(startDate),
            end: hhmm(endDate),
            location: event.location || '',
            iconClass: options.isOutOfOffice ? 'fa-solid fa-plane-departure' : '',
            timeFormat,
            locale
        };

        eventDiv.innerHTML = '';
        eventDiv.appendChild(EventElementFactory.createEventBody(parts));
        eventDiv.title = EventElementFactory.buildTooltip(parts);
    }
}
