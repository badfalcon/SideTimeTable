/**
 * SideTimeTable - Time Management Module
 *
 * This file manages the basic structure of the timetable and time-related functions.
 */

import {TIME_CONSTANTS} from '../lib/utils.js';
import {calculateBreakHours, calculateWorkHours, isSameDay} from '../lib/time-utils.js';

// Constants for EventLayoutManager
const LAYOUT_CONSTANTS = {
    BASE_LEFT: 65,           // Basic left position for events (px)
    GAP: 5,                  // Basic gap between events (px)
    RESERVED_SPACE_MARGIN: 25,    // Reserved space margin other than baseLeft (px)
    MIN_WIDTH: 100,          // Minimum guaranteed width (px)
    DEFAULT_WIDTH: 200,      // Default maximum width (px)
    MIN_CONTENT_WIDTH: 20,   // Minimum content width (px)
    MIN_GAP: 2,              // Minimum gap (px)
    MIN_DISPLAY_WIDTH: 40,   // Threshold for title-only display (px)
    Z_INDEX: 5,              // Z-index for flex containers

    // Padding settings
    PADDING: {
        BASIC: 10,           // Basic padding (2 lanes or less)
        COMPACT: 8,          // Compact padding (3-4 lanes)
        MICRO: 6             // Micro padding (5+ lanes)
    },

    // Thresholds by number of lanes
    LANE_THRESHOLDS: {
        COMPACT: 2,          // Number of lanes for compact mode
        MICRO: 4             // Number of lanes for micro mode
    }
};

/**
 * EventLayoutManager - Class for managing event layout
 *
 * This class adjusts display positions when multiple events overlap in time.
 * It efficiently performs event overlap detection and layout calculations,
 * optimizing the visual placement of events in the UI.
 *
 * @example
 * // Usage example:
 * const layoutManager = new EventLayoutManager();
 * layoutManager.registerEvent({
 *   id: 'event1',
 *   startTime: new Date('2023-01-01T10:00:00'),
 *   endTime: new Date('2023-01-01T11:00:00'),
 *   element: document.getElementById('event1'),
 *   type: 'local'
 * });
 * layoutManager.calculateLayout(); // Calculate and apply layout
 */
export class EventLayoutManager {
    /**
     * Create an instance of EventLayoutManager
     *
     * @constructor
     * @param {HTMLElement} [baseElement] - Reference to sideTimeTableBase element (for width calculation)
     */
    constructor(baseElement = null) {
        /**
         * Array of registered events
         * @type {Array<Object>}
         * @private
         */
        this.events = [];

        /**
         * Array of calculated layout groups
         * @type {Array<Array<Object>>}
         * @private
         */
        this.layoutGroups = [];

        /**
         * Reference to sideTimeTableBase element
         * @type {HTMLElement|null}
         * @private
         */
        this.baseElement = baseElement;

        /**
         * Maximum width of events (pixels)
         * @type {number}
         */
        this.maxWidth = this._calculateMaxWidth();

        /**
         * Cache for time values (for performance improvement)
         * @type {Map<string, number>}
         * @private
         */
        this.timeValueCache = new Map();

        /**
         * Resize observer
         * @type {ResizeObserver|null}
         * @private
         */
        this.resizeObserver = null;

        // Initialize resize observer
        this._initializeResizeObserver();
    }

    /**
     * Calculate maximum width
     * @returns {number} Calculated maximum width
     * @private
     */
    _calculateMaxWidth() {
        if (this.baseElement) {
            const rect = this.baseElement.getBoundingClientRect();
            const availableWidth = rect.width - LAYOUT_CONSTANTS.BASE_LEFT - LAYOUT_CONSTANTS.RESERVED_SPACE_MARGIN;
            return Math.max(availableWidth, LAYOUT_CONSTANTS.MIN_WIDTH);
        }
        return LAYOUT_CONSTANTS.DEFAULT_WIDTH;
    }

    /**
     * Initialize resize observer
     * @private
     */
    _initializeResizeObserver() {
        if (this.baseElement && window.ResizeObserver) {
            this.resizeObserver = new ResizeObserver((entries) => {
                // Debounce processing
                if (this.resizeTimeout) {
                    clearTimeout(this.resizeTimeout);
                }

                this.resizeTimeout = setTimeout(() => {
                    this._handleResize();
                }, 100); // 100ms debounce
            });

            this.resizeObserver.observe(this.baseElement);
        }
    }

    /**
     * Resize handler
     * @private
     */
    _handleResize() {
        // Recalculate maximum width
        const oldMaxWidth = this.maxWidth;
        this.maxWidth = this._calculateMaxWidth();

        // Recalculate layout only if width changed
        if (Math.abs(oldMaxWidth - this.maxWidth) > 5) { // Update on 5px+ change
            this.calculateLayout();
        }
    }

    /**
     * Update base element (when changed dynamically)
     * @param {HTMLElement} newBaseElement - New base element
     */
    updateBaseElement(newBaseElement) {
        // Stop existing observer
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }

        // Set new element
        this.baseElement = newBaseElement;
        this.maxWidth = this._calculateMaxWidth();

        // Initialize new observer
        this._initializeResizeObserver();

        // Recalculate layout
        if (this.events.length > 0) {
            this.calculateLayout();
        }
    }

    /**
     * Register an event
     *
     * @param {Object} event - Event object to register
     * @param {string} event.id - Unique ID of the event
     * @param {Date} event.startTime - Start time
     * @param {Date} event.endTime - End time
     * @param {HTMLElement} event.element - DOM element of the event
     * @param {string} [event.type] - Type of event ('local', 'google')
     * @param {string} [event.title] - Title of the event
     * @param {string} [event.calendarId] - Calendar ID (for Google events)
     *
     * @example
     * layoutManager.registerEvent({
     *   id: 'meeting-123',
     *   startTime: new Date('2023-01-01T14:00:00'),
     *   endTime: new Date('2023-01-01T15:30:00'),
     *   element: document.getElementById('meeting-div'),
     *   type: 'google',
     *   title: 'Team Meeting'
     * });
     */
    registerEvent(event) {
        if (!event.id || !event.startTime || !event.endTime || !event.element) {
            console.warn('Missing required information for event registration:', event);
            return;
        }

        // Update existing event (if same ID)
        const existingIndex = this.events.findIndex(e => e.id === event.id);
        if (existingIndex !== -1) {
            this.events[existingIndex] = { ...this.events[existingIndex], ...event };
        } else {
            this.events.push(event);
        }
    }

    /**
     * Remove an event with the specified ID
     *
     * @param {string} eventId - ID of the event to remove
     * @returns {boolean} Whether the removal was successful
     *
     * @example
     * const removed = layoutManager.removeEvent('meeting-123');
     * if (removed) {
     *   console.log('Event was removed');
     * }
     */
    removeEvent(eventId) {
        const initialLength = this.events.length;
        this.events = this.events.filter(event => event.id !== eventId);
        return this.events.length < initialLength;
    }

    /**
     * Remove all events and clear layout
     */
    clearAllEvents() {
        this.events = [];
        this.layoutGroups = [];
        this.timeValueCache.clear();
    }

    /**
     * Get time value from cache or calculate and save to cache
     * @param {Date} time - Time object
     * @returns {number} Minutes elapsed from 0:00
     * @private
     */
    _getCachedTimeValue(time) {
        const timeKey = time.toISOString();

        if (this.timeValueCache.has(timeKey)) {
            return this.timeValueCache.get(timeKey);
        }

        const value = time.getHours() * 60 + time.getMinutes();
        this.timeValueCache.set(timeKey, value);
        return value;
    }

    /**
     * Determine if two events overlap in time
     *
     * @param {Object} event1 - First event
     * @param {Object} event2 - Second event
     * @returns {boolean} True if overlapping
     * @private
     *
     * @example
     * const overlaps = layoutManager._areEventsOverlapping(event1, event2);
     */
    _areEventsOverlapping(event1, event2) {
        const start1 = this._getCachedTimeValue(event1.startTime);
        const end1 = this._getCachedTimeValue(event1.endTime);
        const start2 = this._getCachedTimeValue(event2.startTime);
        const end2 = this._getCachedTimeValue(event2.endTime);

        // Overlap condition: event1 start < event2 end AND event2 start < event1 end
        return start1 < end2 && start2 < end1;
    }

    /**
     * Group overlapping events
     * @returns {Array<Array<Object>>} Array of grouped events
     * @private
     */
    _groupOverlappingEvents() {
        const groups = [];
        const processedEvents = new Set();

        for (const event of this.events) {
            if (processedEvents.has(event.id)) continue;

            const group = [event];
            processedEvents.add(event.id);

            // Find other events that overlap with this event
            for (const otherEvent of this.events) {
                if (processedEvents.has(otherEvent.id)) continue;

                // Check if it overlaps with any event in the group
                let overlapsWithGroup = false;
                for (const groupEvent of group) {
                    if (this._areEventsOverlapping(groupEvent, otherEvent)) {
                        overlapsWithGroup = true;
                        break;
                    }
                }

                if (overlapsWithGroup) {
                    group.push(otherEvent);
                    processedEvents.add(otherEvent.id);
                }
            }

            groups.push(group);
        }

        return groups;
    }

    /**
     * Assign lanes to events within a group
     * @param {Array<Object>} group - Group of events
     * @returns {Array<Object>} Array of events with lane information
     * @private
     */
    _assignLanesToGroup(group) {
        // Sort by start time
        const sortedEvents = group.sort((a, b) =>
            this._getCachedTimeValue(a.startTime) - this._getCachedTimeValue(b.startTime)
        );

        // Event list per lane
        const lanes = [];

        for (const event of sortedEvents) {
            let assignedLane = -1;

            // Find an available lane among existing lanes
            for (let i = 0; i < lanes.length; i++) {
                const laneEvents = lanes[i];
                let canPlaceInLane = true;

                // Check if it doesn't overlap with all events in this lane
                for (const laneEvent of laneEvents) {
                    if (this._areEventsOverlapping(event, laneEvent)) {
                        canPlaceInLane = false;
                        break;
                    }
                }

                if (canPlaceInLane) {
                    laneEvents.push(event);
                    assignedLane = i;
                    break;
                }
            }

            // If can't place in existing lanes, create a new lane
            if (assignedLane === -1) {
                lanes.push([event]);
                assignedLane = lanes.length - 1;
            }

            event.lane = assignedLane;
        }

        // Set total number of lanes for each event
        const totalLanes = lanes.length;
        for (const event of sortedEvents) {
            event.totalLanes = totalLanes;
        }

        return sortedEvents;
    }

    /**
     * Calculate and apply layout for all events
     *
     * @param {boolean} [disableTransitions=false] - Whether to temporarily disable CSS transitions
     * @example
     * // Calculate layout after registering events
     * layoutManager.registerEvent(event1);
     * layoutManager.registerEvent(event2);
     * layoutManager.calculateLayout();
     */
    calculateLayout(disableTransitions = false) {
        if (this.events.length === 0) return;

        // Temporarily disable transitions if requested
        if (disableTransitions) {
            this.events.forEach(event => {
                if (event.element) {
                    event.element.classList.add('no-transition');
                }
            });
        }

        // Recalculate maximum width
        this.maxWidth = this._calculateMaxWidth();

        // Group overlapping events
        this.layoutGroups = this._groupOverlappingEvents();

        // Apply layout to each group
        for (const group of this.layoutGroups) {
            if (group.length === 1) {
                this._applySingleEventLayout(group[0]);
            } else {
                const eventsWithLanes = this._assignLanesToGroup(group);
                this._applyMultiEventLayout(eventsWithLanes);
            }
        }

        // Restore transitions after layout is applied
        if (disableTransitions) {
            // Use requestAnimationFrame to ensure layout is applied before restoring transitions
            requestAnimationFrame(() => {
                this.events.forEach(event => {
                    if (event.element) {
                        event.element.classList.remove('no-transition');
                    }
                });
            });
        }
    }

    /**
     * Apply layout for a single event
     * @param {Object} event - Event object
     * @private
     */
    _applySingleEventLayout(event) {
        if (!event.element) return;

        event.element.style.left = `${LAYOUT_CONSTANTS.BASE_LEFT}px`;
        event.element.style.width = `${this.maxWidth}px`;
        event.element.style.zIndex = LAYOUT_CONSTANTS.Z_INDEX;
    }

    /**
     * Apply layout for multiple events
     * @param {Array<Object>} events - Array of events with lane information
     * @private
     */
    _applyMultiEventLayout(events) {
        try {
            const totalLanes = Math.max(...events.map(e => e.totalLanes));
            const laneCount = totalLanes;

            // Calculate available width (considering gaps)
            const totalGap = LAYOUT_CONSTANTS.GAP * (laneCount - 1);
            const availableWidth = this.maxWidth - totalGap;
            const laneWidth = Math.max(availableWidth / laneCount, LAYOUT_CONSTANTS.MIN_CONTENT_WIDTH);

            // Apply layout
            requestAnimationFrame(() => {
                events.forEach((event) => {
                    if (!event.element) return;

                    const leftPosition = LAYOUT_CONSTANTS.BASE_LEFT + (event.lane * (laneWidth + LAYOUT_CONSTANTS.GAP));

                    event.element.style.left = `${leftPosition}px`;
                    event.element.style.width = `${laneWidth}px`;
                    event.element.style.zIndex = LAYOUT_CONSTANTS.Z_INDEX;

                    // Adjust padding based on number of lanes
                    let padding;
                    if (laneCount <= LAYOUT_CONSTANTS.LANE_THRESHOLDS.COMPACT) {
                        padding = LAYOUT_CONSTANTS.PADDING.BASIC;
                    } else if (laneCount <= LAYOUT_CONSTANTS.LANE_THRESHOLDS.MICRO) {
                        padding = LAYOUT_CONSTANTS.PADDING.COMPACT;
                    } else {
                        padding = LAYOUT_CONSTANTS.PADDING.MICRO;
                    }

                    event.element.style.padding = `${padding}px`;

                    // Show title only if too narrow
                    if (laneWidth < LAYOUT_CONSTANTS.MIN_DISPLAY_WIDTH) {
                        event.element.classList.add('narrow-display');
                    } else {
                        event.element.classList.remove('narrow-display');
                    }
                });
            });
        } catch (error) {
            console.error('Error occurred while applying event layout:', error);
        }
    }

    /**
     * Clean up resources
     */
    destroy() {
        // Stop resize observer
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }

        // Clear timers
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
            this.resizeTimeout = null;
        }

        // Clear cache
        this.timeValueCache.clear();

        // Clear event arrays
        this.events = [];
        this.layoutGroups = [];
    }
}