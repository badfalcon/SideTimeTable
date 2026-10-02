/**
 * HeaderComponent - Side panel header component
 */
import { Component } from '../base/component.js';
import { formatHeaderDate } from '../../../lib/time-utils.js';

export class HeaderComponent extends Component {
    constructor(options = {}) {
        super({
            id: 'sideTimeTableHeaderWrapper',
            className: '',
            ...options
        });

        // Callback functions
        this.onAddEvent = options.onAddEvent || null;
        this.onDateChange = options.onDateChange || null;
        this.onSettingsClick = options.onSettingsClick || null;
        this.onSyncClick = options.onSyncClick || null;

        // UI elements
        this.addEventButton = null;
        this.prevDateButton = null;
        this.nextDateButton = null;
        this.dateButton = null;
        this.dateInput = null;
        this.syncButton = null;
        this.settingsButton = null;
        this.filterSlot = null;

        // Language of the date label ('ja' / 'en'), resolved asynchronously
        this.locale = document.documentElement.lang === 'ja' ? 'ja' : 'en';

        // Sync state
        this.isSyncing = false;

        // Current date
        this.currentDate = new Date();
    }

    createElement() {
        const wrapper = super.createElement();

        // Skip if the content is already created
        if (wrapper.children.length > 0) {
            return wrapper;
        }

        // Create the header structure
        const header = document.createElement('div');
        header.id = 'sideTimeTableHeader';

        // Action buttons group (add + sync)
        const actionButtons = this._createActionButtons();

        // Date navigation
        const dateNavigation = this._createDateNavigation();

        // Right-side buttons: the calendar filter (mounted here by the
        // timeline once it exists) and settings
        const rightButtons = document.createElement('div');
        rightButtons.className = 'action-buttons';

        this.filterSlot = document.createElement('div');
        this.filterSlot.className = 'header-filter-slot';
        rightButtons.appendChild(this.filterSlot);

        this.settingsButton = this._createIconButton('settingsIcon', 'fas fa-cog', 'settings', 'Settings');
        rightButtons.appendChild(this.settingsButton);

        // Add the elements to the header
        header.appendChild(actionButtons);
        header.appendChild(dateNavigation);
        header.appendChild(rightButtons);

        wrapper.appendChild(header);

        // Setup the event listeners
        this._setupEventListeners();

        // Set the initial date, then again once the extension language is known
        this._updateDateDisplay();
        this._resolveLocale();

        return wrapper;
    }

    /**
     * A borderless icon button with a tooltip and an accessible name.
     * @param {string} id
     * @param {string} iconClass
     * @param {string} msgKey
     * @param {string} fallback
     * @returns {HTMLButtonElement}
     * @private
     */
    _createIconButton(id, iconClass, msgKey, fallback) {
        const button = document.createElement('button');
        button.type = 'button';
        button.id = id;
        button.className = 'header-icon-btn';
        const label = window.getLocalizedMessage?.(msgKey) || fallback;
        button.title = label;
        button.setAttribute('aria-label', label);
        button.setAttribute('data-localize-title', `__MSG_${msgKey}__`);
        button.setAttribute('data-localize-aria-label', `__MSG_${msgKey}__`);

        const icon = document.createElement('i');
        icon.className = iconClass;
        icon.setAttribute('aria-hidden', 'true');
        button.appendChild(icon);
        return button;
    }

    /**
     * Where the calendar filter button goes.
     * @returns {HTMLElement|null}
     */
    getFilterSlot() {
        if (!this.element) {
            this.createElement();
        }
        return this.filterSlot;
    }

    /**
     * Create action buttons (add + sync)
     * @private
     */
    _createActionButtons() {
        const container = document.createElement('div');
        container.className = 'action-buttons';

        // Add button: the one filled button in the header
        this.addEventButton = this._createIconButton('addLocalEventButton', 'fas fa-plus', 'addEvent', 'Add event');
        this.addEventButton.classList.add('header-add-btn');

        // Sync button
        this.syncButton = this._createIconButton('syncReminderButton', 'fas fa-sync-alt', 'syncReminders', 'Sync reminders');

        container.appendChild(this.addEventButton);
        container.appendChild(this.syncButton);

        return container;
    }

    /**
     * Create date navigation elements. The date is a button showing the day
     * in words; it opens the browser's date picker through a date input that
     * sits invisibly underneath it.
     * @private
     */
    _createDateNavigation() {
        const container = document.createElement('div');
        container.id = 'dateNavigation';

        // The previous day button
        this.prevDateButton = this._createIconButton('prevDateButton', 'fas fa-chevron-left', 'previousDay', 'Previous day');
        this.prevDateButton.classList.add('header-nav-btn');

        const dateWrap = document.createElement('div');
        dateWrap.className = 'header-date';

        this.dateButton = document.createElement('button');
        this.dateButton.type = 'button';
        this.dateButton.id = 'currentDateLabel';
        this.dateButton.className = 'header-date-btn';
        const pickTitle = window.getLocalizedMessage?.('clickToSelectDate') || 'Click to select date';
        this.dateButton.title = pickTitle;
        this.dateButton.setAttribute('data-localize-title', '__MSG_clickToSelectDate__');
        dateWrap.appendChild(this.dateButton);

        // Date input: only the picker behind the button, never focused itself
        this.dateInput = document.createElement('input');
        this.dateInput.type = 'date';
        this.dateInput.id = 'currentDateDisplay';
        this.dateInput.className = 'header-date-input';
        this.dateInput.tabIndex = -1;
        this.dateInput.setAttribute('aria-hidden', 'true');
        dateWrap.appendChild(this.dateInput);

        // The next day button
        this.nextDateButton = this._createIconButton('nextDateButton', 'fas fa-chevron-right', 'nextDay', 'Next day');
        this.nextDateButton.classList.add('header-nav-btn');

        container.appendChild(this.prevDateButton);
        container.appendChild(dateWrap);
        container.appendChild(this.nextDateButton);

        return container;
    }

    /**
     * Setup event listeners
     * @private
     */
    _setupEventListeners() {
        // Add button
        this.addEventListener(this.addEventButton, 'click', () => {
            if (this.onAddEvent) {
                this.onAddEvent();
            }
        });

        // Date navigation
        this.addEventListener(this.prevDateButton, 'click', () => {
            this._navigateDate(-1);
        });

        this.addEventListener(this.nextDateButton, 'click', () => {
            this._navigateDate(1);
        });

        this.addEventListener(this.dateButton, 'click', () => {
            this._openDatePicker();
        });

        this.addEventListener(this.dateInput, 'change', () => {
            this._handleDateInputChange();
        });

        // Sync button
        this.addEventListener(this.syncButton, 'click', () => {
            this._handleSyncClick();
        });

        // Settings button
        this.addEventListener(this.settingsButton, 'click', () => {
            if (this.onSettingsClick) {
                this.onSettingsClick();
            }
        });
    }

    /**
     * Open the browser's date picker under the date label.
     * @private
     */
    _openDatePicker() {
        if (!this.dateInput || this.dateInput.disabled) return;
        try {
            this.dateInput.showPicker();
        } catch {
            // showPicker() refuses when not triggered by the user; clicking
            // the input is the older way to the same picker
            this.dateInput.click();
        }
    }

    /**
     * Resolve the extension language for the date label.
     * @private
     */
    _resolveLocale() {
        if (typeof window.getCurrentLocale !== 'function') return;
        Promise.resolve(window.getCurrentLocale())
            .then((locale) => {
                this.locale = locale === 'ja' ? 'ja' : 'en';
                this._updateDateDisplay();
            })
            .catch(() => {});
    }

    /**
     * Move date by specified number of days
     * @private
     */
    _navigateDate(days) {
        const newDate = new Date(this.currentDate);
        newDate.setDate(newDate.getDate() + days);
        this.setCurrentDate(newDate);
    }

    /**
     * Handle date input change
     * @private
     */
    _handleDateInputChange() {
        const selectedDate = new Date(this.dateInput.value + 'T00:00:00');
        if (!isNaN(selectedDate.getTime())) {
            this.setCurrentDate(selectedDate);
        }
    }

    /**
     * Update date display
     * @private
     */
    _updateDateDisplay() {
        if (this.dateInput) {
            // Set in YYYY-MM-DD format
            const year = this.currentDate.getFullYear();
            const month = String(this.currentDate.getMonth() + 1).padStart(2, '0');
            const day = String(this.currentDate.getDate()).padStart(2, '0');
            this.dateInput.value = `${year}-${month}-${day}`;
        }
        if (this.dateButton) {
            this.dateButton.textContent = formatHeaderDate(this.currentDate, this.locale);
            // Today reads in the accent colour, so another day is recognisable
            // at a glance
            this.dateButton.classList.toggle('is-today', this.isToday());
        }
    }

    /**
     * Set current date
     * @param {Date} date New date
     */
    setCurrentDate(date) {
        if (date instanceof Date && !isNaN(date.getTime())) {
            this.currentDate = new Date(date);
            this._updateDateDisplay();

            // Call callback
            if (this.onDateChange) {
                this.onDateChange(this.currentDate);
            }
        }
    }

    /**
     * Get current date
     * @returns {Date} The current date
     */
    getCurrentDate() {
        return new Date(this.currentDate);
    }

    /**
     * Set to today's date
     */
    setToday() {
        this.setCurrentDate(new Date());
    }

    /**
     * Set button enabled/disabled state
     * @param {boolean} enabled Whether to enable
     */
    setButtonsEnabled(enabled) {
        [
            this.addEventButton,
            this.prevDateButton,
            this.nextDateButton,
            this.dateButton,
            this.settingsButton,
            this.dateInput
        ].forEach(control => {
            if (control) {
                control.disabled = !enabled;
            }
        });
    }

    /**
     * Toggle add button visibility
     * @param {boolean} visible Whether to show
     */
    setAddButtonVisible(visible) {
        if (this.addEventButton) {
            this.addEventButton.style.display = visible ? '' : 'none';
        }
    }

    /**
     * Check if date is today
     * @returns {boolean} true if today
     */
    isToday() {
        const today = new Date();
        return this.currentDate.toDateString() === today.toDateString();
    }

    /**
     * Set date navigation range limits
     * @param {Date|null} minDate Minimum date
     * @param {Date|null} maxDate Maximum date
     */
    setDateRange(minDate = null, maxDate = null) {
        if (this.dateInput) {
            if (minDate instanceof Date) {
                const year = minDate.getFullYear();
                const month = String(minDate.getMonth() + 1).padStart(2, '0');
                const day = String(minDate.getDate()).padStart(2, '0');
                this.dateInput.min = `${year}-${month}-${day}`;
            }

            if (maxDate instanceof Date) {
                const year = maxDate.getFullYear();
                const month = String(maxDate.getMonth() + 1).padStart(2, '0');
                const day = String(maxDate.getDate()).padStart(2, '0');
                this.dateInput.max = `${year}-${month}-${day}`;
            }
        }
    }

    /**
     * Handle sync button click
     * @private
     */
    async _handleSyncClick() {
        if (this.isSyncing) {
            return; // Already syncing
        }

        this.setSyncing(true);

        try {
            if (this.onSyncClick) {
                await this.onSyncClick();
            }
        } catch (error) {
            console.error('Sync failed:', error);
        } finally {
            this.setSyncing(false);
        }
    }

    /**
     * Set syncing state
     * @param {boolean} syncing Whether syncing
     */
    setSyncing(syncing) {
        this.isSyncing = syncing;

        if (this.syncButton) {
            // Spin the icon, not the button, so the focus ring stays still
            this.syncButton.querySelector('i')?.classList.toggle('fa-spin', syncing);
            this.syncButton.classList.toggle('is-syncing', syncing);
            this.syncButton.setAttribute('aria-busy', String(syncing));
        }
    }
}