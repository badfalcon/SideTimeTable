/**
 * SideTimeTable - Time Management Module
 *
 * This file manages the basic structure of the timetable and the time-related functions.
 */

// Constants for EventLayoutManager
const LAYOUT_CONSTANTS = {
    BASE_LEFT: 40,           // The basic left position for the events (px)
    GAP: 5,                  // The basic gap between the events (px)
    RESERVED_SPACE_MARGIN: 5,     // The reserved space margin other than the baseLeft (px)
    MIN_WIDTH: 100,          // The minimum guaranteed width (px)
    DEFAULT_WIDTH: 200,      // The default maximum width (px)
    MIN_CONTENT_WIDTH: 20,   // The minimum content width (px)
    MIN_DISPLAY_WIDTH: 100,   // The threshold for the title-only display (px)
    Z_INDEX: 21,             // The Z-index for the events

    // The thresholds by the number of lanes
    LANE_THRESHOLDS: {
        COMPACT: 2,          // The number of lanes for the compact mode
        MICRO: 4             // The number of lanes for the micro mode
    }
};

/**
 * EventLayoutManager - The class for managing the event layout
 *
 * This class adjusts the display positions when multiple events overlap in time.
 * It efficiently performs the event overlap detection and layout calculations,
 * optimizing the visual placement of the events in the UI.
 *
 * @example
 * // The usage example:
 * const layoutManager = new EventLayoutManager();
 * layoutManager.registerEvent({
 *   id: 'event1',
 *   startTime: new Date('2023-01-01T10:00:00'),
 *   endTime: new Date('2023-01-01T11:00:00'),
 *   element: document.getElementById('event1'),
 *   type: 'local'
 * });
 * layoutManager.calculateLayout(); // Calculate and apply the layout
 */
export class EventLayoutManager {
    /**
     * Create an instance of the EventLayoutManager
     *
     * @constructor
     * @param {HTMLElement} [baseElement] - The reference to the sideTimeTableBase element (for width calculation)
     */
    constructor(baseElement = null) {
        /**
         * The array of the registered events
         * @type {Array<Object>}
         * @private
         */
        this.events = [];

        /**
         * The array of the calculated layout groups
         * @type {Array<Array<Object>>}
         * @private
         */
        this.layoutGroups = [];

        /**
         * The reference to the sideTimeTableBase element
         * @type {HTMLElement|null}
         * @private
         */
        this.baseElement = baseElement;

        /**
         * The maximum width of the events (pixels)
         * @type {number}
         */
        this.maxWidth = this._calculateMaxWidth();

        /**
         * The cache for the time values (for performance improvement)
         * @type {Map<string, number>}
         * @private
         */
        this.timeValueCache = new Map();

        /**
         * The resize observer
         * @type {ResizeObserver|null}
         * @private
         */
        this.resizeObserver = null;

        // Initialize the resize observer
        this._initializeResizeObserver();
    }

    /**
     * Calculate maximum width
     * @returns {number} The calculated maximum width
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
            this.resizeObserver = new ResizeObserver((_) => {
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
        // Recalculate the maximum width
        const oldMaxWidth = this.maxWidth;
        this.maxWidth = this._calculateMaxWidth();

        // Recalculate the layout only if the width changed
        if (Math.abs(oldMaxWidth - this.maxWidth) > 5) { // Update on 5px+ change
            this.calculateLayout();
        }
    }

    /**
     * Update base element (when changed dynamically)
     * @param {HTMLElement} newBaseElement - The new base element
     */
    updateBaseElement(newBaseElement) {
        // Stop the existing observer
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }

        // Set the new element
        this.baseElement = newBaseElement;
        this.maxWidth = this._calculateMaxWidth();

        // Initialize the new observer
        this._initializeResizeObserver();

        // Recalculate layout
        if (this.events.length > 0) {
            this.calculateLayout();
        }
    }

    /**
     * Register an event
     *
     * @param {Object} event - The event object to register
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

        // Update the existing event (if same ID)
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
     * @param {string} eventId - The ID of the event to remove
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
     * @param {Date} time - The time object
     * @returns {number} The minutes elapsed from 0:00
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
     * @param {Object} event1 - The first event
     * @param {Object} event2 - The second event
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
     * @returns {Array<Array<Object>>} An array of grouped events
     * @private
     */
    _groupOverlappingEvents() {
        const n = this.events.length;
        if (n === 0) return [];

        // Union-Find for correct transitive overlap grouping
        const parent = Array.from({ length: n }, (_, i) => i);
        const rank = new Array(n).fill(0);

        const find = (x) => {
            while (parent[x] !== x) {
                parent[x] = parent[parent[x]];
                x = parent[x];
            }
            return x;
        };

        const union = (a, b) => {
            const ra = find(a);
            const rb = find(b);
            if (ra === rb) return;
            if (rank[ra] < rank[rb]) { parent[ra] = rb; }
            else if (rank[ra] > rank[rb]) { parent[rb] = ra; }
            else { parent[rb] = ra; rank[ra]++; }
        };

        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                if (this._areEventsOverlapping(this.events[i], this.events[j])) {
                    union(i, j);
                }
            }
        }

        const groupMap = new Map();
        for (let i = 0; i < n; i++) {
            const root = find(i);
            if (!groupMap.has(root)) groupMap.set(root, []);
            groupMap.get(root).push(this.events[i]);
        }

        return Array.from(groupMap.values());
    }

    /**
     * Assign lanes to events within a group
     * @param {Array<Object>} group - A group of events
     * @returns {Array<Object>} An array of events with lane information
     * @private
     */
    _assignLanesToGroup(group) {
        // Sort by the start time
        const sortedEvents = [...group].sort((a, b) =>
            this._getCachedTimeValue(a.startTime) - this._getCachedTimeValue(b.startTime)
        );

        // The event list per lane
        const lanes = [];

        for (const event of sortedEvents) {
            let assignedLane = -1;

            // Find an available lane among the existing lanes
            for (let i = 0; i < lanes.length; i++) {
                const laneEvents = lanes[i];
                let canPlaceInLane = true;

                // Check if it doesn't overlap with all the events in this lane
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

        // Set the total number of lanes for each event
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
     * // Calculate the layout after registering events
     * layoutManager.registerEvent(event1);
     * layoutManager.registerEvent(event2);
     * layoutManager.calculateLayout();
     */
    calculateLayout(disableTransitions = false) {
        if (this.events.length === 0) return;

        // Temporarily disable the transitions if requested
        if (disableTransitions) {
            this.events.forEach(event => {
                if (event.element) {
                    event.element.classList.add('no-transition');
                }
            });
        }

        // Recalculate the maximum width
        this.maxWidth = this._calculateMaxWidth();

        // Group the overlapping events
        this.layoutGroups = this._groupOverlappingEvents();

        // Apply the layout to each group
        for (const group of this.layoutGroups) {
            if (group.length === 1) {
                this._applySingleEventLayout(group[0]);
            } else {
                const eventsWithLanes = this._assignLanesToGroup(group);
                this._applyMultiEventLayout(eventsWithLanes);
            }
        }

        // Restore the transitions after the layout is applied
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
     * @param {Object} event - The event object
     * @private
     */
    _applySingleEventLayout(event) {
        if (!event.element) return;

        event.element.style.left = `${LAYOUT_CONSTANTS.BASE_LEFT}px`;
        event.element.style.width = `${this.maxWidth}px`;
        event.element.style.zIndex = LAYOUT_CONSTANTS.Z_INDEX;
        event.element.style.padding = '';
        event.element.classList.remove('compact', 'micro', 'narrow-display');
    }

    /**
     * Apply layout for multiple events
     * @param {Array<Object>} events - An array of events with lane information
     * @private
     */
    _applyMultiEventLayout(events) {
        try {
            const laneCount = Math.max(...events.map(e => e.totalLanes));

            // Calculate the available width (considering gaps)
            const totalGap = LAYOUT_CONSTANTS.GAP * (laneCount - 1);
            const availableWidth = this.maxWidth - totalGap;
            const laneWidth = Math.max(availableWidth / laneCount, LAYOUT_CONSTANTS.MIN_CONTENT_WIDTH);

            // Apply layout synchronously so that no-transition suppression in calculateLayout works correctly
            events.forEach((event) => {
                if (!event.element) return;

                const leftPosition = LAYOUT_CONSTANTS.BASE_LEFT + (event.lane * (laneWidth + LAYOUT_CONSTANTS.GAP));

                event.element.style.left = `${leftPosition}px`;
                event.element.style.width = `${laneWidth}px`;
                // Later-starting events appear on top
                const startValue = this._getCachedTimeValue(event.startTime);
                event.element.style.zIndex = LAYOUT_CONSTANTS.Z_INDEX + startValue;

                // Adjust the padding class based on the number of lanes
                event.element.style.padding = '';
                if (laneCount <= LAYOUT_CONSTANTS.LANE_THRESHOLDS.COMPACT) {
                    event.element.classList.remove('compact', 'micro');
                } else if (laneCount <= LAYOUT_CONSTANTS.LANE_THRESHOLDS.MICRO) {
                    event.element.classList.add('compact');
                    event.element.classList.remove('micro');
                } else {
                    event.element.classList.add('micro');
                    event.element.classList.remove('compact');
                }

                // Show the title only if too narrow
                if (laneWidth < LAYOUT_CONSTANTS.MIN_DISPLAY_WIDTH) {
                    event.element.classList.add('narrow-display');
                } else {
                    event.element.classList.remove('narrow-display');
                }
            });
        } catch (error) {
            console.error('Error occurred while applying event layout:', error);
        }
    }

    /**
     * Clean up resources
     */
    destroy() {
        // Stop the resize observer
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

        // Clear the event arrays
        this.events = [];
        this.layoutGroups = [];
    }
}