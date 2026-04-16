/**
 * SideTimeTable - Event Management Module
 *
 * This file manages the Google Calendar events and the local events.
 * DOM element creation is delegated to GoogleEventRenderer and LocalEventRenderer.
 */

import { logError } from '../lib/utils.js';
import { loadSettings, loadSelectedCalendars } from '../lib/settings-storage.js';
import { loadLocalEvents, loadLocalEventsForDate } from '../lib/event-storage.js';
import { sendMessage } from '../lib/chrome-messaging.js';
import {getDemoEvents, getDemoLocalEvents, isDemoMode} from '../lib/demo-data.js';
import { GoogleEventRenderer } from './google-event-renderer.js';
import { LocalEventRenderer } from './local-event-renderer.js';

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
        this.onAuthExpired = null; // Callback when authentication expires
        this._authExpiredKnown = false; // Skip fetches after auth failure is detected
        this.allDayEventsContainer = null; // Container for all-day event chips
        this._currentTargetDate = null; // The date currently being displayed
        this._renderer = new GoogleEventRenderer();
    }

    /**
     * Set the container for all-day events
     * @param {HTMLElement} container - The DOM element for displaying all-day event chips
     */
    setAllDayEventsContainer(container) {
        this.allDayEventsContainer = container;
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
            this._currentTargetDate = targetDate || new Date();
            return this._processDemoEvents();
        }

        const settings = await loadSettings();
        const isGoogleIntegrated = settings.googleIntegrated === true;
        this.useGoogleCalendarColors = settings.useGoogleCalendarColors !== false;

        if (!isGoogleIntegrated || this._authExpiredKnown) {
            return Promise.resolve();
        }

        // Check for the duplicate call restriction on the same date
        const targetDay = targetDate || new Date();
        this._currentTargetDate = targetDay;
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
                if (this.allDayEventsContainer) {
                    this.allDayEventsContainer.innerHTML = '';
                }

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
                    if (response.authExpired) {
                        this._authExpiredKnown = true;
                        if (this.onAuthExpired) this.onAuthExpired();
                        return;
                    }
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

        const calendarIdSet = new Set(calendarIds);

        // Remove timed events from layout manager
        if (this.eventLayoutManager && this.eventLayoutManager.events) {
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

        // Remove all-day event chips
        if (this.allDayEventsContainer) {
            const chips = this.allDayEventsContainer.querySelectorAll('.all-day-event-chip');
            chips.forEach(chip => {
                if (calendarIdSet.has(chip.dataset.calendarId)) {
                    chip.remove();
                }
            });
        }
    }

    /**
     * Fetch events only for specific calendars and add them to the display
     * @param {Date} targetDate - The target date
     * @param {Array<string>} calendarIds - The calendar IDs to fetch events for
     */
    async fetchEventsForCalendars(targetDate, calendarIds) {
        if (!calendarIds || calendarIds.length === 0) return;
        if (targetDate) this._currentTargetDate = targetDate;

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
        if (this.allDayEventsContainer) {
            this.allDayEventsContainer.innerHTML = '';
        }

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
        const renderConfig = {
            useGoogleCalendarColors: this.useGoogleCalendarColors,
            currentTargetDate: this._currentTargetDate,
            maxWidth: this.eventLayoutManager ? this.eventLayoutManager.maxWidth : undefined,
            onEventClick: (event) => {
                const controller = window.sidePanelController;
                if (controller && controller.googleEventModal) {
                    controller.googleEventModal.showEvent(event);
                }
            }
        };

        for (let i = 0; i < events.length; i++) {
            try {
                const event = events[i];
                const uniqueId = `${event.id}-${i}`;
                const uniqueEvent = { ...event, uniqueId };

                switch (event.eventType) {
                    case 'workingLocation':
                    case 'focusTime':
                        continue;
                    case 'outOfOffice':
                    default: {
                        const isOOO = event.eventType === 'outOfOffice';
                        const isAllDay = event.start.date || event.end.date;

                        if (isAllDay) {
                            const result = this._renderer.createAllDayEventElement(
                                uniqueEvent, { isOutOfOffice: isOOO }, renderConfig
                            );
                            if (result && result.element && this.allDayEventsContainer) {
                                this.allDayEventsContainer.appendChild(result.element);
                            }
                        } else {
                            const result = await this._renderer.createTimedEventElement(
                                uniqueEvent, { isOutOfOffice: isOOO }, renderConfig
                            );
                            if (result) {
                                this.googleEventsDiv.appendChild(result.element);
                                this._registerGoogleEvent(result, uniqueEvent, event);
                            }
                        }
                        break;
                    }
                }
            } catch (error) {
                logError(`Google event processing (index ${i})`, error);
            }
        }
    }

    /**
     * Register a Google event with the layout manager
     * @private
     */
    _registerGoogleEvent(result, uniqueEvent, event) {
        if (this.eventLayoutManager && typeof this.eventLayoutManager.registerEvent === 'function') {
            const eventId = uniqueEvent.uniqueId || uniqueEvent.id || `google-${Date.now()}-${Math.random()}`;
            this.eventLayoutManager.registerEvent({
                startTime: result.startTime,
                endTime: result.endTime,
                element: result.element,
                title: event.summary,
                type: 'google',
                id: eventId,
                calendarId: event.calendarId
            });
        }
    }

    /**
     * Reset auth expired state to allow fetches again after reconnection
     */
    resetAuthState() {
        this._authExpiredKnown = false;
    }

    /**
     * Clean up resources
     */
    destroy() {
        if (this.googleEventsDiv) this.googleEventsDiv.innerHTML = '';
        if (this.allDayEventsContainer) this.allDayEventsContainer.innerHTML = '';
        this.allDayEventsContainer = null;
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
        this._renderer = new LocalEventRenderer();
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

        const renderConfig = {
            currentTargetDate: this.currentTargetDate,
            maxWidth: this.eventLayoutManager ? this.eventLayoutManager.maxWidth : undefined,
            onEventClick: this.onEventClick
        };

        // Get events from appropriate source
        let events;
        if (isDemoMode()) {
            events = await getDemoLocalEvents();
        } else {
            try {
                events = targetDate ?
                    await loadLocalEventsForDate(targetDate) :
                    await loadLocalEvents();
            } catch (error) {
                logError('Local event loading', error);
                return;
            }
        }

        for (const event of events) {
            try {
                const result = await this._renderer.createEventElement(event, renderConfig);
                this.localEventsDiv.appendChild(result.element);
                this._registerLocalEvent(result, event.title);
            } catch (error) {
                logError('Event display', error);
            }
        }
    }

    /**
     * Register a local event with the layout manager
     * @private
     */
    _registerLocalEvent(result, title) {
        if (this.eventLayoutManager && typeof this.eventLayoutManager.registerEvent === 'function') {
            this.eventLayoutManager.registerEvent({
                startTime: result.startTime,
                endTime: result.endTime,
                element: result.element,
                type: 'local',
                title,
                id: result.eventId
            });
        }
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
