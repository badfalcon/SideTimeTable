/**
 * EventLoadingService - Coordinates loading events from Google and local sources.
 *
 * Manages debounce, stale-request prevention, and scroll positioning.
 * DOM-free: delegates rendering to event managers and components.
 */

import { loadSettings } from '../../lib/settings-storage.js';
import { isDemoMode } from '../../lib/demo-data.js';

export class EventLoadingService {
    constructor() {
        this._debounceTimeout = null;
        this._requestId = 0;
    }

    /**
     * Load events for the given date using the provided managers and components.
     * @param {Date} targetDate
     * @param {Object} deps - Dependencies
     * @param {Object} deps.allDayEventsComponent
     * @param {Object} deps.timelineComponent
     * @param {Object} deps.eventLayoutManager
     * @param {Object} deps.localEventManager
     * @param {Object} deps.googleEventManager
     * @returns {Promise<void>}
     */
    async loadEventsForDate(targetDate, deps) {
        const requestId = ++this._requestId;

        const { allDayEventsComponent, timelineComponent, eventLayoutManager,
                localEventManager, googleEventManager } = deps;

        try {
            // Clear existing events
            allDayEventsComponent.clear();
            timelineComponent.clearAllEvents();
            if (eventLayoutManager) {
                eventLayoutManager.clearAllEvents();
            }

            // Load Google events and local events in parallel
            await Promise.allSettled([
                localEventManager.loadLocalEvents(targetDate),
                googleEventManager.fetchEvents(targetDate)
            ]);

            // Discard results if a newer request has started
            if (requestId !== this._requestId) {
                return;
            }

            // Calculate layout after all events are loaded
            if (eventLayoutManager) {
                eventLayoutManager.calculateLayout(true);
            }

            // Show/hide the all-day events section
            allDayEventsComponent.updateVisibility();

        } catch (error) {
            console.error('Event loading error:', error);
        }
    }

    /**
     * Handle calendar toggle with incremental update.
     * @param {Object} changeInfo
     * @param {Date} targetDate
     * @param {Object} deps
     * @param {Function} fullReloadFn - Fallback full reload function
     * @returns {Promise<void>}
     */
    async handleCalendarToggle(changeInfo, targetDate, deps, fullReloadFn) {
        if (!changeInfo || isDemoMode()) {
            return fullReloadFn();
        }

        const { addedIds = [], removedIds = [] } = changeInfo;

        if (addedIds.length === 0 && removedIds.length === 0) {
            return fullReloadFn();
        }

        const { googleEventManager, eventLayoutManager, allDayEventsComponent } = deps;

        // Remove unchecked calendars' events
        if (removedIds.length > 0) {
            googleEventManager.removeEventsForCalendars(removedIds);
        }

        // Fetch only newly-added calendars' events
        if (addedIds.length > 0) {
            try {
                await googleEventManager.fetchEventsForCalendars(targetDate, addedIds);
            } catch (error) {
                console.error('Failed to fetch events for calendars:', error);
                return fullReloadFn();
            }
        }

        // Recalculate layout
        if (eventLayoutManager) {
            eventLayoutManager.calculateLayout();
        }

        // Update all-day events visibility
        allDayEventsComponent.updateVisibility();
    }

    /**
     * Debounce event loading.
     * @param {Function} loadFn - The function to call after debounce
     */
    debounceLoadEvents(loadFn) {
        if (this._debounceTimeout) {
            clearTimeout(this._debounceTimeout);
        }
        this._debounceTimeout = setTimeout(() => {
            loadFn();
        }, 300);
    }

    /**
     * Scroll to appropriate time based on whether viewing today.
     * @param {boolean} isViewingToday
     * @param {Object} timelineComponent
     */
    scrollToAppropriateTime(isViewingToday, timelineComponent) {
        if (isViewingToday) {
            timelineComponent.scrollToCurrentTime();
        } else {
            loadSettings().then(settings => {
                if (settings.openTime) {
                    timelineComponent.scrollToWorkTime(settings.openTime);
                }
            }).catch(console.warn);
        }
    }

    /**
     * Clean up resources.
     */
    destroy() {
        if (this._debounceTimeout) {
            clearTimeout(this._debounceTimeout);
            this._debounceTimeout = null;
        }
    }
}
