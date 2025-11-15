/**
 * HeaderComponent - Side panel header component
 */
import { Component } from '../base/component.js';

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
        this.dateInput = null;
        this.syncButton = null;
        this.settingsButton = null;

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

        // Add button
        this.addEventButton = document.createElement('i');
        this.addEventButton.className = 'fas fa-plus-circle add-local-event-icon';
        this.addEventButton.id = 'addLocalEventButton';
        this.addEventButton.setAttribute('data-localize-title', '__MSG_addEvent__');

        // Date navigation
        const dateNavigation = this._createDateNavigation();

        // Sync button
        this.syncButton = document.createElement('i');
        this.syncButton.className = 'fas fa-sync sync-icon';
        this.syncButton.id = 'syncReminderButton';
        this.syncButton.setAttribute('data-localize-title', '__MSG_syncReminders__');
        this.syncButton.title = 'Sync Reminders';

        // Settings button
        this.settingsButton = document.createElement('i');
        this.settingsButton.className = 'fas fa-cog settings-icon';
        this.settingsButton.id = 'settingsIcon';
        this.settingsButton.setAttribute('data-localize-title', '__MSG_settings__');

        // Add the elements to the header
        header.appendChild(this.addEventButton);
        header.appendChild(dateNavigation);
        header.appendChild(this.syncButton);
        header.appendChild(this.settingsButton);

        wrapper.appendChild(header);

        // Setup the event listeners
        this._setupEventListeners();

        // Set the initial date
        this._updateDateDisplay();

        return wrapper;
    }

    /**
     * Create date navigation elements
     * @private
     */
    _createDateNavigation() {
        const container = document.createElement('div');
        container.id = 'dateNavigation';

        // The previous day button
        this.prevDateButton = document.createElement('i');
        this.prevDateButton.className = 'fas fa-chevron-left nav-arrow';
        this.prevDateButton.id = 'prevDateButton';
        this.prevDateButton.setAttribute('data-localize-title', '__MSG_previousDay__');

        // Date input
        this.dateInput = document.createElement('input');
        this.dateInput.type = 'date';
        this.dateInput.id = 'currentDateDisplay';
        this.dateInput.setAttribute('data-localize-title', '__MSG_clickToSelectDate__');

        // The next day button
        this.nextDateButton = document.createElement('i');
        this.nextDateButton.className = 'fas fa-chevron-right nav-arrow';
        this.nextDateButton.id = 'nextDateButton';
        this.nextDateButton.setAttribute('data-localize-title', '__MSG_nextDay__');

        container.appendChild(this.prevDateButton);
        container.appendChild(this.dateInput);
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
        const buttons = [
            this.addEventButton,
            this.prevDateButton,
            this.nextDateButton,
            this.settingsButton
        ];

        buttons.forEach(button => {
            if (button) {
                button.style.pointerEvents = enabled ? '' : 'none';
                button.style.opacity = enabled ? '' : '0.5';
            }
        });

        if (this.dateInput) {
            this.dateInput.disabled = !enabled;
        }
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
            if (syncing) {
                // Add spinning animation
                this.syncButton.classList.add('fa-spin');
                this.syncButton.style.pointerEvents = 'none';
                this.syncButton.style.opacity = '0.6';
            } else {
                // Remove spinning animation
                this.syncButton.classList.remove('fa-spin');
                this.syncButton.style.pointerEvents = '';
                this.syncButton.style.opacity = '';
            }
        }
    }
}