/**
 * CurrentTimeLineManager - The current time line management class
 *
 * This class manages the display, hiding, and position updates of the line showing the current time.
 * It is a dedicated class for visually displaying the current time on the timeline.
 */

/**
 * The class for managing the current time line
 */
export class CurrentTimeLineManager {
    /**
     * Create a CurrentTimeLineManager instance
     *
     * @param {HTMLElement} parentElement - The parent element to place the current time line
     * @param {Date} targetDate - The target date (today if omitted)
     */
    constructor(parentElement, targetDate = null) {
        /**
         * The parent element to place the current time line
         */
        this.parentElement = parentElement;

        /**
         * The target date
         */
        this.targetDate = targetDate || new Date();

        /**
         * The DOM element of the current time line
         */
        this.timeLineElement = null;

        /**
         * The update timer ID
         */
        this.updateTimer = null;
    }

    /**
     * Update the current time line
     * Show only for today and adjust the position to the current time
     */
    update() {
        if (!this._shouldShowTimeLine()) {
            this.hide();
            return;
        }

        // Get or create the current time line element
        this._ensureTimeLineElement();

        // Update the position
        this._updatePosition();

        // Show the element
        this.show();
    }

    /**
     * Force hide the current time line
     */
    forceHide() {
        this.hide();
        this._stopUpdateTimer();
    }

    /**
     * Set the target date
     * @param {Date} targetDate - The target date
     */
    setTargetDate(targetDate) {
        this.targetDate = targetDate;
        this.update();
    }

    /**
     * Remove the current time line element
     */
    destroy() {
        this._stopUpdateTimer();

        if (this.timeLineElement) {
            this.timeLineElement.remove();
            this.timeLineElement = null;
        }
    }

    /**
     * Ensure the current time line DOM element exists
     * @private
     */
    _ensureTimeLineElement() {
        if (!this.timeLineElement) {
            // Remove the existing element if any
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
     * Determine if the current time line should be displayed
     * @returns {boolean} true if it should be displayed
     * @private
     */
    _shouldShowTimeLine() {
        try {
            const today = new Date();
            return today.toDateString() === this.targetDate.toDateString();
        } catch (error) {
            console.warn('An error occurred in the current time line display determination:', error);
            return false;
        }
    }

    /**
     * Show the current time line
     * @private
     */
    show() {
        if (this.timeLineElement) {
            this.timeLineElement.style.display = '';

            // Start the timer to update every minute
            if (!this.updateTimer) {
                this.updateTimer = setInterval(() => {
                    this._updatePosition();
                }, 60000);
            }
        }
    }

    /**
     * Hide the current time line
     * @private
     */
    hide() {
        if (this.timeLineElement) {
            this.timeLineElement.style.display = 'none';
        }
        this._stopUpdateTimer();
    }

    /**
     * Calculate the current time line position
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
     * Stop the update timer
     * @private
     */
    _stopUpdateTimer() {
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
            this.updateTimer = null;
        }
    }
}