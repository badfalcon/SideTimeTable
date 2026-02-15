/**
 * SideTimeTable - Event Management Module
 *
 * Manages Google Calendar events and local events display.
 */

import { loadLocalEvents, loadLocalEventsForDate, loadSettings, logError } from '../lib/utils.js';
import { TIME_CONSTANTS, EVENT_STYLING, RECURRENCE_TYPES } from '../lib/constants.js';
import { createTimeOnDate } from '../lib/time-utils.js';
import { getDemoEvents, getDemoLocalEvents, isDemoMode } from '../lib/demo-data.js';
import { eventBus, Events } from '../lib/event-bus.js';
import { getLocalePreferences, formatTimeForDisplay, formatTimeRange, formatTimeFromDate } from '../lib/format-utils.js';

/**
 * Apply duration-based styling to event element
 * @param {HTMLElement} eventDiv - The event element
 * @param {number} duration - Duration in minutes
 * @param {string} baseClasses - Base CSS classes
 */
function applyDurationBasedStyling(eventDiv, duration, baseClasses) {
    let sizeClass = '';

    if (duration <= EVENT_STYLING.DURATION_THRESHOLDS.MICRO) {
        sizeClass = EVENT_STYLING.CSS_CLASSES.MICRO;
        eventDiv.style.height = `${Math.max(duration, EVENT_STYLING.HEIGHT.MIN_HEIGHT)}px`;
    } else if (duration <= EVENT_STYLING.DURATION_THRESHOLDS.COMPACT) {
        sizeClass = EVENT_STYLING.CSS_CLASSES.COMPACT;
        eventDiv.style.height = `${duration}px`;
    } else {
        eventDiv.style.height = `${duration - EVENT_STYLING.HEIGHT.PADDING_OFFSET}px`;
    }

    eventDiv.className = `${baseClasses} ${sizeClass}`.trim();
}

/**
 * Set initial width and position on an event element
 * @param {HTMLElement} eventDiv - The event element
 * @param {Object|null} eventLayoutManager - The layout manager
 */
function applyInitialLayout(eventDiv, eventLayoutManager) {
    const initialWidth = eventLayoutManager ? eventLayoutManager.maxWidth : EVENT_STYLING.DEFAULT_VALUES.INITIAL_WIDTH;
    eventDiv.style.width = `${initialWidth}px`;
    eventDiv.style.left = `${EVENT_STYLING.DEFAULT_VALUES.INITIAL_LEFT_OFFSET}px`;
}

/**
 * GoogleEventManager - Google event management class
 */
export class GoogleEventManager {
    /**
     * @param {HTMLElement} googleEventsDiv - The DOM element for displaying Google events
     * @param {Object} eventLayoutManager - An instance of the event layout manager
     */
    constructor(googleEventsDiv, eventLayoutManager) {
        this.googleEventsDiv = googleEventsDiv;
        this.eventLayoutManager = eventLayoutManager;
        this.lastFetchDate = null;
        this.currentFetchPromise = null;
    }

    /**
     * Fetch the events from Google Calendar
     * @param {Date} targetDate - The target date
     */
    async fetchEvents(targetDate = null) {
        const settings = await loadSettings();
        if (settings.googleIntegrated !== true) {
            return Promise.resolve();
        }

        if (isDemoMode()) {
            return this._processDemoEvents();
        }

        if (this.currentFetchPromise) {
            return this.currentFetchPromise;
        }

        const targetDay = targetDate || new Date();
        const targetDateStr = targetDay.toDateString();

        if (this.lastFetchDate === targetDateStr && this.currentFetchPromise) {
            return this.currentFetchPromise;
        }

        this.lastFetchDate = targetDateStr;

        this.currentFetchPromise = new Promise((resolve, reject) => {
            const requestId = `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            const message = { action: "getEvents", requestId };
            if (targetDate) {
                message.targetDate = targetDate.toISOString();
            }

            chrome.runtime.sendMessage(message, (response) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                    return;
                }
                resolve(response);
            });
        })
            .then(async response => {
                this.googleEventsDiv.innerHTML = '';
                this._removeGoogleEventsFromLayout();

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
                    errorDiv.textContent = (chrome.i18n.getMessage("errorPrefix") || 'Error: ') + response.error + errType + rid;
                    this.googleEventsDiv.appendChild(errorDiv);
                    return;
                }

                if (!response.events || !Array.isArray(response.events) || response.events.length === 0) {
                    return;
                }

                await this._processEvents(response.events);

                if (this.eventLayoutManager && typeof this.eventLayoutManager.calculateLayout === 'function') {
                    this.eventLayoutManager.calculateLayout();
                }
            })
            .catch(error => {
                logError('Google event fetch exception', error);
            })
            .finally(() => {
                this.currentFetchPromise = null;
            });

        return this.currentFetchPromise;
    }

    /**
     * Remove Google events from the layout manager
     * @private
     */
    _removeGoogleEventsFromLayout() {
        if (this.eventLayoutManager && this.eventLayoutManager.events) {
            const events = [...this.eventLayoutManager.events];
            events.forEach(event => {
                if (event && event.type === 'google') {
                    this.eventLayoutManager.removeEvent(event.id);
                }
            });
        }
    }

    /**
     * Process and display demo events
     * @private
     */
    async _processDemoEvents() {
        this.googleEventsDiv.innerHTML = '';
        this._removeGoogleEventsFromLayout();

        const demoEvents = await getDemoEvents();
        await this._processEvents(demoEvents);

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
                    case 'default':
                        await this._createGoogleEventElement({ ...event, uniqueId });
                        break;
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
        if (event.start.date || event.end.date) {
            return;
        }

        const eventDiv = document.createElement('div');
        eventDiv.className = 'event google-event';
        eventDiv.title = event.summary;

        const startDate = new Date(event.start.dateTime || event.start.date);
        let endDate = new Date(event.end.dateTime || event.end.date);

        if (startDate.getTime() >= endDate.getTime()) {
            endDate = new Date(startDate.getTime() + EVENT_STYLING.DEFAULT_VALUES.ZERO_DURATION_MINUTES * 60 * 1000);
        }

        eventDiv.dataset.startTime = startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        eventDiv.dataset.endTime = endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        eventDiv.dataset.description = event.description || '';
        eventDiv.dataset.location = event.location || '';
        eventDiv.dataset.hangoutLink = event.hangoutLink || '';

        // Use EventBus instead of window.sidePanelController
        eventDiv.addEventListener('click', () => {
            eventBus.emit(Events.SHOW_GOOGLE_EVENT, event);
        });

        const startOffset = startDate.getHours() * 60 + startDate.getMinutes();
        const duration = (endDate - startDate) / TIME_CONSTANTS.MINUTE_MILLIS;

        applyDurationBasedStyling(eventDiv, duration, 'event google-event');
        eventDiv.style.top = `${startOffset}px`;
        applyInitialLayout(eventDiv, this.eventLayoutManager);

        if (event.calendarBackgroundColor) {
            eventDiv.style.backgroundColor = event.calendarBackgroundColor;
            eventDiv.style.color = event.calendarForegroundColor;
        }

        await this._setEventContentWithLocale(eventDiv, startDate, event.summary);

        this.googleEventsDiv.appendChild(eventDiv);

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
     * @private
     */
    async _setEventContentWithLocale(eventDiv, startDate, summary) {
        const { locale, timeFormat } = await getLocalePreferences();
        const timeString = formatTimeFromDate(startDate);
        const formattedTime = formatTimeForDisplay(timeString, { locale, format: timeFormat });
        eventDiv.textContent = `${formattedTime} - ${summary}`;
    }
}

/**
 * LocalEventManager - Local event management class
 */
export class LocalEventManager {
    /**
     * @param {HTMLElement} localEventsDiv - The DOM element for displaying local events
     * @param {Object} eventLayoutManager - An instance of the event layout manager
     */
    constructor(localEventsDiv, eventLayoutManager) {
        this.localEventsDiv = localEventsDiv;
        this.eventLayoutManager = eventLayoutManager;
        this.currentTargetDate = new Date();
        this.onEventClick = null;
    }

    /**
     * Set event click callback
     * @param {Function} callback
     */
    setEventClickCallback(callback) {
        this.onEventClick = callback;
    }

    /**
     * Load local events
     * @param {Date} targetDate
     */
    async loadLocalEvents(targetDate = null) {
        this.currentTargetDate = targetDate || new Date();
        this.localEventsDiv.innerHTML = '';

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
            const events = targetDate
                ? await loadLocalEventsForDate(targetDate)
                : await loadLocalEvents();

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
        const eventDiv = document.createElement('div');
        eventDiv.className = 'event local-event';
        eventDiv.title = title;

        const [startHours, startMinutes] = startTime.split(':');
        const [endHours, endMinutes] = endTime.split(':');

        const startDate = createTimeOnDate(this.currentTargetDate, parseInt(startHours), parseInt(startMinutes));
        const endDate = createTimeOnDate(this.currentTargetDate, parseInt(endHours), parseInt(endMinutes));

        eventDiv.dataset.startTime = startTime;
        eventDiv.dataset.endTime = endTime;

        const startOffset = startDate.getHours() * 60 + startDate.getMinutes();
        const duration = (endDate.getTime() - startDate.getTime()) / TIME_CONSTANTS.MINUTE_MILLIS;

        applyDurationBasedStyling(eventDiv, duration, 'event local-event');
        eventDiv.style.top = `${startOffset}px`;
        applyInitialLayout(eventDiv, this.eventLayoutManager);

        const isRecurring = event.isRecurringInstance || (event.recurrence && event.recurrence.type !== RECURRENCE_TYPES.NONE);

        await this._setLocalEventContentWithLocale(eventDiv, startTime, endTime, title, isRecurring);

        this._setupEventEdit(eventDiv, event);

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
     * @private
     */
    async _setLocalEventContentWithLocale(eventDiv, startTime, endTime, title, isRecurring = false) {
        const { locale, timeFormat } = await getLocalePreferences();
        const formattedTimeRange = formatTimeRange(startTime, endTime, { locale, format: timeFormat });

        eventDiv.innerHTML = '';

        if (isRecurring) {
            const icon = document.createElement('i');
            icon.className = 'fa-solid fa-repeat';
            icon.style.cssText = 'margin-right: 4px; font-size: 0.85em;';
            eventDiv.appendChild(icon);
        }

        const textNode = document.createTextNode(`${formattedTimeRange}: ${title}`);
        eventDiv.appendChild(textNode);
    }

    /**
     * Setup event edit functionality
     * @private
     */
    _setupEventEdit(eventDiv, event) {
        eventDiv.addEventListener('click', () => {
            if (this.onEventClick) {
                this.onEventClick(event);
            }
        });
    }
}
