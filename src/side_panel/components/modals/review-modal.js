/**
 * ReviewModal - Modal to request a Chrome Web Store review after sufficient usage
 *
 * Show conditions (initial):
 *   - User has opened the panel on 3 or more consecutive days
 *   - Google Calendar integration is enabled
 *
 * Show conditions (after "Later"):
 *   - 7 days have passed since "Later" was clicked
 *   - Google Calendar integration is still enabled
 */
import { ModalComponent } from './modal-component.js';
import { StorageHelper } from '../../../lib/storage-helper.js';

// Storage key for review tracking data
const REVIEW_STATS_KEY = 'reviewStats';

// Number of consecutive days required before showing the popup
const MIN_CONSECUTIVE_DAYS = 3;

// After clicking "Later", wait this many days before showing again
const LATER_WAIT_DAYS = 7;

export class ReviewModal extends ModalComponent {
    constructor(options = {}) {
        super({
            id: 'reviewModal',
            closeOnBackdropClick: false,
            closeOnEscape: false,
            ...options
        });

        this.rateButton = null;
        this.laterButton = null;
        this.neverButton = null;
    }

    createContent() {
        const content = document.createElement('div');
        content.className = 'review-modal-content';

        // Star icon
        const iconWrap = document.createElement('div');
        iconWrap.className = 'review-modal-icon';
        iconWrap.innerHTML = '<i class="fas fa-star"></i>';
        content.appendChild(iconWrap);

        // Title
        const title = document.createElement('h2');
        title.className = 'modal-title review-modal-title';
        title.setAttribute('data-localize', '__MSG_reviewTitle__');
        title.textContent = 'Enjoying SideTimeTable?';
        content.appendChild(title);

        // Message
        const message = document.createElement('p');
        message.className = 'review-modal-message';
        message.setAttribute('data-localize', '__MSG_reviewMessage__');
        message.textContent = 'Thank you for using SideTimeTable!\nWe would love to hear your feedback.';
        content.appendChild(message);

        // Button container
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'review-modal-buttons';

        // Rate Now button
        this.rateButton = document.createElement('button');
        this.rateButton.className = 'btn btn-warning review-btn-rate';
        this.rateButton.setAttribute('data-localize', '__MSG_reviewRateNow__');
        this.rateButton.textContent = 'Rate Now';
        buttonContainer.appendChild(this.rateButton);

        // Later button
        this.laterButton = document.createElement('button');
        this.laterButton.className = 'btn btn-secondary review-btn-later';
        this.laterButton.setAttribute('data-localize', '__MSG_reviewLater__');
        this.laterButton.textContent = 'Later';
        buttonContainer.appendChild(this.laterButton);

        content.appendChild(buttonContainer);

        // Never button (smaller, text-style)
        this.neverButton = document.createElement('button');
        this.neverButton.className = 'btn btn-link review-btn-never';
        this.neverButton.setAttribute('data-localize', '__MSG_reviewNever__');
        this.neverButton.textContent = "Don't ask again";
        content.appendChild(this.neverButton);

        // Event listeners
        this.addEventListener(this.rateButton, 'click', () => this._handleRate());
        this.addEventListener(this.laterButton, 'click', () => this._handleLater());
        this.addEventListener(this.neverButton, 'click', () => this._handleNever());

        return content;
    }

    /**
     * Open Chrome Web Store review page and mark as reviewed
     * @private
     */
    async _handleRate() {
        try {
            const extensionId = chrome.runtime.id;
            const storeUrl = `https://chromewebstore.google.com/detail/sidetimetable/${extensionId}`;
            await chrome.tabs.create({ url: storeUrl });
        } catch (e) {
            // Ignore errors opening the tab (e.g. in side panel context)
        }
        await this._updateState('reviewed');
        this.hide();
    }

    /**
     * Dismiss for now – show again after LATER_WAIT_DAYS days
     * @private
     */
    async _handleLater() {
        const stats = await this._loadStats();
        await this._saveStats({
            ...stats,
            state: 'later',
            lastLaterDate: Date.now()
        });
        this.hide();
    }

    /**
     * Never show again
     * @private
     */
    async _handleNever() {
        await this._updateState('never');
        this.hide();
    }

    /**
     * Update the review state
     * @param {string} state
     * @private
     */
    async _updateState(state) {
        const stats = await this._loadStats();
        await this._saveStats({ ...stats, state });
    }

    /**
     * Load review stats from storage
     * @returns {Promise<object>}
     * @private
     */
    async _loadStats() {
        const data = await StorageHelper.getLocal([REVIEW_STATS_KEY], {
            [REVIEW_STATS_KEY]: {}
        });
        return data[REVIEW_STATS_KEY] || {};
    }

    /**
     * Save review stats to storage
     * @param {object} stats
     * @private
     */
    async _saveStats(stats) {
        await StorageHelper.setLocal({ [REVIEW_STATS_KEY]: stats });
    }

    /**
     * Returns today's date as a YYYY-MM-DD string (local time)
     * @returns {string}
     * @private
     */
    _todayStr() {
        const d = new Date();
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }

    /**
     * Returns the date string for N days before today
     * @param {number} n
     * @returns {string}
     * @private
     */
    _dateStrDaysAgo(n) {
        const d = new Date();
        d.setDate(d.getDate() - n);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }

    /**
     * Update consecutive day counter based on today's date.
     * - Same day as last open: no change (already counted today)
     * - Next calendar day: increment
     * - Gap of 2+ days: reset to 1
     * @param {object} stats
     * @returns {object} Updated stats
     * @private
     */
    _updateConsecutiveDays(stats) {
        const today = this._todayStr();

        if (stats.lastOpenDateStr === today) {
            // Already counted today
            return stats;
        }

        const yesterday = this._dateStrDaysAgo(1);
        if (stats.lastOpenDateStr === yesterday) {
            stats.consecutiveDays = (stats.consecutiveDays || 1) + 1;
        } else {
            // Streak broken (or first open)
            stats.consecutiveDays = 1;
        }

        stats.lastOpenDateStr = today;
        return stats;
    }

    /**
     * Check if Google Calendar integration is currently enabled.
     * @returns {Promise<boolean>}
     * @private
     */
    async _isGoogleIntegrated() {
        try {
            const data = await StorageHelper.get(['googleIntegrated'], { googleIntegrated: false });
            return data.googleIntegrated === true;
        } catch {
            return false;
        }
    }

    /**
     * Record a panel open and check whether the review popup should be shown.
     * Call this once each time the side panel is opened.
     */
    async trackOpenAndMaybeShow() {
        try {
            let stats = await this._loadStats();

            // Update consecutive day streak
            stats = this._updateConsecutiveDays(stats);
            if (!stats.state) stats.state = 'none';
            await this._saveStats(stats);

            // Don't show if already reviewed or set to never
            if (stats.state === 'reviewed' || stats.state === 'never') {
                return;
            }

            // Both conditions must be met: streak + Google Calendar connected
            const gcalEnabled = await this._isGoogleIntegrated();
            if (!gcalEnabled) {
                return;
            }

            if (stats.state === 'none') {
                if (stats.consecutiveDays >= MIN_CONSECUTIVE_DAYS) {
                    this.show();
                }
            } else if (stats.state === 'later') {
                const daysSinceLater = (Date.now() - (stats.lastLaterDate || 0)) / (1000 * 60 * 60 * 24);
                if (daysSinceLater >= LATER_WAIT_DAYS) {
                    this.show();
                }
            }
        } catch (error) {
            // Silently ignore errors to avoid disrupting main UI
        }
    }
}
