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

        // 24-hour pixel height (60px per hour)
        this.TOTAL_HEIGHT = 24 * 60;
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

        // Create the time labels and the guide lines for 24 hours
        this.hourLabels = [];
        for (let hour = 0; hour < 24; hour++) {
            const topPosition = hour * this.HOUR_HEIGHT;

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
        if (!this.hourLabels || this.hourLabels.length !== 24) return;

        for (let hour = 0; hour < 24; hour++) {
            const hh = hour.toString().padStart(2, '0');
            const timeStr = `${hh}:00`;

            let localized = null;
            try {
                if (window && typeof window.formatTime === 'function') {
                    localized = window.formatTime(timeStr, { format: this.timeFormat, locale: this.locale });
                } else if (window && typeof window.formatTimeByFormat === 'function') {
                    localized = window.formatTimeByFormat(timeStr, this.timeFormat, this.locale);
                } else if (window && typeof window.formatTimeForLocale === 'function') {
                    // Backward compatibility
                    localized = window.formatTimeForLocale(timeStr, this.locale);
                }
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
            this.currentTimeLineManager = new CurrentTimeLineManager(this.eventsLayer, this.currentDate);
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

            const startMinutes = startHour * 60 + startMinute;
            const endMinutes = endHour * 60 + endMinute;

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
            const totalMinutes = hour * 60 + minute;
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
     * Clean up resources
     */
    destroy() {
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