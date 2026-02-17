/**
 * SideTimeTable - Side Panel Timetable Management (Component Version)
 */

import {
    SidePanelComponentManager,
    HeaderComponent,
    TimelineComponent,
    LocalEventModal,
    GoogleEventModal,
    AlertModal,
    WhatsNewModal,
    TutorialComponent,
    InitialSetupComponent
} from './components/index.js';

import { EventLayoutManager } from './time-manager.js';
import { GoogleEventManager, LocalEventManager } from './event-handlers.js';
import {
    generateTimeList, loadSettings, logError, RECURRENCE_TYPES,
    loadLocalEventsForDate, saveLocalEventsForDate,
    loadRecurringEvents, saveRecurringEvents,
    addRecurringEventException, deleteRecurringEvent,
    migrateEventDataToLocal
} from '../lib/utils.js';
import { isToday } from '../lib/time-utils.js';
import { isDemoMode, setDemoMode } from '../lib/demo-data.js';
import { AlarmManager } from '../lib/alarm-manager.js';
import { StorageHelper } from '../lib/storage-helper.js';

// The reload message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "reloadSideTimeTable") {
        sendResponse({ success: true });
        location.reload();
    }
});

/**
 * SidePanelUIController - The component-based UI management class
 */
class SidePanelUIController {
    constructor() {
        // The component management
        this.componentManager = new SidePanelComponentManager();

        // The individual component references
        this.headerComponent = null;
        this.timelineComponent = null;
        this.localEventModal = null;
        this.googleEventModal = null;
        this.alertModal = null;
        this.whatsNewModal = null;
        this.tutorialComponent = null;
        this.initialSetupComponent = null;

        // The state management
        this.currentDate = new Date();
        this.currentDate.setHours(0, 0, 0, 0);
        this.updateInterval = null;
        this.loadEventsDebounceTimeout = null;
        this.wasViewingToday = true; // Track if the user was viewing today
    }

    /**
     * Initialize
     */
    async initialize() {
        try {
            // Migrate event data from sync to local storage (one-time)
            await migrateEventDataToLocal();

            // Check the demo mode via the URL parameter
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('demo') === 'true') {
                setDemoMode(true);
            }

            // Remove the existing DOM elements (prevent duplicates)
            this._removeExistingElements();

            // Create and register the components
            await this._createComponents();

            // Initialize the existing manager classes
            await this._initializeManagers();

            // Set up the event listeners
            this._setupEventListeners();

            // Load the initial data
            await this._loadInitialData();

            // Start the periodic updates
            this._startPeriodicUpdate();


        } catch (error) {
            console.error('Side panel UI initialization error:', error);
            this._showError(chrome.i18n.getMessage('initializationError') + ': ' + error.message);
        }
    }

    /**
     * Remove the existing DOM elements (prevent duplicates)
     * @private
     */
    _removeExistingElements() {
        // Remove the existing header element
        const existingHeader = document.getElementById('sideTimeTableHeaderWrapper');
        if (existingHeader) {
            existingHeader.remove();
        }

        // Remove the existing timetable element
        const existingTimeTable = document.getElementById('sideTimeTable');
        if (existingTimeTable) {
            existingTimeTable.remove();
        }

        // Remove the existing modal elements
        const existingModals = [
            'localEventDialog',
            'googleEventDialog',
            'alertModal',
            'whatsNewModal',
            'tutorialOverlay',
            'initialSetupOverlay'
        ];

        existingModals.forEach(modalId => {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.remove();
            }
        });

        // Remove the current time line element
        const existingTimeLine = document.getElementById('currentTimeLine');
        if (existingTimeLine) {
            existingTimeLine.remove();
        }

        // Remove the other potentially duplicate elements
        const duplicateElements = document.querySelectorAll('[id*="sideTimeTable"], [id*="EventDialog"], [id*="Modal"]');
        duplicateElements.forEach(element => {
            if (element.id !== 'time-list') { // Keep time-list
                element.remove();
            }
        });
    }

    /**
     * Create and register the components
     * @private
     */
    async _createComponents() {
        // The header component
        this.headerComponent = new HeaderComponent({
            onAddEvent: () => this._handleAddLocalEvent(),
            onDateChange: (date) => this._handleDateChange(date),
            onSettingsClick: () => this._openSettings(),
            onSyncClick: () => this._handleSyncReminders()
        });

        // The timeline component
        this.timelineComponent = new TimelineComponent({
            showCurrentTimeLine: true
        });

        // The modal components
        this.localEventModal = new LocalEventModal({
            onSave: (eventData, mode) => this._handleSaveLocalEvent(eventData, mode),
            onDelete: (event) => this._handleDeleteLocalEvent(event),
            onCancel: () => this._handleCancelLocalEvent()
        });

        this.googleEventModal = new GoogleEventModal();

        this.alertModal = new AlertModal();

        this.whatsNewModal = new WhatsNewModal();

        this.tutorialComponent = new TutorialComponent({
            onComplete: () => this._onTutorialComplete()
        });

        this.initialSetupComponent = new InitialSetupComponent({
            onComplete: () => this._onSetupComplete()
        });

        // Register with the component manager
        this.componentManager.register('header', this.headerComponent);
        this.componentManager.register('timeline', this.timelineComponent);
        this.componentManager.register('localEventModal', this.localEventModal);
        this.componentManager.register('googleEventModal', this.googleEventModal);
        this.componentManager.register('alertModal', this.alertModal);
        this.componentManager.register('whatsNewModal', this.whatsNewModal);
        this.componentManager.register('tutorial', this.tutorialComponent);
        this.componentManager.register('initialSetup', this.initialSetupComponent);

        // Add to the DOM
        const container = document.getElementById('side-panel-container') || document.body;
        this.headerComponent.appendTo(container);
        this.timelineComponent.appendTo(container);
        this.localEventModal.appendTo(container);
        this.googleEventModal.appendTo(container);
        this.alertModal.appendTo(container);
        this.whatsNewModal.appendTo(container);
        this.tutorialComponent.appendTo(container);
        this.initialSetupComponent.appendTo(container);

        // Initialize all the components
        this.componentManager.initializeAll();

        // Apply localization to dynamically created elements
        if (window.localizeHtmlPageWithLang) {
            await window.localizeHtmlPageWithLang();
        }

        // Reinitialize the managers after component initialization
        await this._reinitializeManagers();
    }

    /**
     * Reinitialize managers after component initialization
     * @private
     */
    async _reinitializeManagers() {
        // Reinitialize the managers when DOM elements definitely exist
        const timeTableBase = document.getElementById('sideTimeTableBase');

        if (timeTableBase) {
            // Recreate the EventLayoutManager
            this.eventLayoutManager = new EventLayoutManager(timeTableBase);

            // Update the eventLayoutManager of event managers
            if (this.googleEventManager) {
                this.googleEventManager.eventLayoutManager = this.eventLayoutManager;
            }
            if (this.localEventManager) {
                this.localEventManager.eventLayoutManager = this.eventLayoutManager;

                // Set the event click callback
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
        // Generate the time list
        const timeListElement = document.getElementById('time-list');
        generateTimeList(timeListElement);

        // Initialize the layout manager
        const timeTableBase = document.getElementById('sideTimeTableBase') || this.timelineComponent.element?.querySelector('.side-time-table-base');
        this.eventLayoutManager = new EventLayoutManager(timeTableBase);

        // Initialize the Google event manager
        this.googleEventManager = new GoogleEventManager(
            null, // timeTableManager not used so null
            this.timelineComponent.getGoogleEventsContainer(),
            this.eventLayoutManager
        );

        // Initialize the local event manager
        this.localEventManager = new LocalEventManager(
            null, // timeTableManager not used so null
            this.timelineComponent.getLocalEventsContainer(),
            this.eventLayoutManager
        );

        // Set the event click callback
        this.localEventManager.setEventClickCallback((event) => {
            this.localEventModal.showEdit(event);
        });

        // Load the settings and apply initial configuration
        await this._applyInitialSettings();
    }

    /**
     * Apply initial configuration
     * @private
     */
    async _applyInitialSettings() {
        try {
            const settings = await loadSettings();

            // Set the work time background
            if (settings.openTime && settings.closeTime && settings.workTimeColor) {
                this.timelineComponent.setWorkTimeBackground(
                    settings.openTime,
                    settings.closeTime,
                    settings.workTimeColor
                );
            }

            // Set the CSS variables
            if (settings.workTimeColor) {
                document.documentElement.style.setProperty('--side-calendar-work-time-color', settings.workTimeColor);
            }
            if (settings.localEventColor) {
                document.documentElement.style.setProperty('--side-calendar-local-event-color', settings.localEventColor);
            }
            if (settings.currentTimeLineColor) {
                document.documentElement.style.setProperty('--side-calendar-current-time-line-color', settings.currentTimeLineColor);
            }

            // Set the current date
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
        // Auto-sync reminders when side panel opens (throttled to 5 minutes)
        this._autoSyncReminders();

        // Set initial date to TimelineComponent
        this.timelineComponent.setCurrentDate(this.currentDate);

        await this._loadEventsForCurrentDate();
        this._scrollToAppropriateTime();

        // Check for update notifications
        await this._checkForUpdateNotification();

        // Show tutorial on first launch, then initial setup
        await this._checkTutorial();
    }

    /**
     * Check if there are unseen updates and show What's New modal
     * @private
     */
    async _checkForUpdateNotification() {
        try {
            const currentVersion = chrome.runtime.getManifest().version;
            const data = await StorageHelper.get(['lastSeenVersion'], {});

            if (!data.lastSeenVersion) {
                // First install - store current version without showing modal
                await StorageHelper.set({ lastSeenVersion: currentVersion });
                return;
            }

            if (data.lastSeenVersion !== currentVersion) {
                this.whatsNewModal.showForVersion(data.lastSeenVersion);
            }
        } catch (error) {
            console.warn('Failed to check for update notification:', error);
        }
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

            // Calculate layout after all events are loaded
            // Disable transitions during initial load to prevent visible resize animation
            if (this.eventLayoutManager) {
                this.eventLayoutManager.calculateLayout(true);
            }

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

            // Only auto-advance to today if the user was previously viewing today
            // This prevents forced switching when the user is intentionally viewing past/future dates
            if (this.wasViewingToday && !isToday(this.currentDate)) {
                this.currentDate = today;
                this.wasViewingToday = true; // Still viewing today after the auto-advance
                this.headerComponent.setCurrentDate(this.currentDate);
                this.timelineComponent.setCurrentDate(this.currentDate);
                this.timelineComponent.setCurrentTimeLineVisible(true);
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

        // Track if the user is viewing today
        this.wasViewingToday = isToday(this.currentDate);

        // Immediately remove the old date events
        this.timelineComponent.clearAllEvents();

        // Clear the EventLayoutManager state as well
        if (this.eventLayoutManager) {
            this.eventLayoutManager.clearAllEvents();
        }

        // Set the date to TimelineComponent
        this.timelineComponent.setCurrentDate(this.currentDate);

        // Reload the events
        this._debounceLoadEvents();

        // Update the current time line display
        this.timelineComponent.setCurrentTimeLineVisible(isToday(this.currentDate));

        // Adjust the scroll position
        this._scrollToAppropriateTime();
    }

    /**
     * Local event addition handler
     * @private
     */
    _handleAddLocalEvent() {
        // Set the default time based on the current time
        const now = new Date();
        const startTime = `${String(now.getHours()).padStart(2, '0')}:${String(Math.floor(now.getMinutes() / 15) * 15).padStart(2, '0')}`;
        const endHour = Math.min(now.getHours() + 1, 23);
        const endMinutes = now.getHours() >= 23 ? 59 : Math.floor(now.getMinutes() / 15) * 15;
        const endTime = `${String(endHour).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;

        this.localEventModal.showCreate(startTime, endTime);
    }

    /**
     * Local event save handler
     * @private
     */
    async _handleSaveLocalEvent(eventData, mode) {
        try {
            const isRecurring = eventData.recurrence && eventData.recurrence.type !== RECURRENCE_TYPES.NONE;

            if (mode === 'create') {
                const newEvent = {
                    id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    title: eventData.title,
                    startTime: eventData.startTime,
                    endTime: eventData.endTime,
                    reminder: eventData.reminder !== false
                };

                if (isRecurring) {
                    // Save as recurring event
                    newEvent.recurrence = eventData.recurrence;
                    const recurringEvents = await loadRecurringEvents();
                    recurringEvents.push(newEvent);
                    await saveRecurringEvents(recurringEvents);
                } else {
                    // Save as date-specific event
                    const localEvents = await loadLocalEventsForDate(this.currentDate);
                    // Filter out recurring instances before adding
                    const nonRecurringEvents = localEvents.filter(e => !e.isRecurringInstance);
                    nonRecurringEvents.push(newEvent);
                    await saveLocalEventsForDate(nonRecurringEvents, this.currentDate);

                    // Set reminder if enabled
                    if (newEvent.reminder) {
                        const dateStr = this.getCurrentDateString();
                        await AlarmManager.setReminder(newEvent, dateStr);
                    }
                }
            } else if (mode === 'edit') {
                const currentEvent = this.localEventModal.currentEvent;

                if (currentEvent.isRecurringInstance || currentEvent.recurrence) {
                    // Editing a recurring event
                    await this._handleEditRecurringEvent(eventData, currentEvent, isRecurring);
                } else {
                    // Edit a regular date-specific event
                    const localEvents = await loadLocalEventsForDate(this.currentDate);
                    // Filter out recurring instances
                    const nonRecurringEvents = localEvents.filter(e => !e.isRecurringInstance);
                    const eventIndex = nonRecurringEvents.findIndex(e => e.id === currentEvent.id);

                    if (eventIndex !== -1) {
                        const existingEvent = nonRecurringEvents[eventIndex];
                        const dateStr = this.getCurrentDateString();

                        // Clear old reminder
                        if (existingEvent.id) {
                            await AlarmManager.clearReminder(existingEvent.id, dateStr);
                        }

                        if (isRecurring) {
                            // Convert to recurring event
                            const newRecurringEvent = {
                                id: existingEvent.id || `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                                title: eventData.title,
                                startTime: eventData.startTime,
                                endTime: eventData.endTime,
                                reminder: eventData.reminder !== false,
                                recurrence: eventData.recurrence
                            };

                            // Remove from date-specific and add to recurring
                            nonRecurringEvents.splice(eventIndex, 1);
                            await saveLocalEventsForDate(nonRecurringEvents, this.currentDate);

                            const recurringEvents = await loadRecurringEvents();
                            recurringEvents.push(newRecurringEvent);
                            await saveRecurringEvents(recurringEvents);
                        } else {
                            // Update as regular event
                            nonRecurringEvents[eventIndex] = {
                                id: existingEvent.id || `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                                title: eventData.title,
                                startTime: eventData.startTime,
                                endTime: eventData.endTime,
                                reminder: eventData.reminder !== false
                            };

                            await saveLocalEventsForDate(nonRecurringEvents, this.currentDate);

                            // Set new reminder if enabled
                            if (nonRecurringEvents[eventIndex].reminder) {
                                await AlarmManager.setReminder(nonRecurringEvents[eventIndex], dateStr);
                            }
                        }
                    }
                }
            }

            // Reload event display
            await this.localEventManager.loadLocalEvents(this.currentDate);

            await this._syncRemindersIfNeeded();

            // Calculate layout after event save/update
            if (this.eventLayoutManager) {
                this.eventLayoutManager.calculateLayout();
            }

        } catch (error) {
            console.error('Local event save error:', error);
            this.alertModal.showError('Failed to save event: ' + error.message);
        }
    }

    /**
     * Handle editing a recurring event
     * @private
     */
    async _handleEditRecurringEvent(eventData, currentEvent, isRecurring) {
        const recurringEvents = await loadRecurringEvents();
        const eventId = currentEvent.originalId || currentEvent.id;
        const eventIndex = recurringEvents.findIndex(e => e.id === eventId);

        if (eventIndex !== -1) {
            // Update the entire series
            recurringEvents[eventIndex] = {
                ...recurringEvents[eventIndex],
                title: eventData.title,
                startTime: eventData.startTime,
                endTime: eventData.endTime,
                reminder: eventData.reminder !== false,
                recurrence: isRecurring ? eventData.recurrence : null
            };

            // If recurrence was removed, convert to date-specific event
            if (!isRecurring) {
                const removedEvent = recurringEvents.splice(eventIndex, 1)[0];
                await saveRecurringEvents(recurringEvents);

                // Create a date-specific event instead
                const localEvents = await loadLocalEventsForDate(this.currentDate);
                const nonRecurringEvents = localEvents.filter(e => !e.isRecurringInstance);
                nonRecurringEvents.push({
                    id: removedEvent.id,
                    title: eventData.title,
                    startTime: eventData.startTime,
                    endTime: eventData.endTime,
                    reminder: eventData.reminder !== false
                });
                await saveLocalEventsForDate(nonRecurringEvents, this.currentDate);
            } else {
                await saveRecurringEvents(recurringEvents);
            }
        }
    }

    /**
     * Local event deletion handler
     * @private
     * @param {Object} event - The event to delete
     * @param {string} deleteType - 'this' for single instance, 'all' for entire series
     */
    async _handleDeleteLocalEvent(event, deleteType = null) {
        try {
            // Check if this is a recurring event
            if (event.isRecurringInstance || event.recurrence) {
                const eventId = event.originalId || event.id;

                if (deleteType === 'all') {
                    // Delete entire series
                    await deleteRecurringEvent(eventId);
                } else {
                    // Delete only this instance (add exception)
                    const dateStr = event.instanceDate || this.getCurrentDateString();
                    await addRecurringEventException(eventId, dateStr);
                }
            } else {
                // Regular date-specific event
                const localEvents = await loadLocalEventsForDate(this.currentDate);
                // Filter out recurring instances
                const nonRecurringEvents = localEvents.filter(e => !e.isRecurringInstance);

                // Clear reminder if exists
                if (event.id) {
                    const dateStr = this.getCurrentDateString();
                    await AlarmManager.clearReminder(event.id, dateStr);
                }

                const updatedEvents = nonRecurringEvents.filter(e => e.id !== event.id);

                await saveLocalEventsForDate(updatedEvents, this.currentDate);
            }

            // Reload event display
            await this.localEventManager.loadLocalEvents(this.currentDate);

            await this._syncRemindersIfNeeded();

            // Calculate layout after event save/update
            if (this.eventLayoutManager) {
                this.eventLayoutManager.calculateLayout();
            }

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
     * Sync reminders for the current date if it's today or in the future.
     * @private
     */
    async _syncRemindersIfNeeded() {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (this.currentDate >= today) {
                await AlarmManager.setDateReminders(this.getCurrentDateString());
            }
        } catch (error) {
            console.error('Failed to sync reminders:', error);
        }
    }

    /**
     * Check if tutorial should be shown on first launch.
     * Tutorial runs first, then initial setup follows via _onTutorialComplete.
     * @private
     */
    async _checkTutorial() {
        try {
            const shouldShow = await this.tutorialComponent.shouldShow();
            if (shouldShow) {
                setTimeout(() => {
                    this.tutorialComponent.start();
                }, 500);
                return;
            }

            // Tutorial already done, check initial setup
            await this._checkInitialSetup();
        } catch (error) {
            console.warn('Failed to check tutorial state:', error);
            await this._checkInitialSetup();
        }
    }

    /**
     * Called when tutorial is completed; show initial setup next.
     * @private
     */
    _onTutorialComplete() {
        this._checkInitialSetup();
    }

    /**
     * Check if initial setup should be shown and start it if needed.
     * @private
     */
    async _checkInitialSetup() {
        try {
            const shouldShowSetup = await this.initialSetupComponent.shouldShow();
            if (shouldShowSetup) {
                setTimeout(() => {
                    this.initialSetupComponent.start();
                }, 300);
            }
        } catch (error) {
            console.warn('Failed to check initial setup state:', error);
        }
    }

    /**
     * Called when initial setup is completed.
     * @private
     */
    _onSetupComplete() {
        // Reload to apply settings (language, work hours, etc.)
        location.reload();
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
     * Handle sync reminders button click
     * @private
     */
    async _handleSyncReminders() {
        try {
            // Send message to background to force sync
            const response = await chrome.runtime.sendMessage({ action: 'forceSyncReminders' });

            if (response.success) {
                // Reload events to reflect any changes
                await this._loadEventsForCurrentDate();

                // Show success feedback (optional)
                // You could add a toast notification here if desired
            } else {
                console.error('Failed to sync reminders:', response.error);
                this.alertModal.showError('Failed to sync reminders: ' + (response.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Sync reminders error:', error);
            this.alertModal.showError('Failed to sync reminders: ' + error.message);
        }
    }

    /**
     * Auto-sync reminders with throttle (side panel open)
     * @private
     */
    async _autoSyncReminders() {
        try {
            // Send message to background to auto-sync with throttle
            const response = await chrome.runtime.sendMessage({ action: 'autoSyncReminders' });

            if (!response.success) {
                console.warn('[Auto Sync] Failed to auto-sync reminders:', response.error);
            }
        } catch (error) {
            console.warn('[Auto Sync] Auto-sync error:', error);
            // Don't show error to user - this is a background operation
        }
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