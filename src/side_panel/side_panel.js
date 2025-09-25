/**
 * SideTimeTable - Side Panel Timetable Management (Component Version)
 */

import {
    SidePanelComponentManager,
    HeaderComponent,
    TimelineComponent,
    LocalEventModal,
    GoogleEventModal,
    AlertModal
} from './components/index.js';

import { EventLayoutManager } from './time-manager.js';
import { GoogleEventManager, LocalEventManager } from './event-handlers.js';
import { generateTimeList, loadSettings, logError } from '../lib/utils.js';
import { isToday } from '../lib/time-utils.js';
import { isDemoMode, setDemoMode } from '../lib/demo-data.js';
import { AlarmManager } from '../lib/alarm-manager.js';

// Reload message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "reloadSideTimeTable") {
        location.reload();
        sendResponse({ success: true });
    }
    return true;
});

/**
 * SidePanelUIController - Component-based UI management class
 */
class SidePanelUIController {
    constructor() {
        // Component management
        this.componentManager = new SidePanelComponentManager();

        // Individual component references
        this.headerComponent = null;
        this.timelineComponent = null;
        this.localEventModal = null;
        this.googleEventModal = null;
        this.alertModal = null;

        // State management
        this.currentDate = new Date();
        this.currentDate.setHours(0, 0, 0, 0);
        this.updateInterval = null;
        this.loadEventsDebounceTimeout = null;
    }

    /**
     * Initialize
     */
    async initialize() {
        try {
            // Check demo mode via URL parameter
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('demo') === 'true') {
                setDemoMode(true);
            }

            // Remove existing DOM elements (prevent duplicates)
            this._removeExistingElements();

            // Create and register components
            await this._createComponents();

            // Initialize existing manager classes
            await this._initializeManagers();

            // Set up event listeners
            this._setupEventListeners();

            // Load initial data
            await this._loadInitialData();

            // Start periodic updates
            this._startPeriodicUpdate();


        } catch (error) {
            console.error('Side panel UI initialization error:', error);
            this._showError('Error occurred during initialization: ' + error.message);
        }
    }

    /**
     * Remove existing DOM elements (prevent duplicates)
     * @private
     */
    _removeExistingElements() {
        // Remove existing header element
        const existingHeader = document.getElementById('sideTimeTableHeaderWrapper');
        if (existingHeader) {
            existingHeader.remove();
        }

        // Remove existing timetable element
        const existingTimeTable = document.getElementById('sideTimeTable');
        if (existingTimeTable) {
            existingTimeTable.remove();
        }

        // Remove existing modal elements
        const existingModals = [
            'localEventDialog',
            'googleEventDialog',
            'alertModal'
        ];

        existingModals.forEach(modalId => {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.remove();
            }
        });

        // Remove current time line element
        const existingTimeLine = document.getElementById('currentTimeLine');
        if (existingTimeLine) {
            existingTimeLine.remove();
        }

        // Remove other potentially duplicate elements
        const duplicateElements = document.querySelectorAll('[id*="sideTimeTable"], [id*="EventDialog"], [id*="Modal"]');
        duplicateElements.forEach(element => {
            if (element.id !== 'time-list') { // Keep time-list
                element.remove();
            }
        });
    }

    /**
     * Create and register components
     * @private
     */
    async _createComponents() {
        // Header component
        this.headerComponent = new HeaderComponent({
            onAddEvent: () => this._handleAddLocalEvent(),
            onDateChange: (date) => this._handleDateChange(date),
            onSettingsClick: () => this._openSettings()
        });

        // Timeline component
        this.timelineComponent = new TimelineComponent({
            showCurrentTimeLine: true
        });

        // Modal components
        this.localEventModal = new LocalEventModal({
            onSave: (eventData, mode) => this._handleSaveLocalEvent(eventData, mode),
            onDelete: (event) => this._handleDeleteLocalEvent(event),
            onCancel: () => this._handleCancelLocalEvent()
        });

        this.googleEventModal = new GoogleEventModal();

        this.alertModal = new AlertModal();

        // Register with component manager
        this.componentManager.register('header', this.headerComponent);
        this.componentManager.register('timeline', this.timelineComponent);
        this.componentManager.register('localEventModal', this.localEventModal);
        this.componentManager.register('googleEventModal', this.googleEventModal);
        this.componentManager.register('alertModal', this.alertModal);

        // Add to DOM
        const container = document.getElementById('side-panel-container') || document.body;
        this.headerComponent.appendTo(container);
        this.timelineComponent.appendTo(container);
        this.localEventModal.appendTo(container);
        this.googleEventModal.appendTo(container);
        this.alertModal.appendTo(container);

        // Initialize all components
        this.componentManager.initializeAll();

        // Reinitialize managers after component initialization
        await this._reinitializeManagers();
    }

    /**
     * Reinitialize managers after component initialization
     * @private
     */
    async _reinitializeManagers() {
        // Reinitialize managers when DOM elements definitely exist
        const timeTableBase = document.getElementById('sideTimeTableBase');

        if (timeTableBase) {
            // Recreate EventLayoutManager
            const { EventLayoutManager } = await import('./time-manager.js');
            this.eventLayoutManager = new EventLayoutManager(timeTableBase);

            // Update eventLayoutManager of event managers
            if (this.googleEventManager) {
                this.googleEventManager.eventLayoutManager = this.eventLayoutManager;
            }
            if (this.localEventManager) {
                this.localEventManager.eventLayoutManager = this.eventLayoutManager;

                // Set event click callback
                this.localEventManager.setEventClickCallback((event) => {
                    this.localEventModal.showEdit(event);
                });
            }
        }
    }

    /**
     * Initialize existing manager classes
     * @private
     */
    async _initializeManagers() {
        // Generate time list
        generateTimeList();

        // Initialize event managers
        const { GoogleEventManager, LocalEventManager } = await import('./event-handlers.js');
        const { EventLayoutManager } = await import('./time-manager.js');

        // Initialize layout manager
        const timeTableBase = document.getElementById('sideTimeTableBase') || this.timelineComponent.element?.querySelector('.side-time-table-base');
        this.eventLayoutManager = new EventLayoutManager(timeTableBase);

        // Initialize Google event manager
        this.googleEventManager = new GoogleEventManager(
            null, // timeTableManager not used so null
            this.timelineComponent.getGoogleEventsContainer(),
            this.eventLayoutManager
        );

        // Initialize local event manager
        this.localEventManager = new LocalEventManager(
            null, // timeTableManager not used so null
            this.timelineComponent.getLocalEventsContainer(),
            this.eventLayoutManager
        );

        // Set event click callback
        this.localEventManager.setEventClickCallback((event) => {
            this.localEventModal.showEdit(event);
        });

        // Load settings and apply initial configuration
        await this._applyInitialSettings();
    }

    /**
     * Apply initial configuration
     * @private
     */
    async _applyInitialSettings() {
        try {
            const settings = await loadSettings();

            // Set work time background
            if (settings.openTime && settings.closeTime && settings.workTimeColor) {
                this.timelineComponent.setWorkTimeBackground(
                    settings.openTime,
                    settings.closeTime,
                    settings.workTimeColor
                );
            }

            // Set CSS variables
            if (settings.workTimeColor) {
                document.documentElement.style.setProperty('--side-calendar-work-time-color', settings.workTimeColor);
            }
            if (settings.localEventColor) {
                document.documentElement.style.setProperty('--side-calendar-local-event-color', settings.localEventColor);
            }
            if (settings.googleEventColor) {
                document.documentElement.style.setProperty('--side-calendar-google-event-color', settings.googleEventColor);
            }

            // Set current date
            this.headerComponent.setCurrentDate(this.currentDate);

        } catch (error) {
            console.warn('Failed to apply initial configuration:', error);
        }
    }

    /**
     * Set up event listeners
     * @private
     */
    _setupEventListeners() {
        // Resize event
        const resizeObserver = new ResizeObserver(() => {
            this._handleResize();
        });

        if (this.timelineComponent.element) {
            resizeObserver.observe(this.timelineComponent.element);
        }

        // Localization
        this._setupLocalization();
    }

    /**
     * Set up localization
     * @private
     */
    _setupLocalization() {
        if (window.localizeElementText) {
            // Initial localization
            window.localizeElementText(document.body);

            // Component localization
            this.componentManager.localizeAll();
        }
    }

    /**
     * Load initial data
     * @private
     */
    async _loadInitialData() {
        // Set initial date to TimelineComponent
        this.timelineComponent.setCurrentDate(this.currentDate);

        await this._loadEventsForCurrentDate();
        this._scrollToAppropriateTime();
    }

    /**
     * Load events for current date
     * @private
     */
    async _loadEventsForCurrentDate() {
        try {
            // Clear existing events (prevent duplicates)
            this.timelineComponent.clearAllEvents();
            if (this.eventLayoutManager) {
                this.eventLayoutManager.clearAllEvents();
            }

            // Load Google events and local events via Manager classes
            const [localResult, googleResult] = await Promise.allSettled([
                this.localEventManager.loadLocalEvents(this.currentDate),
                this.googleEventManager.fetchEvents(this.currentDate)
            ]);

            // Log results
            if (localResult.status === 'fulfilled') {
            }

        } catch (error) {
            console.error('Event loading error:', error);
        }
    }


    /**
     * Scroll to appropriate time
     * @private
     */
    _scrollToAppropriateTime() {
        if (isToday(this.currentDate)) {
            // For today, scroll to current time
            this.timelineComponent.scrollToCurrentTime();
        } else {
            // For other dates, scroll to work start time
            loadSettings().then(settings => {
                if (settings.openTime) {
                    this.timelineComponent.scrollToWorkTime(settings.openTime);
                }
            }).catch(console.warn);
        }
    }

    /**
     * Start periodic updates
     * @private
     */
    _startPeriodicUpdate() {
        // Current time lines are auto-updated by each component,
        // so here we only monitor date changes
        this.updateInterval = setInterval(() => {
            const now = new Date();
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // When date has changed
            if (!isToday(this.currentDate) && isToday(today)) {
                this.currentDate = today;
                this.headerComponent.setCurrentDate(this.currentDate);
                this._loadEventsForCurrentDate();
            }
        }, 60000); // Check every minute
    }

    /**
     * Date change handler
     * @private
     */
    _handleDateChange(date) {
        this.currentDate = new Date(date);
        this.currentDate.setHours(0, 0, 0, 0);

        // Immediately remove old date events
        this.timelineComponent.clearAllEvents();

        // Clear EventLayoutManager state as well
        if (this.eventLayoutManager) {
            this.eventLayoutManager.clearAllEvents();
        }

        // Set date to TimelineComponent
        this.timelineComponent.setCurrentDate(this.currentDate);

        // Reload events
        this._debounceLoadEvents();

        // Update current time line display
        this.timelineComponent.setCurrentTimeLineVisible(isToday(this.currentDate));

        // Adjust scroll position
        this._scrollToAppropriateTime();
    }

    /**
     * Local event addition handler
     * @private
     */
    _handleAddLocalEvent() {
        // Set default time based on current time
        const now = new Date();
        const startTime = `${String(now.getHours()).padStart(2, '0')}:${String(Math.floor(now.getMinutes() / 15) * 15).padStart(2, '0')}`;
        const endHour = now.getHours() + 1;
        const endTime = `${String(endHour).padStart(2, '0')}:${String(Math.floor(now.getMinutes() / 15) * 15).padStart(2, '0')}`;

        this.localEventModal.showCreate(startTime, endTime);
    }

    /**
     * Local event save handler
     * @private
     */
    async _handleSaveLocalEvent(eventData, mode) {
        try {
            const { loadLocalEventsForDate, saveLocalEventsForDate } = await import('../lib/utils.js');

            if (mode === 'create') {
                // New creation
                const localEvents = await loadLocalEventsForDate(this.currentDate);
                const newEvent = {
                    id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    title: eventData.title,
                    startTime: eventData.startTime,
                    endTime: eventData.endTime,
                    reminder: eventData.reminder !== false
                };
                localEvents.push(newEvent);
                await saveLocalEventsForDate(localEvents, this.currentDate);

                // Set reminder if enabled
                if (newEvent.reminder) {
                    const dateStr = this.getCurrentDateString();
                    await AlarmManager.setReminder(newEvent, dateStr);
                }
            } else if (mode === 'edit') {
                // Edit
                const localEvents = await loadLocalEventsForDate(this.currentDate);
                const eventIndex = localEvents.findIndex(e =>
                    e.title === this.localEventModal.currentEvent.title &&
                    e.startTime === this.localEventModal.currentEvent.startTime &&
                    e.endTime === this.localEventModal.currentEvent.endTime
                );

                if (eventIndex !== -1) {
                    const currentEvent = localEvents[eventIndex];
                    const dateStr = this.getCurrentDateString();

                    // Clear old reminder
                    if (currentEvent.id) {
                        await AlarmManager.clearReminder(currentEvent.id, dateStr);
                    }

                    // Update event data
                    localEvents[eventIndex] = {
                        id: currentEvent.id || `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        title: eventData.title,
                        startTime: eventData.startTime,
                        endTime: eventData.endTime,
                        reminder: eventData.reminder !== false
                    };

                    await saveLocalEventsForDate(localEvents, this.currentDate);

                    // Set new reminder if enabled
                    if (localEvents[eventIndex].reminder) {
                        await AlarmManager.setReminder(localEvents[eventIndex], dateStr);
                    }
                }
            }

            // Reload event display
            await this.localEventManager.loadLocalEvents(this.currentDate);

        } catch (error) {
            console.error('Local event save error:', error);
            this.alertModal.showError('Failed to save event: ' + error.message);
        }
    }

    /**
     * Local event deletion handler
     * @private
     */
    async _handleDeleteLocalEvent(event) {
        try {
            const { loadLocalEventsForDate, saveLocalEventsForDate } = await import('../lib/utils.js');

            const localEvents = await loadLocalEventsForDate(this.currentDate);

            // Find event to delete for reminder cleanup
            const eventToDelete = localEvents.find(e =>
                e.title === event.title &&
                e.startTime === event.startTime &&
                e.endTime === event.endTime
            );

            // Clear reminder if exists
            if (eventToDelete && eventToDelete.id) {
                const dateStr = this.getCurrentDateString();
                await AlarmManager.clearReminder(eventToDelete.id, dateStr);
            }

            const updatedEvents = localEvents.filter(e =>
                !(e.title === event.title &&
                  e.startTime === event.startTime &&
                  e.endTime === event.endTime)
            );

            await saveLocalEventsForDate(updatedEvents, this.currentDate);

            // Reload event display
            await this.localEventManager.loadLocalEvents(this.currentDate);

        } catch (error) {
            console.error('Local event deletion error:', error);
            this.alertModal.showError('Failed to delete event: ' + error.message);
        }
    }

    /**
     * Local event cancel handler
     * @private
     */
    _handleCancelLocalEvent() {
        // No special processing (modal just closes)
    }

    /**
     * Get current date string for event storage
     * @returns {string} Date string in YYYY-MM-DD format
     * @private
     */
    getCurrentDateString() {
        // Use the currently displayed date from timeline, or today if not set
        const targetDate = this.currentDate || new Date();

        // Use local timezone to avoid date shifting issues
        const year = targetDate.getFullYear();
        const month = String(targetDate.getMonth() + 1).padStart(2, '0');
        const day = String(targetDate.getDate()).padStart(2, '0');

        return `${year}-${month}-${day}`;
    }

    /**
     * Open settings screen
     * @private
     */
    _openSettings() {
        try {
            chrome.runtime.openOptionsPage();
        } catch (error) {
            console.warn('Failed to display settings screen:', error);
            // Fallback
            const optionsUrl = chrome.runtime.getURL('src/options/options.html');
            window.open(optionsUrl, '_blank');
        }
    }

    /**
     * Resize handler
     * @private
     */
    _handleResize() {
        // Layout adjustment (no special processing needed in component version)
    }

    /**
     * Debounce event loading
     * @private
     */
    _debounceLoadEvents() {
        if (this.loadEventsDebounceTimeout) {
            clearTimeout(this.loadEventsDebounceTimeout);
        }

        this.loadEventsDebounceTimeout = setTimeout(() => {
            this._loadEventsForCurrentDate();
        }, 300);
    }

    /**
     * Debounce processing
     * @private
     */
    _debounce(func, delay) {
        if (this.debounceTimeout) {
            clearTimeout(this.debounceTimeout);
        }
        this.debounceTimeout = setTimeout(func, delay);
    }

    /**
     * Show error
     * @private
     */
    _showError(message) {
        if (this.alertModal) {
            this.alertModal.showError(message);
        } else {
            console.error(message);
        }
    }

    /**
     * Clean up resources
     */
    destroy() {
        // Stop periodic updates
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }

        // Clear debounce timers
        if (this.loadEventsDebounceTimeout) {
            clearTimeout(this.loadEventsDebounceTimeout);
        }

        if (this.debounceTimeout) {
            clearTimeout(this.debounceTimeout);
        }

        // Clean up EventLayoutManager
        if (this.eventLayoutManager) {
            this.eventLayoutManager.destroy();
            this.eventLayoutManager = null;
        }

        // Destroy all components
        this.componentManager.destroyAll();
    }
}

// Manage instances in global scope
let uiController = null;
let isInitialized = false;

// Initialize on DOMContentLoaded
document.addEventListener('DOMContentLoaded', async () => {
    // Prevent double initialization
    if (isInitialized) {
        console.warn('Side panel is already initialized');
        return;
    }

    try {
        isInitialized = true;
        uiController = new SidePanelUIController();
        await uiController.initialize();

        // Expose for global access
        window.sidePanelController = uiController;

    } catch (error) {
        console.error('Side panel initialization failed:', error);
        isInitialized = false; // Reset on error
    }
});

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    if (uiController) {
        uiController.destroy();
        uiController = null;
        window.sidePanelController = null;
    }
});