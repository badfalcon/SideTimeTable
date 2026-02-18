/**
 * ReviewModal - Modal to request a Chrome Web Store review after sufficient usage
 */
import { ModalComponent } from './modal-component.js';
import { StorageHelper } from '../../../lib/storage-helper.js';

// Storage key for review tracking data
const REVIEW_STATS_KEY = 'reviewStats';

// Show review popup after this many panel opens
const MIN_OPEN_COUNT = 5;

// Show review popup after this many days since first open
const MIN_DAYS_SINCE_FIRST_OPEN = 3;

// After clicking "Later", wait this many days before showing again
const LATER_WAIT_DAYS = 7;

// After clicking "Later", require this many additional opens before showing again
const LATER_ADDITIONAL_OPENS = 3;

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
     * Dismiss for now – show again later
     * @private
     */
    async _handleLater() {
        const stats = await this._loadStats();
        await this._saveStats({
            ...stats,
            state: 'later',
            lastLaterDate: Date.now(),
            openCountAtLater: stats.openCount
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
     * Record a panel open and check whether the review popup should be shown.
     * Call this once each time the side panel is opened.
     */
    async trackOpenAndMaybeShow() {
        try {
            let stats = await this._loadStats();

            // Initialize on first open
            if (!stats.firstOpenDate) {
                stats.firstOpenDate = Date.now();
                stats.openCount = 1;
                stats.state = stats.state || 'none';
                await this._saveStats(stats);
                return;
            }

            // Increment open count
            stats.openCount = (stats.openCount || 0) + 1;
            await this._saveStats(stats);

            // Don't show if already reviewed or set to never
            if (stats.state === 'reviewed' || stats.state === 'never') {
                return;
            }

            const now = Date.now();
            const daysSinceFirst = (now - stats.firstOpenDate) / (1000 * 60 * 60 * 24);

            if (stats.state === 'none' || !stats.state) {
                // Show after MIN_OPEN_COUNT opens AND MIN_DAYS_SINCE_FIRST_OPEN days
                if (stats.openCount >= MIN_OPEN_COUNT && daysSinceFirst >= MIN_DAYS_SINCE_FIRST_OPEN) {
                    this.show();
                }
            } else if (stats.state === 'later') {
                // Show again after LATER_WAIT_DAYS days AND LATER_ADDITIONAL_OPENS more opens
                const daysSinceLater = (now - (stats.lastLaterDate || 0)) / (1000 * 60 * 60 * 24);
                const additionalOpens = stats.openCount - (stats.openCountAtLater || 0);
                if (daysSinceLater >= LATER_WAIT_DAYS && additionalOpens >= LATER_ADDITIONAL_OPENS) {
                    this.show();
                }
            }
        } catch (error) {
            // Silently ignore errors to avoid disrupting main UI
        }
    }
}
