/**
 * DateNavigationService - Manages current date state and navigation logic.
 *
 * Single source of truth for the currently-viewed date in the side panel.
 * Eliminates duplicated date logic previously spread across SidePanelUIController
 * and HeaderComponent.
 */
import { getFormattedDateFromDate } from '../../lib/utils.js';
import { isToday } from '../../lib/time-utils.js';

export class DateNavigationService {
    constructor() {
        /** @type {Date} The currently viewed date (midnight-normalised) */
        this._currentDate = new Date();
        this._currentDate.setHours(0, 0, 0, 0);

        /** @type {boolean} Whether the user was viewing today before the last change */
        this.wasViewingToday = true;
    }

    /**
     * Set the current date.
     * @param {Date} date
     */
    setDate(date) {
        this._currentDate = new Date(date);
        this._currentDate.setHours(0, 0, 0, 0);
        this.wasViewingToday = isToday(this._currentDate);
    }

    /**
     * Get a copy of the current date.
     * @returns {Date}
     */
    getDate() {
        return new Date(this._currentDate);
    }

    /**
     * Whether the currently viewed date is today.
     * @returns {boolean}
     */
    isViewingToday() {
        return isToday(this._currentDate);
    }

    /**
     * Get the current date as a YYYY-MM-DD string.
     * @returns {string}
     */
    getDateString() {
        return getFormattedDateFromDate(this._currentDate);
    }

    /**
     * Advance to today if the user was previously viewing today
     * and the date has rolled over (e.g. past midnight).
     * @returns {boolean} true if the date was advanced
     */
    advanceToTodayIfNeeded() {
        if (this.wasViewingToday && !isToday(this._currentDate)) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            this._currentDate = today;
            this.wasViewingToday = true;
            return true;
        }
        return false;
    }
}
