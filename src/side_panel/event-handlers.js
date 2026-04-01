/**
 * SideTimeTable - Event Management Module
 *
 * This file manages the Google Calendar events and the local events.
 */

import { logError } from '../lib/utils.js';
import { RECURRENCE_TYPES } from '../lib/constants.js';
import { loadSettings, loadSelectedCalendars } from '../lib/settings-storage.js';
import { loadLocalEvents, loadLocalEventsForDate } from '../lib/event-storage.js';
import { sendMessage } from '../lib/chrome-messaging.js';
import {createTimeOnDate} from '../lib/time-utils.js';
import {getDemoEvents, getDemoLocalEvents, isDemoMode} from '../lib/demo-data.js';
import {
    EVENT_STYLING,
    onClickOnly,
    resolveLocaleSettings,
    EventElementFactory
} from './event-element-factory.js';

/**
 * GoogleEventManager - The Google event management class
 */
export class GoogleEventManager {
    /**
     * Constructor
     * @param {HTMLElement} googleEventsDiv - The DOM element for displaying the Google events
     * @param {Object} eventLayoutManager - An instance of the event layout manager
     */
    constructor(googleEventsDiv, eventLayoutManager) {
        this.googleEventsDiv = googleEventsDiv;
        this.eventLayoutManager = eventLayoutManager;
        this.lastFetchDate = null; // The last date when the API was called
        this.currentFetchPromise = null; // The currently executing fetch Promise
        this._toggleVersion = 0; // Version counter for calendar toggle race condition prevention
    }

    /**
     * Fetch the events from Google Calendar
     * @param {Date} targetDate - The target date (today if omitted)
     */
    async fetchEvents(targetDate = null) {
        // Dynamically check the current settings
        // Use mock data in demo mode
        if (isDemoMode()) {
            const settings = await loadSettings();
            this.useGoogleCalendarColors = settings.useGoogleCalendarColors !== false;
            return this._processDemoEvents();
        }

        const settings = await loadSettings();
        const isGoogleIntegrated = settings.googleIntegrated === true;
        this.useGoogleCalendarColors = settings.useGoogleCalendarColors !== false;

        if (!isGoogleIntegrated) {
            return Promise.resolve();
        }

        // Check for the duplicate call restriction on the same date
        const targetDay = targetDate || new Date();
        const targetDateStr = targetDay.toDateString(); // Compare by the date string

        // If there's a request in progress for the same date, return it (prevent duplicates)
        if (this.currentFetchPromise && this.lastFetchDate === targetDateStr) {
            return this.currentFetchPromise;
        }

        this.lastFetchDate = targetDateStr;

        // Fetch the events (use the Google colors directly)
        this.currentFetchPromise = (() => {
            const requestId = `req-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
            const message = { action: "getEvents", requestId };
            if (targetDate) {
                message.targetDate = targetDate.toISOString();
            }
            return sendMessage(message);
        })()
            .then(async response => {
                // Clear the previous display
                this.googleEventsDiv.innerHTML = '';

                // Remove only the Google events from the layout manager
                if (this.eventLayoutManager && this.eventLayoutManager.events) {
                    const events = [...this.eventLayoutManager.events];
                    events.forEach(event => {
                        if (event && event.type === 'google') {
                            this.eventLayoutManager.removeEvent(event.id);
                        }
                    });
                }

                if (!response) {
                    logError('Google event fetch', 'No response');
                    return;
                }

                if (response.error) {
                    logError('Google event fetch', response.error);
                    const errorDiv = document.createElement('div');
                    errorDiv.className = 'error-message';
                    const rid = response.requestId ? ` [Request ID: ${response.requestId}]` : '';
                    const errType = response.errorType ? ` (${response.errorType})` : '';
                    errorDiv.textContent = (window.getLocalizedMessage("errorPrefix") || 'Error: ') + response.error + errType + rid;
                    this.googleEventsDiv.appendChild(errorDiv);
                    return;
                }

                // Check the existence of the events property
                if (!response.events || !Array.isArray(response.events) || response.events.length === 0) {
                    return;
                }

                await this._processEvents(response.events);

                // Calculate and apply the event layout
                if (this.eventLayoutManager && typeof this.eventLayoutManager.calculateLayout === 'function') {
                    this.eventLayoutManager.calculateLayout();
                }
            })
            .catch(error => {
                logError('Google event fetch exception', error);
            })
            .finally(() => {
                // Clear the Promise when the request completes
                this.currentFetchPromise = null;
            });

        return this.currentFetchPromise;
    }

    /**
     * Remove events for specific calendars from DOM and layout manager
     * @param {Array<string>} calendarIds - The calendar IDs to remove events for
     */
    removeEventsForCalendars(calendarIds) {
        if (!calendarIds || calendarIds.length === 0) return;
        if (!this.eventLayoutManager || !this.eventLayoutManager.events) return;

        const calendarIdSet = new Set(calendarIds);
        const eventsToRemove = [...this.eventLayoutManager.events].filter(
            e => e.type === 'google' && calendarIdSet.has(e.calendarId)
        );

        for (const event of eventsToRemove) {
            if (event.element && event.element.parentNode) {
                event.element.remove();
            }
            this.eventLayoutManager.removeEvent(event.id);
        }
    }

    /**
     * Fetch events only for specific calendars and add them to the display
     * @param {Date} targetDate - The target date
     * @param {Array<string>} calendarIds - The calendar IDs to fetch events for
     */
    async fetchEventsForCalendars(targetDate, calendarIds) {
        if (!calendarIds || calendarIds.length === 0) return;

        const versionAtStart = ++this._toggleVersion;

        const settings = await loadSettings();
        this.useGoogleCalendarColors = settings.useGoogleCalendarColors !== false;
        const isGoogleIntegrated = settings.googleIntegrated === true;
        if (!isGoogleIntegrated) return;

        const requestId = `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const message = {
            action: "getEventsForCalendars",
            requestId,
            calendarIds
        };
        if (targetDate) {
            message.targetDate = targetDate.toISOString();
        }

        const response = await sendMessage(message);

        // If another toggle happened while we were fetching, discard this result
        if (this._toggleVersion !== versionAtStart) return;

        if (!response) return;

        if (response.error) {
            throw new Error(response.error);
        }

        if (!response.events || response.events.length === 0) {
            return;
        }

        // Filter events against current calendar selection to prevent stale renders
        const currentSelected = new Set(await loadSelectedCalendars());
        const filteredEvents = response.events.filter(
            e => e.calendarId && currentSelected.has(e.calendarId)
        );

        if (filteredEvents.length === 0) return;

        await this._processEvents(filteredEvents);
    }

    /**
     * Process and display demo events
     * @private
     */
    async _processDemoEvents() {
        // Clear previous display
        this.googleEventsDiv.innerHTML = '';

        // Remove only Google events from layout manager
        const events = [...this.eventLayoutManager.events];
        events.forEach(event => {
            if (event && event.type === 'google') {
                this.eventLayoutManager.removeEvent(event.id);
            }
        });

        // Get the demo events
        const demoEvents = await getDemoEvents();

        await this._processEvents(demoEvents);

        // Calculate and apply event layout
        this.eventLayoutManager.calculateLayout();
    }

    /**
     * Process event data and display
     * @private
     */
    async _processEvents(events) {
        for (let i = 0; i < events.length; i++) {
            try {
                const event = events[i];
                const uniqueId = `${event.id}-${i}`;

                switch (event.eventType) {
                    case 'workingLocation':
                    case 'focusTime':
                    case 'outOfOffice':
                        continue;
                    case 'default': {
                        const uniqueEvent = { ...event, uniqueId };
                        await this._createGoogleEventElement(uniqueEvent);
                        break;
                    }
                    default:
                }
            } catch (error) {
                console.error(`Error occurred during processing event ${i}:`, error);
            }
        }
    }


    /**
     * Create a Google event element
     * @private
     */
    async _createGoogleEventElement(event) {
        // Skip all-day events
        if (event.start.date || event.end.date) {
            return;
        }

        const startDate = new Date(event.start.dateTime || event.start.date);
        let endDate = new Date(event.end.dateTime || event.end.date);

        // If the start and end times are the same, treat as a default duration appointment
        if (startDate.getTime() >= endDate.getTime()) {
            endDate = new Date(startDate.getTime() + EVENT_STYLING.DEFAULT_VALUES.ZERO_DURATION_MINUTES * 60 * 1000);
        }

        // Create the positioned event element via the factory
        const { eventDiv } = EventElementFactory.createEventElement({
            startDate,
            endDate,
            cssClass: 'event google-event',
            tooltip: event.summary,
            initialWidth: this.eventLayoutManager.maxWidth
        });

        // Add time information to data attributes
        eventDiv.dataset.startTime = startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        eventDiv.dataset.endTime = endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // Save the event detail data
        eventDiv.dataset.description = event.description || '';
        eventDiv.dataset.location = event.location || '';
        eventDiv.dataset.hangoutLink = event.hangoutLink || '';

        // Add the click event (using the new modal component)
        onClickOnly(eventDiv, () => {
            const sidePanelController = window.sidePanelController;
            if (sidePanelController && sidePanelController.googleEventModal) {
                sidePanelController.googleEventModal.showEvent(event);
            }
        });

        // Apply the Google colors directly (unless disabled by user setting)
        if (this.useGoogleCalendarColors && event.calendarBackgroundColor) {
            eventDiv.style.backgroundColor = event.calendarBackgroundColor;
            eventDiv.style.color = event.calendarForegroundColor;
        }

        // Set the locale-aware time display asynchronously (with attendee information)
        await this._setEventContentWithLocale(eventDiv, startDate, event.summary, event);

        this.googleEventsDiv.appendChild(eventDiv);

        // Register with the event layout manager
        const eventId = event.uniqueId || event.id || `google-${Date.now()}-${Math.random()}`;
        if (this.eventLayoutManager && typeof this.eventLayoutManager.registerEvent === 'function') {
            this.eventLayoutManager.registerEvent({
                startTime: startDate,
                endTime: endDate,
                element: eventDiv,
                title: event.summary,
                type: 'google',
                id: eventId,
                calendarId: event.calendarId
            });
        }
    }


    /**
     * Set event content with locale-aware time display
     * @param {HTMLElement} eventDiv - The event element
     * @param {Date} startDate - The start time
     * @param {string} summary - The event title
     * @param {Object} event - The full event information
     * @private
     */
    async _setEventContentWithLocale(eventDiv, startDate, summary, event) {
        const [locale, timeFormat] = await resolveLocaleSettings();

        // Build HH:mm
        const startHours = String(startDate.getHours()).padStart(2, '0');
        const startMinutes = String(startDate.getMinutes()).padStart(2, '0');
        const timeString = `${startHours}:${startMinutes}`;

        const formattedTime = window.formatTime(timeString, { format: timeFormat, locale });

        // Display time and title without attendance status
        eventDiv.innerHTML = '';

        // Primary line: time + title (via factory)
        const primaryLine = EventElementFactory.createPrimaryLine(formattedTime, summary);
        eventDiv.appendChild(primaryLine);

        // Detail lines for larger blocks
        if (eventDiv.classList.contains('event-detailed')) {
            if (event.location) {
                const locationLine = document.createElement('div');
                locationLine.className = 'event-detail-line';
                const icon = document.createElement('i');
                icon.className = 'fa-solid fa-location-dot';
                icon.setAttribute('aria-hidden', 'true');
                locationLine.appendChild(icon);
                const text = document.createElement('span');
                text.textContent = event.location;
                locationLine.appendChild(text);
                eventDiv.appendChild(locationLine);
            }
            if (event.description) {
                const descLine = document.createElement('div');
                descLine.className = 'event-detail-line';
                const icon = document.createElement('i');
                icon.className = 'fa-solid fa-align-left';
                icon.setAttribute('aria-hidden', 'true');
                descLine.appendChild(icon);
                const text = document.createElement('span');
                text.textContent = event.description.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
                descLine.appendChild(text);
                eventDiv.appendChild(descLine);
            }
        }
    }

    /**
     * Clean up resources
     */
    destroy() {
        if (this.googleEventsDiv) this.googleEventsDiv.innerHTML = '';
        this.eventLayoutManager = null;
        this.currentFetchPromise = null;
        this.lastFetchDate = null;
    }
}

/**
 * LocalEventManager - Local event management class
 */
export class LocalEventManager {
    /**
     * Constructor
     * @param {HTMLElement} localEventsDiv - The DOM element for displaying local events
     * @param {Object} eventLayoutManager - An instance of the event layout manager
     */
    constructor(localEventsDiv, eventLayoutManager) {
        this.localEventsDiv = localEventsDiv;
        this.eventLayoutManager = eventLayoutManager;
        this.currentTargetDate = new Date(); // The currently displayed date
        this.onEventClick = null; // The callback for event clicks
    }


    /**
     * Set event click callback
     * @param {Function} callback - The callback function for event clicks
     */
    setEventClickCallback(callback) {
        this.onEventClick = callback;
    }

    /**
     * Load local events
     * @param {Date} targetDate - The target date (today if omitted)
     */
    async loadLocalEvents(targetDate = null) {
        // Update the target date
        this.currentTargetDate = targetDate || new Date();

        this.localEventsDiv.innerHTML = ''; // Clear the previous display

        // Use mock data in demo mode
        if (isDemoMode()) {
            const demoEvents = await getDemoLocalEvents();

            for (const event of demoEvents) {
                try {
                    const eventDiv = await this._createEventDiv(event);
                    this.localEventsDiv.appendChild(eventDiv);
                } catch (error) {
                    logError('Demo event display', error);
                }
            }
            return;
        }

        try {
            const events = targetDate ?
                await loadLocalEventsForDate(targetDate) :
                await loadLocalEvents();

            for (const event of events) {
                try {
                    const eventDiv = await this._createEventDiv(event);
                    this.localEventsDiv.appendChild(eventDiv);
                } catch (error) {
                    logError('Event display', error);
                }
            }
        } catch (error) {
            logError('Local event loading', error);
        }
    }

    /**
     * Create event element
     * @private
     */
    async _createEventDiv(event) {
        const { title, startTime, endTime } = event;

        // Set the time on the target date
        const [startHours, startMinutes] = startTime.split(':');
        const [endHours, endMinutes] = endTime.split(':');

        const startDate = createTimeOnDate(this.currentTargetDate, parseInt(startHours), parseInt(startMinutes));
        const endDate = createTimeOnDate(this.currentTargetDate, parseInt(endHours), parseInt(endMinutes));

        // Create the positioned event element via the factory
        const { eventDiv } = EventElementFactory.createEventElement({
            startDate,
            endDate,
            cssClass: 'event local-event',
            tooltip: event.description ? `${title}\n${event.description}` : title,
            initialWidth: this.eventLayoutManager.maxWidth
        });

        // Add time information to data attributes
        eventDiv.dataset.startTime = startTime;
        eventDiv.dataset.endTime = endTime;

        // Check if this is a recurring event
        const isRecurring = event.isRecurringInstance || (event.recurrence && event.recurrence.type !== RECURRENCE_TYPES.NONE);

        // Set locale-aware time display asynchronously
        await this._setLocalEventContentWithLocale(eventDiv, startTime, endTime, title, isRecurring, event);

        // Setup the edit functionality
        this._setupEventEdit(eventDiv, event);

        // Register with the event layout manager
        this.eventLayoutManager.registerEvent({
            startTime: startDate,
            endTime: endDate,
            element: eventDiv,
            type: 'local',
            title: title,
            id: event.id || `local-${title}-${startTime}-${endTime}`
        });

        return eventDiv;
    }

    /**
     * Set local event content with locale-aware time display
     * @param {HTMLElement} eventDiv - The event element
     * @param {string} startTime - The start time (HH:mm format)
     * @param {string} endTime - The end time (HH:mm format)
     * @param {string} title - The event title
     * @param {boolean} isRecurring - Whether this is a recurring event
     * @param {Object} event - The full event object
     * @private
     */
    async _setLocalEventContentWithLocale(eventDiv, startTime, endTime, title, isRecurring = false, event = {}) {
        const [locale, timeFormat] = await resolveLocaleSettings();

        const formattedStart = window.formatTime(startTime, { format: timeFormat, locale });

        // Clear existing content
        eventDiv.innerHTML = '';

        // Primary line: time + title (via factory, then prepend recurrence icon if needed)
        const primaryLine = EventElementFactory.createPrimaryLine(formattedStart, title);

        // Add recurrence indicator if this is a recurring event
        if (isRecurring) {
            const icon = document.createElement('i');
            icon.className = 'fa-solid fa-repeat';
            icon.style.cssText = 'margin-right: 4px; font-size: 0.85em;';
            primaryLine.insertBefore(icon, primaryLine.firstChild);
        }

        eventDiv.appendChild(primaryLine);

        // Detail lines for larger blocks
        if (eventDiv.classList.contains('event-detailed') && event.description) {
            const descLine = document.createElement('div');
            descLine.className = 'event-detail-line';
            const icon = document.createElement('i');
            icon.className = 'fa-solid fa-align-left';
            icon.setAttribute('aria-hidden', 'true');
            descLine.appendChild(icon);
            const text = document.createElement('span');
            text.textContent = event.description;
            descLine.appendChild(text);
            eventDiv.appendChild(descLine);
        }
    }

    /**
     * Setup event edit functionality
     * @private
     */
    _setupEventEdit(eventDiv, event) {
        onClickOnly(eventDiv, () => {
            if (this.onEventClick) this.onEventClick(event);
        });
    }

    /**
     * Clean up resources
     */
    destroy() {
        if (this.localEventsDiv) this.localEventsDiv.innerHTML = '';
        this.eventLayoutManager = null;
        this.onEventClick = null;
    }
}
