/**
 * SideTimeTable - Side Panel Timetable Management (Component Version)
 *
 * Business logic delegated to service classes:
 * - EventLoadingService: event loading, debounce, scroll positioning
 * - ReminderService: reminder sync (manual, auto, post-save)
 * - ThemeService: color theme, dark mode, scrollbar settings
 * - AuthService: auth-expired banner and reconnect flow
 * - OnboardingService: tutorial, initial setup, changelog
 * - DateNavigationService: current date state (existing)
 * - LocalEventService: local event CRUD (existing)
 */

import {
    SidePanelComponentManager,
    HeaderComponent,
    TimelineComponent,
    LocalEventModal,
    GoogleEventModal,
    AlertModal,
    WhatsNewModal,
    ReviewModal,
    TutorialComponent,
    InitialSetupComponent,
    MemoComponent
} from './components';

import { AllDayEventsComponent } from './components/timeline/all-day-events-component.js';
import { EventLayoutManager } from './time-manager.js';
import { GoogleEventManager, LocalEventManager } from './event-handlers.js';
import { LocalEventService } from './services/local-event-service.js';
import { DateNavigationService } from './services/date-navigation-service.js';
import { EventLoadingService } from './services/event-loading-service.js';
import { ReminderService } from './services/reminder-service.js';
import { ThemeService } from './services/theme-service.js';
import { AuthService } from './services/auth-service.js';
import { OnboardingService } from './services/onboarding-service.js';
import { generateTimeList } from '../lib/utils.js';
import { loadSettings } from '../lib/settings-storage.js';
import { migrateEventDataToLocal } from '../lib/event-storage.js';
import { cleanupObsoleteStorageKeys } from '../lib/storage-cleanup.js';
import { setDemoMode } from '../lib/demo-data.js';

// The reload message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "reloadSideTimeTable") {
        sendResponse({ success: true });
        location.reload();
    }
    else if (request.action === "calendarSelectionChanged") {
        sendResponse({ success: true });
        const controller = window.sidePanelController;
        if (controller) {
            controller._handleCalendarToggle(request.changeInfo);
        }
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
        this.reviewModal = null;
        this.tutorialComponent = null;
        this.initialSetupComponent = null;
        this.memoComponent = null;

        // Services
        this.localEventService = new LocalEventService();
        this.dateNavService = new DateNavigationService();
        this.eventLoadingService = new EventLoadingService();
        this.reminderService = new ReminderService();
        this.themeService = new ThemeService();
        this.authService = new AuthService();
        this.onboardingService = new OnboardingService();

        // The state management
        this.updateInterval = null;
    }

    /**
     * Initialize
     */
    async initialize() {
        try {
            // Load locale messages based on the user's language setting
            if (window.loadLocalizedMessages) {
                await window.loadLocalizedMessages();
            }

            // Migrate event data from sync to local storage (one-time)
            await migrateEventDataToLocal();

            // Clean up obsolete storage keys
            await cleanupObsoleteStorageKeys();

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
            this._showError((window.getLocalizedMessage?.('initializationError') || 'Initialization error') + ': ' + error.message);
        }
    }

    /**
     * Remove the existing DOM elements (prevent duplicates)
     * @private
     */
    _removeExistingElements() {
        // Remove the existing auth expired banner
        const existingBanner = document.getElementById('authExpiredBanner');
        if (existingBanner) {
            existingBanner.remove();
        }

        // Remove the existing header element
        const existingHeader = document.getElementById('sideTimeTableHeaderWrapper');
        if (existingHeader) {
            existingHeader.remove();
        }

        // Remove the existing all-day events section
        const existingAllDay = document.getElementById('allDayEventsSection');
        if (existingAllDay) {
            existingAllDay.remove();
        }

        // Remove the existing timetable element
        const existingTimeTable = document.getElementById('sideTimeTable');
        if (existingTimeTable) {
            existingTimeTable.remove();
        }

        // Remove the existing memo element
        const existingMemo = document.getElementById('memoPanelWrapper');
        if (existingMemo) {
            existingMemo.remove();
        }

        // Remove the existing modal elements
        const existingModals = [
            'localEventDialog',
            'googleEventDialog',
            'alertModal',
            'whatsNewModal',
            'reviewModal',
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
            showCurrentTimeLine: true,
            onDragCreate: (startTime, endTime) => this._handleAddLocalEvent(startTime, endTime),
            onCalendarChange: (changeInfo) => this._handleCalendarToggle(changeInfo)
        });

        // The all-day events component (between header and timeline)
        this.allDayEventsComponent = new AllDayEventsComponent();

        // The modal components
        this.localEventModal = new LocalEventModal({
            onSave: (eventData, mode) => this._handleSaveLocalEvent(eventData, mode),
            onDelete: (event) => this._handleDeleteLocalEvent(event),
            onCancel: () => this._handleCancelLocalEvent(),
            getCurrentDate: () => this.dateNavService.getDate()
        });

        this.googleEventModal = new GoogleEventModal({
            onRsvpResponse: () => this._loadEventsForCurrentDate()
        });

        this.alertModal = new AlertModal();

        this.whatsNewModal = new WhatsNewModal();

        this.reviewModal = new ReviewModal();

        this.tutorialComponent = new TutorialComponent({
            onComplete: () => this._onTutorialComplete()
        });

        this.initialSetupComponent = new InitialSetupComponent({
            onComplete: () => this._onSetupComplete()
        });

        // Register with the component manager
        this.componentManager.register('header', this.headerComponent);
        this.componentManager.register('allDayEvents', this.allDayEventsComponent);
        this.componentManager.register('timeline', this.timelineComponent);
        this.componentManager.register('localEventModal', this.localEventModal);
        this.componentManager.register('googleEventModal', this.googleEventModal);
        this.componentManager.register('alertModal', this.alertModal);
        this.componentManager.register('whatsNewModal', this.whatsNewModal);
        this.componentManager.register('reviewModal', this.reviewModal);
        this.componentManager.register('tutorial', this.tutorialComponent);
        this.componentManager.register('initialSetup', this.initialSetupComponent);

        this.memoComponent = new MemoComponent();
        this.componentManager.register('memo', this.memoComponent);

        // Add to the DOM
        const container = document.getElementById('side-panel-container') || document.body;
        this.headerComponent.appendTo(container);
        this.allDayEventsComponent.appendTo(container);
        this.timelineComponent.appendTo(container);
        this.memoComponent.appendTo(container);
        this.localEventModal.appendTo(container);
        this.googleEventModal.appendTo(container);
        this.alertModal.appendTo(container);
        this.whatsNewModal.appendTo(container);
        this.reviewModal.appendTo(container);
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
                this.googleEventManager.setAllDayEventsContainer(
                    this.allDayEventsComponent.getContainer()
                );
            }
            if (this.localEventManager) {
                this.localEventManager.eventLayoutManager = this.eventLayoutManager;

                // Set the event click callback
                this.localEventManager.setEventClickCallback((event) => {
                    this.localEventModal.showView(event);
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
            this.timelineComponent.getGoogleEventsContainer(),
            this.eventLayoutManager
        );

        // Set auth expiry callback
        this.googleEventManager.onAuthExpired = () => {
            const container = document.getElementById('side-panel-container') || document.body;
            const insertBeforeEl = this.allDayEventsComponent?.element || this.timelineComponent?.element;
            this.authService.showAuthExpiredBanner(container, insertBeforeEl, () => this._onReconnectSuccess());
        };

        // Set all-day events container
        this.googleEventManager.setAllDayEventsContainer(
            this.allDayEventsComponent.getContainer()
        );

        // Initialize the local event manager
        this.localEventManager = new LocalEventManager(
            this.timelineComponent.getLocalEventsContainer(),
            this.eventLayoutManager
        );

        // Set the event click callback
        this.localEventManager.setEventClickCallback((event) => {
            this.localEventModal.showView(event);
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

            // Apply theme and scrollbar settings via service
            await this.themeService.applyTheme(settings);
            await this.themeService.applyScrollbarSetting(settings);

            // Set the current date
            this.headerComponent.setCurrentDate(this.dateNavService.getDate());

        } catch (error) {
            console.warn('Failed to apply initial configuration:', error);
        }
    }

    /**
     * Set up event listeners
     * @private
     */
    _setupEventListeners() {
        this._setupLocalization();
    }

    /**
     * Set up localization
     * @private
     */
    _setupLocalization() {
        if (window.localizeElementText) {
            window.localizeElementText(document.body);
            this.componentManager.localizeAll();
        }
    }

    /**
     * Load initial data
     * @private
     */
    async _loadInitialData() {
        // Auto-sync reminders when side panel opens (throttled to 5 minutes)
        this.reminderService.autoSyncReminders();

        // Set initial date to TimelineComponent
        this.timelineComponent.setCurrentDate(this.dateNavService.getDate());

        await this._loadEventsForCurrentDate();
        this.eventLoadingService.scrollToAppropriateTime(
            this.dateNavService.isViewingToday(),
            this.timelineComponent
        );

        // Show tutorial on first launch, then initial setup, then changelog
        await this.onboardingService.startOnboardingFlow(
            this.tutorialComponent,
            this.initialSetupComponent,
            this.whatsNewModal
        );

        // Track panel open and show review popup when conditions are met
        await this.reviewModal.trackOpenAndMaybeShow();
    }

    // ── Event loading ────────────────────────────────────────────────

    /**
     * Load events for current date
     * @private
     */
    async _loadEventsForCurrentDate() {
        await this.eventLoadingService.loadEventsForDate(
            this.dateNavService.getDate(),
            this._getEventDeps()
        );
    }

    /**
     * Handle calendar toggle with incremental update
     * @param {Object} changeInfo
     * @private
     */
    async _handleCalendarToggle(changeInfo) {
        await this.eventLoadingService.handleCalendarToggle(
            changeInfo,
            this.dateNavService.getDate(),
            this._getEventDeps(),
            () => this._loadEventsForCurrentDate()
        );
    }

    /**
     * Get dependencies object for event loading service
     * @private
     */
    _getEventDeps() {
        return {
            allDayEventsComponent: this.allDayEventsComponent,
            timelineComponent: this.timelineComponent,
            eventLayoutManager: this.eventLayoutManager,
            localEventManager: this.localEventManager,
            googleEventManager: this.googleEventManager
        };
    }

    // ── Date navigation ──────────────────────────────────────────────

    /**
     * Date change handler
     * @private
     */
    _handleDateChange(date) {
        this.dateNavService.setDate(date);
        const currentDate = this.dateNavService.getDate();

        // Immediately remove the old date events
        this.allDayEventsComponent.clear();
        this.timelineComponent.clearAllEvents();

        if (this.eventLayoutManager) {
            this.eventLayoutManager.clearAllEvents();
        }

        // Set the date to TimelineComponent
        this.timelineComponent.setCurrentDate(currentDate);

        // Reload the events
        this.eventLoadingService.debounceLoadEvents(() => this._loadEventsForCurrentDate());

        // Update the current time line display
        this.timelineComponent.setCurrentTimeLineVisible(this.dateNavService.isViewingToday());

        // Adjust the scroll position
        this.eventLoadingService.scrollToAppropriateTime(
            this.dateNavService.isViewingToday(),
            this.timelineComponent
        );
    }

    // ── Local event CRUD ─────────────────────────────────────────────

    /**
     * Local event addition handler
     * @private
     */
    _handleAddLocalEvent(startTime, endTime) {
        if (!startTime) {
            const now = new Date();
            startTime = `${String(now.getHours()).padStart(2, '0')}:${String(Math.floor(now.getMinutes() / 15) * 15).padStart(2, '0')}`;
            const endHour = Math.min(now.getHours() + 1, 23);
            const endMinutes = now.getHours() >= 23 ? 59 : Math.floor(now.getMinutes() / 15) * 15;
            endTime = `${String(endHour).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
        }
        this.localEventModal.showCreate(startTime, endTime);
    }

    /**
     * Local event save handler
     * @private
     */
    async _handleSaveLocalEvent(eventData, mode) {
        try {
            if (mode === 'create') {
                await this.localEventService.createEvent(eventData, this.dateNavService.getDate());
            } else if (mode === 'edit') {
                const currentEvent = this.localEventModal.currentEvent;
                await this.localEventService.updateEvent(eventData, currentEvent, this.dateNavService.getDate());
            }

            // Reload event display
            await this.localEventManager.loadLocalEvents(this.dateNavService.getDate());

            await this.reminderService.syncRemindersIfNeeded(
                this.dateNavService.getDate(),
                this.dateNavService.getDateString()
            );

            if (this.eventLayoutManager) {
                this.eventLayoutManager.calculateLayout();
            }

        } catch (error) {
            console.error('Local event save error:', error);
            this.alertModal.showError('Failed to save event: ' + error.message);
        }
    }

    /**
     * Local event deletion handler
     * @private
     */
    async _handleDeleteLocalEvent(event, deleteType = null) {
        try {
            await this.localEventService.deleteEvent(event, deleteType, this.dateNavService.getDate());

            await this.localEventManager.loadLocalEvents(this.dateNavService.getDate());

            await this.reminderService.syncRemindersIfNeeded(
                this.dateNavService.getDate(),
                this.dateNavService.getDateString()
            );

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

    // ── Reminders ────────────────────────────────────────────────────

    /**
     * Handle sync reminders button click
     * @private
     */
    async _handleSyncReminders() {
        const result = await this.reminderService.forceSyncReminders();
        if (result.success) {
            await this._loadEventsForCurrentDate();
        } else {
            this.alertModal.showError('Failed to sync reminders: ' + result.error);
        }
    }

    // ── Auth ─────────────────────────────────────────────────────────

    /**
     * Called after successful Google reconnection
     * @private
     */
    async _onReconnectSuccess() {
        if (this.googleEventManager) {
            this.googleEventManager.resetAuthState();
        }
        if (this.timelineComponent?.calendarFilter) {
            this.timelineComponent.calendarFilter.refreshVisibility();
        }
        await this._loadEventsForCurrentDate();
    }

    // ── Onboarding ───────────────────────────────────────────────────

    /**
     * Called when tutorial is completed; show initial setup next.
     * @private
     */
    _onTutorialComplete() {
        this.onboardingService.onTutorialComplete(
            this.initialSetupComponent,
            this.whatsNewModal
        );
    }

    /**
     * Called when initial setup is completed.
     * @private
     */
    _onSetupComplete() {
        location.reload();
    }

    // ── Periodic update ──────────────────────────────────────────────

    /**
     * Start periodic updates
     * @private
     */
    _startPeriodicUpdate() {
        this.updateInterval = setInterval(() => {
            if (this.dateNavService.advanceToTodayIfNeeded()) {
                const currentDate = this.dateNavService.getDate();
                this.headerComponent.setCurrentDate(currentDate);
                this.timelineComponent.setCurrentDate(currentDate);
                this.timelineComponent.setCurrentTimeLineVisible(true);
                this._loadEventsForCurrentDate();
            }
        }, 60000);
    }

    // ── Utilities ────────────────────────────────────────────────────

    /**
     * Get current date string for event storage
     * @returns {string}
     */
    getCurrentDateString() {
        return this.dateNavService.getDateString();
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
            const optionsUrl = chrome.runtime.getURL('src/options/options.html');
            window.open(optionsUrl, '_blank');
        }
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
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }

        this.eventLoadingService.destroy();

        if (this.eventLayoutManager) {
            this.eventLayoutManager.destroy();
            this.eventLayoutManager = null;
        }

        this.componentManager.destroyAll();
    }
}

// Manage instances in global scope
let uiController = null;
let isInitialized = false;

// Initialize on DOMContentLoaded
document.addEventListener('DOMContentLoaded', async () => {
    if (isInitialized) {
        console.warn('Side panel is already initialized');
        return;
    }

    try {
        isInitialized = true;
        uiController = new SidePanelUIController();
        await uiController.initialize();
        window.sidePanelController = uiController;

    } catch (error) {
        console.error('Side panel initialization failed:', error);
        isInitialized = false;
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
