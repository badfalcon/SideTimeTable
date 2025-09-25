/**
 * CurrentTimeLineManager - Current time line management class
 *
 * This class manages display, hiding, and position updates of the line showing current time.
 * It is a dedicated class for visually displaying current time on the timeline.
 */

/**
 * Class for managing current time line
 */
export class CurrentTimeLineManager {
    /**
     * Create CurrentTimeLineManager instance
     *
     * @param {HTMLElement} parentElement - Parent element to place current time line
     * @param {Date} targetDate - Target date (today if omitted)
     */
    constructor(parentElement, targetDate = null) {
        /**
         * Parent element to place current time line
         */
        this.parentElement = parentElement;

        /**
         * Target date
         */
        this.targetDate = targetDate || new Date();

        /**
         * DOM element of current time line
         */
        this.timeLineElement = null;

        /**
         * Update timer ID
         */
        this.updateTimer = null;
    }

    /**
     * Update current time line
     * Show only for today and adjust position to current time
     */
    update() {
        if (!this._shouldShowTimeLine()) {
            this.hide();
            return;
        }

        // Get or create current time line element
        this._ensureTimeLineElement();

        // Update position
        this._updatePosition();

        // Show
        this.show();
    }

    /**
     * Force hide current time line
     */
    forceHide() {
        this.hide();
        this._stopUpdateTimer();
    }

    /**
     * Set target date
     * @param {Date} targetDate - Target date
     */
    setTargetDate(targetDate) {
        this.targetDate = targetDate;
        this.update();
    }

    /**
     * Remove current time line element
     */
    destroy() {
        this._stopUpdateTimer();

        if (this.timeLineElement) {
            this.timeLineElement.remove();
            this.timeLineElement = null;
        }
    }

    /**
     * Ensure current time line DOM element exists
     * @private
     */
    _ensureTimeLineElement() {
        if (!this.timeLineElement) {
            // Remove existing element if any
            const existing = document.getElementById('currentTimeLine');
            if (existing) {
                existing.remove();
            }

            this.timeLineElement = document.createElement('div');
            this.timeLineElement.id = 'currentTimeLine';
            this.timeLineElement.className = 'current-time-line';
            this.parentElement.appendChild(this.timeLineElement);
        }
    }

    /**
     * Determine if current time line should be displayed
     * @returns {boolean} true if should be displayed
     * @private
     */
    _shouldShowTimeLine() {
        try {
            const today = new Date();
            return today.toDateString() === this.targetDate.toDateString();
        } catch (error) {
            console.warn('Error occurred in current time line display determination:', error);
            return false;
        }
    }

    /**
     * Show current time line
     * @private
     */
    show() {
        if (this.timeLineElement) {
            this.timeLineElement.style.display = '';

            // Start timer to update every minute
            if (!this.updateTimer) {
                this.updateTimer = setInterval(() => {
                    this._updatePosition();
                }, 60000);
            }
        }
    }

    /**
     * Hide current time line
     * @private
     */
    hide() {
        if (this.timeLineElement) {
            this.timeLineElement.style.display = 'none';
        }
        this._stopUpdateTimer();
    }

    /**
     * Calculate current time line position
     * @private
     */
    _updatePosition() {
        if (!this.timeLineElement) return;

        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const totalMinutes = hours * 60 + minutes;

        // Calculate as 1 minute = 1px
        const topPosition = totalMinutes;

        this.timeLineElement.style.top = `${topPosition}px`;
    }

    /**
     * Stop update timer
     * @private
     */
    _stopUpdateTimer() {
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
            this.updateTimer = null;
        }
    }
}