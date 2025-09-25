/**
 * SideTimeTable - Event Management Module
 *
 * This file manages Google Calendar events and local events.
 */

import {
    loadLocalEvents,
    loadLocalEventsForDate,
    loadSettings,
    logError,
    saveLocalEvents,
    showAlertModal,
    TIME_CONSTANTS
} from '../lib/utils.js';
import {createTimeOnDate} from '../lib/time-utils.js';
import {getDemoEvents, getDemoLocalEvents, isDemoMode} from '../lib/demo-data.js';

/**
 * GoogleEventManager - Google event management class
 */
export class GoogleEventManager {
    /**
     * Constructor
     * @param {Object} timeTableManager - Instance of timetable manager
     * @param {HTMLElement} googleEventsDiv - DOM element for displaying Google events
     * @param {Object} eventLayoutManager - Instance of event layout manager
     */
    constructor(timeTableManager, googleEventsDiv, eventLayoutManager) {
        this.timeTableManager = timeTableManager;
        this.googleEventsDiv = googleEventsDiv;
        this.eventLayoutManager = eventLayoutManager;
        this.isGoogleIntegrated = false;
        this.lastFetchDate = null; // Last date when API was called
        this.currentFetchPromise = null; // Currently executing fetch Promise
    }

    /**
     * Apply Google integration settings
     * @param {boolean} isIntegrated - Whether Google integration is enabled
     */
    setGoogleIntegration(isIntegrated) {
        this.isGoogleIntegrated = isIntegrated;
    }

    /**
     * Fetch events from Google Calendar
     * @param {Date} targetDate - Target date (today if omitted)
     */
    async fetchEvents(targetDate = null) {
        // Dynamically check current settings
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

        // Check for duplicate call restriction on same date
        const targetDay = targetDate || new Date();
        const targetDateStr = targetDay.toDateString(); // Compare by date string

        if (this.lastFetchDate === targetDateStr && this.currentFetchPromise) {
            return this.currentFetchPromise; // Return existing Promise
        }

        this.lastFetchDate = targetDateStr;

        // Fetch events (use Google colors directly)
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
                // Clear previous display
                this.googleEventsDiv.innerHTML = '';

                // Remove only Google events from layout manager
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

                // Check existence of events property
                if (!response.events || !Array.isArray(response.events) || response.events.length === 0) {
                    return;
                }

                await this._processEvents(response.events);

                // Calculate and apply event layout
                if (this.eventLayoutManager && typeof this.eventLayoutManager.calculateLayout === 'function') {
                    this.eventLayoutManager.calculateLayout();
                }
            })
            .catch(error => {
                logError('Google event fetch exception', error);
            })
            .finally(() => {
                // Clear Promise when request completes
                this.currentFetchPromise = null;
            });

        return this.currentFetchPromise;
    }

    /**
     * Process and display demo events
     * @private
     */
    async _processDemoEvents() {
        return new Promise(async (resolve) => {
            // Clear previous display
            this.googleEventsDiv.innerHTML = '';

            // Remove only Google events from layout manager
            const events = [...this.eventLayoutManager.events];
            events.forEach(event => {
                if (event && event.type === 'google') {
                    this.eventLayoutManager.removeEvent(event.id);
                }
            });

            // Get demo events
            const demoEvents = await getDemoEvents();
            
            await this._processEvents(demoEvents);

            // Calculate and apply event layout
            this.eventLayoutManager.calculateLayout();
            
            resolve();
        });
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
                        continue;
                }
            } catch (error) {
                console.error(`Error occurred during processing event ${i}:`, error);
            }
        }
    }


    /**
     * Create Google event element
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

        // If start and end times are the same, treat as 15-minute appointment
        if (startDate.getTime() >= endDate.getTime()) {
            endDate = new Date(startDate.getTime() + 15 * 60 * 1000); // Add 15 minutes
        }

        // Add time information to data attributes
        eventDiv.dataset.startTime = startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        eventDiv.dataset.endTime = endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // Save event detail data
        eventDiv.dataset.description = event.description || '';
        eventDiv.dataset.location = event.location || '';
        eventDiv.dataset.hangoutLink = event.hangoutLink || '';

        // Add click event (using new modal component)
        eventDiv.addEventListener('click', () => {
            // Get googleEventModal from parent SidePanelUIController
            const sidePanelController = window.sidePanelController;
            if (sidePanelController && sidePanelController.googleEventModal) {
                sidePanelController.googleEventModal.showEvent(event);
            }
        });

        // Calculate position in 24-hour coordinate system (convert minutes from 0:00 to pixels)
        const startOffset = (startDate.getHours() * 60 + startDate.getMinutes());
        const duration = (endDate - startDate) / TIME_CONSTANTS.MINUTE_MILLIS;

        if (duration < 30) {
            eventDiv.className = 'event google-event short'; // Reduce padding for events less than 30 minutes
            eventDiv.style.height = `${duration}px`; // Don't subtract padding
        } else {
            eventDiv.style.height = `${duration - 10}px`; // Subtract padding
        }

        eventDiv.style.top = `${startOffset}px`;
        
        // Apply Google colors directly
        if (event.calendarBackgroundColor) {
            eventDiv.style.backgroundColor = event.calendarBackgroundColor;
            eventDiv.style.color = event.calendarForegroundColor;
        }
        
        // Set locale-aware time display asynchronously (with attendee information)
        await this._setEventContentWithLocale(eventDiv, startDate, event.summary, event);

        this.googleEventsDiv.appendChild(eventDiv);

        // Register with event layout manager
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
     * @param {HTMLElement} eventDiv - Event element
     * @param {Date} startDate - Start time
     * @param {string} summary - Event title
     * @param {Object} event - Full event information
     * @private
     */
    async _setEventContentWithLocale(eventDiv, startDate, summary, event) {
        try {
            // Get current locale
            const locale = await window.getCurrentLocale();

            // Format time in locale format
            const startHours = String(startDate.getHours()).padStart(2, '0');
            const startMinutes = String(startDate.getMinutes()).padStart(2, '0');
            const timeString = `${startHours}:${startMinutes}`;

            const formattedTime = window.formatTimeForLocale(timeString, locale);

            // Show additional information if attendee information is available
            let displayText = `${formattedTime} - ${summary}`;

            if (event.attendees && event.attendees.length > 0) {
                // Check own attendance status
                const myStatus = this._getMyAttendanceStatus(event.attendees);
                if (myStatus) {
                    const statusIcon = this._getStatusIcon(myStatus);
                    displayText = `${formattedTime} ${statusIcon} ${summary}`;
                }
            }

            eventDiv.textContent = displayText;
        } catch (error) {
            // Use traditional display method in case of error
            console.warn('Locale time format error:', error);
            eventDiv.textContent = `${startDate.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
            })} - ${summary}`;
        }
    }

    /**
     * Get own attendance status
     * @param {Array} attendees - Attendees array
     * @returns {string|null} Attendance status
     * @private
     */
    _getMyAttendanceStatus(attendees) {
        // Simple implementation: return status of first attendee
        // In practice, need to match against current user's email address
        return attendees[0]?.responseStatus || null;
    }

    /**
     * Get icon according to status
     * @param {string} status - Attendance status
     * @returns {string} Icon character
     * @private
     */
    _getStatusIcon(status) {
        switch (status) {
            case 'accepted':
                return '✅';
            case 'declined':
                return '❌';
            case 'tentative':
                return '❓';
            default:
                return '⚪';
        }
    }


}

/**
 * LocalEventManager - Local event management class
 */
export class LocalEventManager {
    /**
     * Constructor
     * @param {Object} timeTableManager - Instance of timetable manager
     * @param {HTMLElement} localEventsDiv - DOM element for displaying local events
     * @param {Object} eventLayoutManager - Instance of event layout manager
     */
    constructor(timeTableManager, localEventsDiv, eventLayoutManager) {
        this.timeTableManager = timeTableManager;
        this.localEventsDiv = localEventsDiv;
        this.eventLayoutManager = eventLayoutManager;
        this.eventDialogElements = null;
        this.alertModalElements = null;
        this.currentTargetDate = new Date(); // Currently displayed date
    }

    /**
     * Set dialog elements
     * @param {Object} elements - Dialog-related elements
     */
    setDialogElements(elements) {
        this.eventDialogElements = elements;
    }

    /**
     * Set alert modal elements
     * @param {Object} elements - Alert modal-related elements
     */
    setAlertModalElements(elements) {
        this.alertModalElements = elements;
    }

    /**
     * Load local events
     * @param {Date} targetDate - Target date (today if omitted)
     */
    async loadLocalEvents(targetDate = null) {
        // Update target date
        this.currentTargetDate = targetDate || new Date();
        
        this.localEventsDiv.innerHTML = ''; // Clear previous display

        // Use mock data in demo mode
        if (isDemoMode()) {
            const demoEvents = await getDemoLocalEvents();

            for (const event of demoEvents) {
                try {
                    const eventDiv = await this._createEventDiv(event.title, event.startTime, event.endTime);
                    this.localEventsDiv.appendChild(eventDiv);
                } catch (error) {
                    logError('Demo event display', error);
                }
            }
            return;
        }

        const loadFunction = targetDate ? 
            () => loadLocalEventsForDate(targetDate) : 
            () => loadLocalEvents();
            
        loadFunction()
            .then(async events => {

                for (const event of events) {
                    try {
                        const eventDiv = await this._createEventDiv(event.title, event.startTime, event.endTime);
                        this.localEventsDiv.appendChild(eventDiv);
                    } catch (error) {
                        logError('Event display', error);
                    }
                }

                // Note: Layout calculation is done in side_panel.js, so not done here
            })
            .catch(error => {
                logError('Local event loading', error);
            });
    }

    /**
     * Create event element
     * @private
     */
    async _createEventDiv(title, startTime, endTime) {
        const eventDiv = document.createElement('div');
        eventDiv.className = 'event local-event';
        eventDiv.title = title;

        // Set time on target date
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

        if (duration < 30) {
            eventDiv.className = 'event local-event short';
            eventDiv.style.height = `${duration}px`;
        } else {
            eventDiv.style.height = `${duration - 10}px`;
        }

        eventDiv.style.top = `${startOffset}px`;
        
        // Set locale-aware time display asynchronously
        await this._setLocalEventContentWithLocale(eventDiv, startTime, endTime, title);

        // Setup edit functionality
        this._setupEventEdit(eventDiv, {title, startTime, endTime});

        // Register with event layout manager
        this.eventLayoutManager.registerEvent({
            startTime: startDate,
            endTime: endDate,
            element: eventDiv,
            type: 'local',
            title: title,
            id: `local-${title}-${startTime}-${endTime}`
        });

        return eventDiv;
    }

    /**
     * Set local event content with locale-aware time display
     * @param {HTMLElement} eventDiv - Event element
     * @param {string} startTime - Start time (HH:mm format)
     * @param {string} endTime - End time (HH:mm format)
     * @param {string} title - Event title
     * @private
     */
    async _setLocalEventContentWithLocale(eventDiv, startTime, endTime, title) {
        try {
            // Get current locale
            const locale = await window.getCurrentLocale();
            
            // Format time range in locale format
            const formattedTimeRange = window.formatTimeRangeForLocale(startTime, endTime, locale);
            eventDiv.textContent = `${formattedTimeRange}: ${title}`;
        } catch (error) {
            // Use traditional display method in case of error
            console.warn('Locale time format error:', error);
            eventDiv.textContent = `${startTime} - ${endTime}: ${title}`;
        }
    }

    /**
     * Setup event edit functionality
     * @private
     */
    _setupEventEdit(eventDiv, event) {
        if (!this.eventDialogElements) return;

        const elements = this.eventDialogElements;

        eventDiv.addEventListener('click', () => {
            // Display edit dialog
            elements.dialog.style.display = 'flex';

            // Set existing event information in form
            elements.titleInput.value = event.title;
            elements.startTimeInput.value = event.startTime;
            elements.endTimeInput.value = event.endTime;

            // Process when save button is clicked
            elements.saveButton.onclick = () => {
                this._handleEventUpdate(event);
            };

            // Process when delete button is clicked
            elements.deleteButton.onclick = () => {
                this._handleEventDelete(event);
            };
        });
    }

    /**
     * Handle event update
     * @private
     */
    _handleEventUpdate(originalEvent) {
        if (!this.eventDialogElements) return;

        const elements = this.eventDialogElements;
        const newTitle = elements.titleInput.value;
        const newStartTime = elements.startTimeInput.value;
        const newEndTime = elements.endTimeInput.value;

        if (newTitle && newStartTime && newEndTime) {
            loadLocalEvents()
                .then(localEvents => {
                    // Find and update original event
                    const eventIndex = localEvents.findIndex(e => 
                        e.title === originalEvent.title && 
                        e.startTime === originalEvent.startTime && 
                        e.endTime === originalEvent.endTime
                    );

                    if (eventIndex !== -1) {
                        localEvents[eventIndex] = {
                            title: newTitle,
                            startTime: newStartTime,
                            endTime: newEndTime
                        };

                        return saveLocalEvents(localEvents);
                    }
                })
                .then(() => {
                    this._showAlertModal(chrome.i18n.getMessage("eventUpdated") || 'Event updated');
                    this.loadLocalEvents(); // Update event display
                })
                .catch(error => {
                    logError('Event update', error);
                    this._showAlertModal('Failed to update event');
                })
                .finally(() => {
                    elements.dialog.style.display = 'none';
                });
        } else {
            this._showAlertModal(chrome.i18n.getMessage("fillAllFields") || 'Please fill in all fields');
        }
    }

    /**
     * Handle event deletion
     * @private
     */
    _handleEventDelete(event) {
        if (confirm(chrome.i18n.getMessage("confirmDeleteEvent") || 'Delete this event?')) {
            // Generate event ID
            const eventId = `local-${event.title}-${event.startTime}-${event.endTime}`;

            loadLocalEvents()
                .then(localEvents => {
                    // Exclude target event
                    const updatedEvents = localEvents.filter(e => 
                        !(e.title === event.title && 
                          e.startTime === event.startTime && 
                          e.endTime === event.endTime)
                    );

                    return saveLocalEvents(updatedEvents);
                })
                .then(() => {
                    this._showAlertModal(chrome.i18n.getMessage("eventDeleted") || 'Event deleted');

                    // Update event display (remove DOM elements)
                    const eventElements = this.localEventsDiv.querySelectorAll('.local-event');
                    for (const element of eventElements) {
                        if (element.textContent.includes(`${event.startTime} - ${event.endTime}: ${event.title}`)) {
                            element.remove();
                            break;
                        }
                    }

                    // Remove from event layout manager and recalculate layout
                    this.eventLayoutManager.removeEvent(eventId);
                    this.eventLayoutManager.calculateLayout();
                })
                .catch(error => {
                    logError('Event deletion', error);
                    this._showAlertModal('Failed to delete event');
                })
                .finally(() => {
                    if (this.eventDialogElements) {
                        this.eventDialogElements.dialog.style.display = 'none';
                    }
                });
        }
    }

    /**
     * Add new event
     */
    addNewEvent() {
        if (!this.eventDialogElements) return;

        const elements = this.eventDialogElements;
        const title = elements.titleInput.value;
        const startTime = elements.startTimeInput.value;
        const endTime = elements.endTimeInput.value;

        if (title && startTime && endTime) {
            loadLocalEvents()
                .then(localEvents => {
                    // Add new event
                    localEvents.push({title, startTime, endTime});
                    return saveLocalEvents(localEvents);
                })
                .then(async () => {
                    // Create and display event element
                    const eventDiv = await this._createEventDiv(title, startTime, endTime);
                    this.localEventsDiv.appendChild(eventDiv);

                    // Recalculate event layout
                    this.eventLayoutManager.calculateLayout();

                    this._showAlertModal(chrome.i18n.getMessage("eventSaved") || 'Event saved');
                })
                .catch(error => {
                    logError('Event addition', error);
                    this._showAlertModal('Failed to save event');
                })
                .finally(() => {
                    elements.dialog.style.display = 'none';
                });
        } else {
            this._showAlertModal(chrome.i18n.getMessage("fillAllFields") || 'Please fill in all fields');
        }
    }

    /**
     * Display alert modal
     * @private
     */
    _showAlertModal(message) {
        if (this.alertModalElements) {
            const { modal, messageElement, closeButton } = this.alertModalElements;
            showAlertModal(message, modal, messageElement, closeButton);
        } else {
            alert(message);
        }
    }
}
