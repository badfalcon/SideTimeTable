/**
 * TimelineComponent - The timeline display component
 */
import { Component } from '../base/component.js';
import { CurrentTimeLineManager } from '../../../lib/current-time-line-manager.js';

export class TimelineComponent extends Component {
    constructor(options = {}) {
        super({
            id: 'sideTimeTable',
            className: 'side-time-table',
            ...options
        });

        // 24-hour pixel height plus extension zones above and below (TIMELINE_OFFSET each)
        this.TIMELINE_OFFSET = 30; // 30-min offset for the top extension zone (-0:30 to 0:00)
        this.TOTAL_HEIGHT = 24 * 60 + this.TIMELINE_OFFSET * 2;
        this.HOUR_HEIGHT = 60;

        // UI elements
        this.baseLayer = null;
        this.eventsLayer = null;
        this.localEventsContainer = null;
        this.googleEventsContainer = null;

        // Hour label DOM cache for localization updates
        this.hourLabels = [];

        // The current time line management
        this.showCurrentTimeLine = options.showCurrentTimeLine !== false;
        this.currentTimeLineManager = null;

        // The target date for the display
        this.currentDate = new Date();

        // Locale (default to English, matching manifest default_locale)
        this.locale = 'en';

        // Time format preference (default 24h until resolved)
        this.timeFormat = '24h';

        // Drag-to-create callback
        this.onDragCreate = options.onDragCreate || null;

        // Drag state
        this._drag = { active: false, anchorStart: 0, anchorEnd: 0, previewEl: null, timer: null };
        this._boundMouseDown = null;
        this._boundMouseMove = null;
        this._boundMouseUp = null;
    }

    createElement() {
        const container = super.createElement();

        // Skip if the content is already created
        if (container.children.length > 0) {
            return container;
        }

        // Create the base layer (the time axis)
        this.baseLayer = this._createBaseLayer();
        container.appendChild(this.baseLayer);

        // Create the events layer
        this.eventsLayer = this._createEventsLayer();
        container.appendChild(this.eventsLayer);

        // Create the current time line (for today)
        if (this.showCurrentTimeLine) {
            this._setupCurrentTimeLine();
        }

        // Initialize locale and update hour labels asynchronously
        this._initLocaleAndRelabel();

        // Set up drag-to-create listeners
        this._setupDragListeners();

        return container;
    }

    /**
     * Create the base layer (the time axis)
     * @private
     */
    _createBaseLayer() {
        const baseDiv = document.createElement('div');
        baseDiv.className = 'side-time-table-base';
        baseDiv.id = 'sideTimeTableBase';

        // Top extension zone (-0:30 to 0:00)
        const topZone = document.createElement('div');
        topZone.className = 'timeline-extended-zone';
        topZone.style.top = '0px';
        topZone.style.height = `${this.TIMELINE_OFFSET}px`;
        baseDiv.appendChild(topZone);

        // Create the time labels and the guide lines for 0:00 to 24:00
        this.hourLabels = [];
        for (let hour = 0; hour <= 24; hour++) {
            const topPosition = hour * this.HOUR_HEIGHT + this.TIMELINE_OFFSET;

            // The time label
            const label = document.createElement('div');
            label.className = 'hour-label';
            label.style.top = `${topPosition}px`;
            // Temporary text; will be localized after locale resolution
            label.textContent = `${hour}:00`;
            this.hourLabels.push(label);

            // The guide line
            const line = document.createElement('div');
            line.className = 'hour-line';
            line.style.top = `${topPosition}px`;

            baseDiv.appendChild(label);
            baseDiv.appendChild(line);
        }

        // Bottom extension zone (24:00 to 24:30)
        const bottomZoneTop = 24 * this.HOUR_HEIGHT + this.TIMELINE_OFFSET;
        const bottomZone = document.createElement('div');
        bottomZone.className = 'timeline-extended-zone';
        bottomZone.style.top = `${bottomZoneTop}px`;
        bottomZone.style.height = `${this.TIMELINE_OFFSET}px`;
        baseDiv.appendChild(bottomZone);

        return baseDiv;
    }

    /**
     * Initialize locale information and relabel hour markers accordingly
     * @private
     */
    _initLocaleAndRelabel() {
        try {
            // If locale utils are available, resolve and update
            const hasLocale = window && typeof window.getCurrentLocale === 'function';
            const hasTimePref = window && typeof window.getTimeFormatPreference === 'function';

            if (hasLocale || hasTimePref) {
                const tasks = [];
                if (hasLocale) tasks.push(Promise.resolve(window.getCurrentLocale()));
                if (hasTimePref) tasks.push(Promise.resolve(window.getTimeFormatPreference()));

                Promise.all(tasks)
                    .then(results => {
                        if (hasLocale) {
                            const locale = results[0];
                            if (locale === 'en' || locale === 'ja') {
                                this.locale = locale;
                            }
                        }
                        if (hasTimePref) {
                            const pref = results[hasLocale ? 1 : 0];
                            if (pref === '12h' || pref === '24h') {
                                this.timeFormat = pref;
                            }
                        }
                        this._updateHourLabels();
                    })
                    .catch(() => {
                        this._updateHourLabels();
                    });
            } else {
                // Fallback: just update using defaults
                this._updateHourLabels();
            }
        } catch (_) {
            // Silent fallback
            this._updateHourLabels();
        }
    }

    /**
     * Update hour labels based on current locale
     * @private
     */
    _updateHourLabels() {
        if (!this.hourLabels || this.hourLabels.length !== 25) return;

        for (let hour = 0; hour <= 24; hour++) {
            const hh = hour.toString().padStart(2, '0');
            const timeStr = `${hh}:00`;

            let localized = null;
            try {
                localized = window.formatTime(timeStr, { format: this.timeFormat, locale: this.locale });
            } catch (_) {
                // ignore
            }

            this.hourLabels[hour].textContent = localized || timeStr;
        }
    }

    /**
     * Create the events layer
     * @private
     */
    _createEventsLayer() {
        const eventsDiv = document.createElement('div');
        eventsDiv.className = 'side-time-table-events';
        eventsDiv.id = 'sideTimeTableEvents';

        // The local events container
        this.localEventsContainer = document.createElement('div');
        this.localEventsContainer.className = 'side-time-table-events-local';
        this.localEventsContainer.id = 'sideTimeTableEventsLocal';

        // The Google events container
        this.googleEventsContainer = document.createElement('div');
        this.googleEventsContainer.className = 'side-time-table-events-google';
        this.googleEventsContainer.id = 'sideTimeTableEventsGoogle';

        eventsDiv.appendChild(this.localEventsContainer);
        eventsDiv.appendChild(this.googleEventsContainer);

        return eventsDiv;
    }

    /**
     * Set up current time line
     * @private
     */
    _setupCurrentTimeLine() {
        if (!this.currentTimeLineManager) {
            this.currentTimeLineManager = new CurrentTimeLineManager(this.baseLayer, this.currentDate);
        }
        this.currentTimeLineManager.update();
    }

    /**
     * Show/hide current time line
     * @param {boolean} visible Whether to show or not
     */
    setCurrentTimeLineVisible(visible) {
        this.showCurrentTimeLine = visible;

        if (visible) {
            this._setupCurrentTimeLine();
        } else if (this.currentTimeLineManager) {
            this.currentTimeLineManager.forceHide();
        }
    }

    /**
     * Set work time background
     * @param {string} startTime Start time (HH:MM format)
     * @param {string} endTime End time (HH:MM format)
     * @param {string} color Background color
     */
    setWorkTimeBackground(startTime, endTime, color = '#f8f9fa') {
        // Remove the existing work time background
        const existingBg = this.baseLayer?.querySelector('.work-time-background');
        if (existingBg) {
            existingBg.remove();
        }

        if (!startTime || !endTime) {
            return;
        }

        try {
            const [startHour, startMinute] = startTime.split(':').map(Number);
            const [endHour, endMinute] = endTime.split(':').map(Number);

            const startMinutes = startHour * 60 + startMinute + this.TIMELINE_OFFSET;
            const endMinutes = endHour * 60 + endMinute + this.TIMELINE_OFFSET;

            if (startMinutes >= endMinutes) {
                return; // Invalid time range
            }

            const background = document.createElement('div');
            background.className = 'work-time-background';
            background.style.top = `${startMinutes}px`;
            background.style.height = `${endMinutes - startMinutes}px`;
            background.style.backgroundColor = color;

            this.baseLayer?.appendChild(background);
        } catch (error) {
            console.warn('Failed to set work time background:', error);
        }
    }

    /**
     * Check if the displayed date is today
     * @returns {boolean} True if today
     */
    isToday() {
        const today = new Date();
        return today.toDateString() === this.currentDate.toDateString();
    }

    /**
     * Set the target date for display
     * @param {Date} date Target date for display
     */
    setCurrentDate(date) {
        this.currentDate = date;

        // Set the date for CurrentTimeLineManager as well
        if (this.currentTimeLineManager) {
            this.currentTimeLineManager.setTargetDate(date);
        }
    }

    /**
     * Scroll to specified time
     * @param {string} time Time (HH:MM format)
     */
    scrollToTime(time) {
        if (!time || !this.element) {
            return;
        }

        try {
            const [hour, minute] = time.split(':').map(Number);
            const totalMinutes = hour * 60 + minute + this.TIMELINE_OFFSET;
            const scrollTop = Math.max(0, totalMinutes - 200); // 200px margin above

            this.element.scrollTop = scrollTop;
        } catch (error) {
            console.warn('Failed to scroll to time:', error);
        }
    }

    /**
     * Scroll to current time
     */
    scrollToCurrentTime() {
        if (!this.isToday()) {
            return;
        }

        const now = new Date();
        const timeString = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        this.scrollToTime(timeString);
    }

    /**
     * Scroll to work start time
     * @param {string} startTime Work start time (HH:MM format)
     */
    scrollToWorkTime(startTime) {
        if (startTime) {
            this.scrollToTime(startTime);
        }
    }

    /**
     * Clear local events container
     */
    clearLocalEvents() {
        if (this.localEventsContainer) {
            this.localEventsContainer.innerHTML = '';
        }
    }

    /**
     * Clear Google events container
     */
    clearGoogleEvents() {
        if (this.googleEventsContainer) {
            this.googleEventsContainer.innerHTML = '';
        }
    }

    /**
     * Clear all events
     */
    clearAllEvents() {
        this.clearLocalEvents();
        this.clearGoogleEvents();
    }

    /**
     * Get local events container
     * @returns {HTMLElement} The local events container
     */
    getLocalEventsContainer() {
        return this.localEventsContainer;
    }

    /**
     * Get Google events container
     * @returns {HTMLElement} The Google events container
     */
    getGoogleEventsContainer() {
        return this.googleEventsContainer;
    }

    /**
     * Get time axis height
     * @returns {number} The total height (pixels)
     */
    getTotalHeight() {
        return this.TOTAL_HEIGHT;
    }

    /**
     * Get one hour height
     * @returns {number} The one hour height (pixels)
     */
    getHourHeight() {
        return this.HOUR_HEIGHT;
    }

    /**
     * Set up drag-to-create listeners on the events layer
     * @private
     */
    _setupDragListeners() {
        if (!this.eventsLayer || !this.onDragCreate) return;

        this._boundMouseDown = (e) => {
            if (e.button !== 0) return;
            if (e.target.closest('.event')) return;

            this._cleanupDrag(); // guard against overlapping drag sessions

            const rect = this.eventsLayer.getBoundingClientRect();
            const anchorStart = this._snapToMinutes(e.clientY - rect.top);
            const anchorEnd = anchorStart + 15;

            this._drag.anchorStart = anchorStart;
            this._drag.anchorEnd = anchorEnd;

            this._drag.timer = setTimeout(() => {
                this._drag.timer = null;
                this._drag.active = true;
                document.body.style.userSelect = 'none';
                const preview = document.createElement('div');
                preview.className = 'drag-preview event';
                this.element.appendChild(preview);
                this._drag.previewEl = preview;
                this._updatePreview(anchorStart, anchorEnd);
            }, 150);

            this._boundMouseMove = (ev) => this._onDragMove(ev);
            this._boundMouseUp = (ev) => this._onDragEnd(ev);
            document.addEventListener('mousemove', this._boundMouseMove);
            document.addEventListener('mouseup', this._boundMouseUp);
        };

        this.eventsLayer.addEventListener('mousedown', this._boundMouseDown);
    }

    /**
     * Calculate [startMinutes, endMinutes] from anchor and current position (bidirectional)
     * @private
     */
    _calcDragRange(currentMinutes) {
        const { anchorStart, anchorEnd } = this._drag;
        const MAX_END = 23 * 60 + 45; // keep endMin within valid time input range
        if (currentMinutes >= anchorStart) {
            // 下方向: anchorStart 固定、現在ブロックの末尾まで伸ばす
            return [anchorStart, Math.min(MAX_END, Math.max(anchorEnd, currentMinutes + 15))];
        } else {
            // 上方向: anchorEnd 固定、現在ブロックの先頭まで伸ばす
            return [currentMinutes, Math.min(MAX_END, anchorEnd)];
        }
    }

    /**
     * Handle drag move
     * @private
     */
    _onDragMove(e) {
        if (!this._drag.active) return;

        const rect = this.eventsLayer.getBoundingClientRect();
        const current = this._snapToMinutes(e.clientY - rect.top);
        const [startMin, endMin] = this._calcDragRange(current);
        this._updatePreview(startMin, endMin);
    }

    /**
     * Update preview element position, size, text, and duration-based class
     * @private
     */
    _updatePreview(startMin, endMin) {
        const el = this._drag.previewEl;
        if (!el) return;

        const duration = endMin - startMin;
        el.style.top = `${this._minutesToPx(startMin)}px`;
        el.style.height = `${duration}px`;
        el.textContent = `${this._minutesToTimeString(startMin)} - ${this._minutesToTimeString(endMin)}`;

        el.classList.remove('event-compact', 'event-micro');
        if (duration <= 15) {
            el.classList.add('event-micro');
        } else if (duration <= 30) {
            el.classList.add('event-compact');
        }
    }

    /**
     * Clean up per-drag state (timer, document listeners, preview element)
     * @private
     */
    _cleanupDrag() {
        if (this._drag.timer) {
            clearTimeout(this._drag.timer);
            this._drag.timer = null;
        }
        if (this._boundMouseMove) {
            document.removeEventListener('mousemove', this._boundMouseMove);
            this._boundMouseMove = null;
        }
        if (this._boundMouseUp) {
            document.removeEventListener('mouseup', this._boundMouseUp);
            this._boundMouseUp = null;
        }
        if (this._drag.previewEl) {
            this._drag.previewEl.remove();
            this._drag.previewEl = null;
        }
        document.body.style.userSelect = '';
        this._drag.active = false;
    }

    /**
     * Handle drag end
     * @private
     */
    _onDragEnd(e) {
        const wasActive = this._drag.active;
        let startMin, endMin;
        if (wasActive) {
            const rect = this.eventsLayer.getBoundingClientRect();
            [startMin, endMin] = this._calcDragRange(this._snapToMinutes(e.clientY - rect.top));
        }

        this._cleanupDrag();

        if (wasActive) {
            this.onDragCreate(this._minutesToTimeString(startMin), this._minutesToTimeString(endMin));
        }
    }

    /**
     * Convert pixel Y (relative to eventsLayer) to snapped minutes since midnight
     * @private
     */
    _snapToMinutes(pixelY) {
        const raw = pixelY - this.TIMELINE_OFFSET;
        const clamped = Math.max(0, Math.min(23 * 60 + 45, raw)); // max start: 23:45
        return Math.floor(clamped / 15) * 15;
    }

    /**
     * Convert minutes since midnight to pixel Y (relative to eventsLayer)
     * @private
     */
    _minutesToPx(minutes) {
        return minutes + this.TIMELINE_OFFSET;
    }

    /**
     * Convert minutes since midnight to HH:MM string
     * @private
     */
    _minutesToTimeString(totalMinutes) {
        const h = Math.floor(totalMinutes / 60);
        const m = totalMinutes % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }

    /**
     * Clean up resources
     */
    destroy() {
        // Clean up drag state
        this._cleanupDrag();
        if (this._boundMouseDown) {
            this.eventsLayer?.removeEventListener('mousedown', this._boundMouseDown);
            this._boundMouseDown = null;
        }

        // Destroy the current time line management
        if (this.currentTimeLineManager) {
            this.currentTimeLineManager.destroy();
            this.currentTimeLineManager = null;
        }

        // Release DOM references held in the hour label cache
        this.hourLabels = [];

        super.destroy();
    }
}