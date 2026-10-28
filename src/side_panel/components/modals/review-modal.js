/**
 * ReviewModal - Modal to request a Chrome Web Store review after sufficient usage
 *
 * Show conditions (initial):
 *   - User has opened the panel on 10 or more total days
 *   - User has opened the panel on 2 or more consecutive days
 *   - Google Calendar integration is enabled
 *
 * Show conditions (after "Later"):
 *   - 7 days have passed since "Later" was clicked
 *   - Google Calendar integration is still enabled
 */
import {ModalComponent} from './modal-component.js';
import {StorageHelper} from '../../../lib/storage-helper.js';
import {
    createButton,
    createCloseButton,
    createFooterSpacer,
    createIcon,
    setLocalizedText
} from './event-dialog-dom.js';

// Storage key for review tracking data
const REVIEW_STATS_KEY = 'reviewStats';

// Number of total days required before showing the popup
const MIN_TOTAL_DAYS = 10;

// Number of consecutive days required before showing the popup
const MIN_CONSECUTIVE_DAYS = 2;

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
        // The same header / body / footer as the other dialogs
        const content = document.createElement('div');
        content.className = 'review-dialog';

        const header = document.createElement('header');
        header.className = 'event-form-header';
        const title = document.createElement('h2');
        title.className = 'event-form-title';
        title.id = 'reviewTitle';
        setLocalizedText(title, 'reviewTitle', 'How are you finding SideTimeTable?');
        header.appendChild(title);
        // Closing only puts the request away for now, like the old ×
        header.appendChild(createCloseButton(this, () => this.hide()));
        content.appendChild(header);

        const body = document.createElement('div');
        body.className = 'review-body';

        const stars = document.createElement('div');
        stars.className = 'review-stars';
        stars.setAttribute('aria-hidden', 'true');
        for (let i = 0; i < 5; i++) {
            stars.appendChild(createIcon('fas fa-star'));
        }
        body.appendChild(stars);

        const message = document.createElement('p');
        message.className = 'review-message';
        message.id = 'reviewMessage';
        setLocalizedText(message, 'reviewMessage', "Thank you for using SideTimeTable!\nWe'd love to hear about your experience.");
        body.appendChild(message);

        // A quiet way out, apart from the two answers in the footer
        this.neverButton = document.createElement('button');
        this.neverButton.type = 'button';
        this.neverButton.id = 'reviewNeverButton';
        this.neverButton.className = 'review-never';
        setLocalizedText(this.neverButton, 'reviewNever', "Don't ask again");
        body.appendChild(this.neverButton);

        content.appendChild(body);

        const footer = document.createElement('footer');
        footer.className = 'event-form-footer';
        footer.appendChild(createFooterSpacer());
        this.laterButton = createButton(this, {
            id: 'reviewLaterButton',
            variant: 'secondary',
            msgKey: 'reviewLater',
            fallback: 'Maybe Later',
            onClick: () => this._handleLater()
        });
        footer.appendChild(this.laterButton);
        this.rateButton = createButton(this, {
            id: 'reviewRateButton',
            variant: 'primary',
            msgKey: 'reviewRateNow',
            fallback: 'Write a Review',
            iconClass: 'fas fa-star',
            onClick: () => this._handleRate()
        });
        footer.appendChild(this.rateButton);
        content.appendChild(footer);

        this.addEventListener(this.neverButton, 'click', () => this._handleNever());

        return content;
    }

    createElement() {
        const element = super.createElement();
        element.setAttribute('role', 'dialog');
        element.setAttribute('aria-modal', 'true');
        element.setAttribute('aria-labelledby', 'reviewTitle');
        element.setAttribute('aria-describedby', 'reviewMessage');
        return element;
    }

    /**
     * Focus the main answer: the dialog has no input.
     * @private
     */
    _focusFirstInput() {
        setTimeout(() => this.rateButton?.focus(), 100);
    }

    /**
     * Open Chrome Web Store review page and mark as reviewed
     * @private
     */
    async _handleRate() {
        try {
            const storeUrl = `https://chromewebstore.google.com/detail/sidetimetable/${(chrome.runtime.id)}`;
            await chrome.tabs.create({ url: storeUrl });
        } catch (_e) {
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

        stats.totalDays = (stats.totalDays || 0) + 1;
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
                if (stats.totalDays >= MIN_TOTAL_DAYS && stats.consecutiveDays >= MIN_CONSECUTIVE_DAYS) {
                    this.show();
                }
            } else if (stats.state === 'later') {
                const daysSinceLater = (Date.now() - (stats.lastLaterDate || 0)) / (1000 * 60 * 60 * 24);
                if (daysSinceLater >= LATER_WAIT_DAYS) {
                    this.show();
                }
            }
        } catch (_error) {
            // Silently ignore errors to avoid disrupting main UI
        }
    }
}
