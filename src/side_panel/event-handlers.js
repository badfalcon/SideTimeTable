/**
 * SideTimeTable - Event Management Module
 *
 * This file manages the Google Calendar events and the local events.
 */

import {
    loadLocalEvents,
    loadLocalEventsForDate,
    loadSettings,
    logError,
    TIME_CONSTANTS,
    RECURRENCE_TYPES
} from '../lib/utils.js';
import {createTimeOnDate} from '../lib/time-utils.js';
import {getDemoEvents, getDemoLocalEvents, isDemoMode} from '../lib/demo-data.js';

/**
 * Constants for event styling and layout
 */
const EVENT_STYLING = {
    DURATION_THRESHOLDS: {
        MICRO: 15,     // 15 minutes or less
        COMPACT: 30    // 30 minutes or less
    },
    HEIGHT: {
        MIN_HEIGHT: 10,      // Minimum clickable height in pixels
        PADDING_OFFSET: 10   // Padding to subtract from normal events
    },
    CSS_CLASSES: {
        MICRO: 'micro',
        COMPACT: 'compact'
    },
    DEFAULT_VALUES: {
        ZERO_DURATION_MINUTES: 15,    // Default duration for zero-duration events
        INITIAL_LEFT_OFFSET: 40       // Default left position (30px time labels + 5px margin)
    }
};

/**
 * Apply duration-based styling to event element
 * @param {HTMLElement} eventDiv - The event element
 * @param {number} duration - Duration in minutes
 * @param {string} baseClasses - Base CSS classes (e.g., 'event google-event')
 */
function applyDurationBasedStyling(eventDiv, duration, baseClasses) {
    let sizeClass = '';

    if (duration <= EVENT_STYLING.DURATION_THRESHOLDS.MICRO) {
        sizeClass = EVENT_STYLING.CSS_CLASSES.MICRO;
        eventDiv.style.height = `${Math.max(duration, EVENT_STYLING.HEIGHT.MIN_HEIGHT)}px`;
    } else if (duration <= EVENT_STYLING.DURATION_THRESHOLDS.COMPACT) {
        sizeClass = EVENT_STYLING.CSS_CLASSES.COMPACT;
        eventDiv.style.height = `${duration}px`; // Don't subtract padding for short events
    } else {
        eventDiv.style.height = `${duration - EVENT_STYLING.HEIGHT.PADDING_OFFSET}px`;
    }

    eventDiv.className = `${baseClasses} ${sizeClass}`.trim();
}

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
    }

    /**
     * Fetch the events from Google Calendar
     * @param {Date} targetDate - The target date (today if omitted)
     */
    async fetchEvents(targetDate = null) {
        // Dynamically check the current settings
        const settings = await loadSettings();
        const isGoogleIntegrated = settings.googleIntegrated === true;

        if (!isGoogleIntegrated) {
            return Promise.resolve();
        }

        // Use mock data in demo mode
        if (isDemoMode()) {
            return this._processDemoEvents();
        }

        // If there's a request in progress, return it (prevent duplicates)
        if (this.currentFetchPromise) {
            return this.currentFetchPromise;
        }

        // Check for the duplicate call restriction on the same date
        const targetDay = targetDate || new Date();
        const targetDateStr = targetDay.toDateString(); // Compare by the date string

        if (this.lastFetchDate === targetDateStr && this.currentFetchPromise) {
            return this.currentFetchPromise; // Return the existing Promise
        }

        this.lastFetchDate = targetDateStr;

        // Fetch the events (use the Google colors directly)
        this.currentFetchPromise = new Promise((resolve, reject) => {
            const requestId = `req-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
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
                    errorDiv.textContent = (chrome.i18n.getMessage("errorPrefix") || 'Error: ') + response.error + errType + rid;
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
                    case 'default':
                        const uniqueEvent = { ...event, uniqueId };
                        await this._createGoogleEventElement(uniqueEvent);
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
        // Skip all-day events
        if (event.start.date || event.end.date) {
            return;
        }

        const eventDiv = document.createElement('div');
        eventDiv.className = 'event google-event';
        eventDiv.title = event.summary;

        const startDate = new Date(event.start.dateTime || event.start.date);
        let endDate = new Date(event.end.dateTime || event.end.date);

        // If the start and end times are the same, treat as a default duration appointment
        if (startDate.getTime() >= endDate.getTime()) {
            endDate = new Date(startDate.getTime() + EVENT_STYLING.DEFAULT_VALUES.ZERO_DURATION_MINUTES * 60 * 1000);
        }

        // Add time information to data attributes
        eventDiv.dataset.startTime = startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        eventDiv.dataset.endTime = endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // Save the event detail data
        eventDiv.dataset.description = event.description || '';
        eventDiv.dataset.location = event.location || '';
        eventDiv.dataset.hangoutLink = event.hangoutLink || '';

        // Add the click event (using the new modal component)
        eventDiv.addEventListener('click', () => {
            // Get googleEventModal from parent SidePanelUIController
            const sidePanelController = window.sidePanelController;
            if (sidePanelController && sidePanelController.googleEventModal) {
                sidePanelController.googleEventModal.showEvent(event);
            }
        });

        // Calculate position in the 24-hour coordinate system (convert minutes from 0:00 to pixels)
        const startOffset = (startDate.getHours() * 60 + startDate.getMinutes());
        const duration = (endDate - startDate) / TIME_CONSTANTS.MINUTE_MILLIS;

        // Apply duration-based styling
        applyDurationBasedStyling(eventDiv, duration, 'event google-event');

        eventDiv.style.top = `${startOffset}px`;

        // Set the initial width and position to prevent visible resize during layout calculation
        // This will be overridden by EventLayoutManager, but prevents initial flash
        const initialWidth = this.eventLayoutManager.maxWidth;
        eventDiv.style.width = `${initialWidth}px`;
        eventDiv.style.left = `${EVENT_STYLING.DEFAULT_VALUES.INITIAL_LEFT_OFFSET}px`;

        // Apply the Google colors directly
        if (event.calendarBackgroundColor) {
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
        // Resolve locale and time format in parallel
        const [locale, timeFormat] = await Promise.all([
            typeof window.getCurrentLocale === 'function' ? window.getCurrentLocale() : Promise.resolve('en'),
            typeof window.getTimeFormatPreference === 'function' ? window.getTimeFormatPreference() : Promise.resolve('24h')
        ]);

        // Build HH:mm
        const startHours = String(startDate.getHours()).padStart(2, '0');
        const startMinutes = String(startDate.getMinutes()).padStart(2, '0');
        const timeString = `${startHours}:${startMinutes}`;

        const formattedTime = window.formatTime(timeString, { format: timeFormat, locale });

        // Display time and title without attendance status
        eventDiv.innerHTML = '';
        const timeSpan = document.createElement('span');
        timeSpan.className = 'event-time';
        timeSpan.textContent = `${formattedTime} - `;
        eventDiv.appendChild(timeSpan);
        const titleSpan = document.createElement('span');
        titleSpan.className = 'event-title';
        titleSpan.textContent = summary;
        eventDiv.appendChild(titleSpan);
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
        const eventDiv = document.createElement('div');
        eventDiv.className = 'event local-event';
        eventDiv.title = title;

        // Set the time on the target date
        const [startHours, startMinutes] = startTime.split(':');
        const [endHours, endMinutes] = endTime.split(':');
        
        const startDate = createTimeOnDate(this.currentTargetDate, parseInt(startHours), parseInt(startMinutes));
        const endDate = createTimeOnDate(this.currentTargetDate, parseInt(endHours), parseInt(endMinutes));

        // Add time information to data attributes
        eventDiv.dataset.startTime = startTime;
        eventDiv.dataset.endTime = endTime;

        // Calculate position in 24-hour coordinate system (convert minutes from 0:00 to pixels)
        const startOffset = (startDate.getHours() * 60 + startDate.getMinutes());
        const duration = (endDate.getTime() - startDate.getTime()) / TIME_CONSTANTS.MINUTE_MILLIS;

        // Apply duration-based styling
        applyDurationBasedStyling(eventDiv, duration, 'event local-event');

        eventDiv.style.top = `${startOffset}px`;

        // Set the initial width and position to prevent visible resize during layout calculation
        // This will be overridden by EventLayoutManager, but prevents initial flash
        const initialWidth = this.eventLayoutManager.maxWidth;
        eventDiv.style.width = `${initialWidth}px`;

        eventDiv.style.left = `${EVENT_STYLING.DEFAULT_VALUES.INITIAL_LEFT_OFFSET}px`;

        // Check if this is a recurring event
        const isRecurring = event.isRecurringInstance || (event.recurrence && event.recurrence.type !== RECURRENCE_TYPES.NONE);

        // Set locale-aware time display asynchronously
        await this._setLocalEventContentWithLocale(eventDiv, startTime, endTime, title, isRecurring);

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
     * @private
     */
    async _setLocalEventContentWithLocale(eventDiv, startTime, endTime, title, isRecurring = false) {
        // Resolve locale and time format in parallel
        const [locale, timeFormat] = await Promise.all([
            typeof window.getCurrentLocale === 'function' ? window.getCurrentLocale() : Promise.resolve('en'),
            typeof window.getTimeFormatPreference === 'function' ? window.getTimeFormatPreference() : Promise.resolve('24h')
        ]);

        const formatOne = (t) => window.formatTime(t, { format: timeFormat, locale });

        const formattedStart = formatOne(startTime);
        const formattedEnd = formatOne(endTime);
        const sep = locale === 'en' ? ' - ' : '～';
        const formattedTimeRange = `${formattedStart}${sep}${formattedEnd}`;

        // Clear existing content
        eventDiv.innerHTML = '';

        // Add recurrence indicator if this is a recurring event
        if (isRecurring) {
            const icon = document.createElement('i');
            icon.className = 'fa-solid fa-repeat';
            icon.style.cssText = 'margin-right: 4px; font-size: 0.85em;';
            eventDiv.appendChild(icon);
        }

        // Add text content
        const timeSpan = document.createElement('span');
        timeSpan.className = 'event-time';
        timeSpan.textContent = `${formattedTimeRange}: `;
        eventDiv.appendChild(timeSpan);
        const titleSpan = document.createElement('span');
        titleSpan.className = 'event-title';
        titleSpan.textContent = title;
        eventDiv.appendChild(titleSpan);
    }

    /**
     * Setup event edit functionality
     * @private
     */
    _setupEventEdit(eventDiv, event) {
        eventDiv.addEventListener('click', () => {
            // Use the callback to notify the parent component
            if (this.onEventClick) {
                this.onEventClick(event);
            }
        });
    }


}
