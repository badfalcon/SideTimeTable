/**
 * ReminderSettingsCard - Reminder settings card component
 */
import { CardComponent } from '../base/card-component.js';
import { createSelect, createSettingRow, createSwitch } from '../base/settings-dom.js';

export class ReminderSettingsCard extends CardComponent {
    constructor(onSettingsChange) {
        super({
            title: 'Reminders',
            titleLocalize: '__MSG_reminderSettings__',
            subtitle: 'Chrome notifications before events start, even with the side panel closed.',
            subtitleLocalize: '__MSG_reminderDescription__',
            icon: 'fas fa-bell'
        });

        this.onSettingsChange = onSettingsChange;

        // Form elements
        this.googleReminderToggle = null;
        this.reminderMinutesSelect = null;
        this.syncIntervalSelect = null;

        // Current settings values
        this.settings = {
            googleEventReminder: false,
            reminderMinutes: 5,
            reminderSyncInterval: 60
        };

        // Available sync interval options (in minutes)
        this.syncIntervalOptions = [
            { value: 15, key: '__MSG_syncInterval15Min__', text: 'Every 15 minutes' },
            { value: 30, key: '__MSG_syncInterval30Min__', text: 'Every 30 minutes' },
            { value: 60, key: '__MSG_syncInterval60Min__', text: 'Every hour' },
            { value: 120, key: '__MSG_syncInterval120Min__', text: 'Every 2 hours' },
            { value: 360, key: '__MSG_syncInterval360Min__', text: 'Every 6 hours' }
        ];

        // Available reminder time options (in minutes)
        this.reminderOptions = [
            { value: 1, key: '__MSG_reminderTime1Min__', text: '1 minute' },
            { value: 3, key: '__MSG_reminderTime3Min__', text: '3 minutes' },
            { value: 5, key: '__MSG_reminderTime5Min__', text: '5 minutes' },
            { value: 10, key: '__MSG_reminderTime10Min__', text: '10 minutes' },
            { value: 15, key: '__MSG_reminderTime15Min__', text: '15 minutes' },
            { value: 30, key: '__MSG_reminderTime30Min__', text: '30 minutes' },
            { value: 60, key: '__MSG_reminderTime60Min__', text: '1 hour' }
        ];
    }

    createElement() {
        const card = super.createElement();

        // Create form elements
        const form = this._createForm();
        this.addContent(form);

        // Setup event listeners
        this._setupEventListeners();

        return card;
    }

    /**
     * Create form: one row per setting
     * @private
     */
    _createForm() {
        const form = document.createElement('form');
        form.className = 'settings-rows';

        this.googleReminderToggle = createSwitch('google-reminder-toggle', this.settings.googleEventReminder);
        form.appendChild(createSettingRow({
            labelKey: 'googleEventReminderLabel',
            labelFallback: 'Notify me about Google Calendar events',
            labelFor: 'google-reminder-toggle',
            hintKey: 'googleEventReminderHelp',
            hintFallback: 'Events on your primary calendar.',
            control: this.googleReminderToggle
        }).row);

        this.reminderMinutesSelect = createSelect('reminder-minutes-select', this.reminderOptions);
        this.reminderMinutesSelect.value = this.settings.reminderMinutes;
        form.appendChild(createSettingRow({
            labelKey: 'reminderTimeLabel',
            labelFallback: 'When to notify',
            labelFor: 'reminder-minutes-select',
            hintKey: 'reminderTimeHelp',
            hintFallback: 'Used for both Google and local events.',
            control: this.reminderMinutesSelect
        }).row);

        this.syncIntervalSelect = createSelect('reminder-sync-interval-select', this.syncIntervalOptions);
        this.syncIntervalSelect.value = this.settings.reminderSyncInterval;
        form.appendChild(createSettingRow({
            labelKey: 'reminderSyncIntervalLabel',
            labelFallback: 'Check for changes',
            labelFor: 'reminder-sync-interval-select',
            hintKey: 'reminderSyncIntervalHelp',
            hintFallback: 'Picks up new and changed events so reminders stay current.',
            control: this.syncIntervalSelect
        }).row);

        return form;
    }

    /**
     * Setup event listeners
     * @private
     */
    _setupEventListeners() {
        if (this.googleReminderToggle) {
            this.googleReminderToggle.addEventListener('change', () => {
                this._handleSettingsChange();
            });
        }

        if (this.reminderMinutesSelect) {
            this.reminderMinutesSelect.addEventListener('change', () => {
                this._handleSettingsChange();
            });
        }

        if (this.syncIntervalSelect) {
            this.syncIntervalSelect.addEventListener('change', () => {
                this._handleSettingsChange();
            });
        }
    }

    /**
     * Handle settings change
     * @private
     */
    _handleSettingsChange() {
        this.settings.googleEventReminder = this.googleReminderToggle.checked;
        this.settings.reminderMinutes = parseInt(this.reminderMinutesSelect.value, 10);
        this.settings.reminderSyncInterval = parseInt(this.syncIntervalSelect.value, 10);

        if (this.onSettingsChange) {
            this.onSettingsChange(this.settings);
        }
    }

    /**
     * Update settings
     * @param {Object} settings Settings object
     */
    updateSettings(settings) {
        if (settings.googleEventReminder !== undefined) {
            this.settings.googleEventReminder = settings.googleEventReminder;
            if (this.googleReminderToggle) {
                this.googleReminderToggle.checked = settings.googleEventReminder;
            }
        }

        if (settings.reminderMinutes !== undefined) {
            this.settings.reminderMinutes = settings.reminderMinutes;
            if (this.reminderMinutesSelect) {
                this.reminderMinutesSelect.value = settings.reminderMinutes;
            }
        }

        if (settings.reminderSyncInterval !== undefined) {
            this.settings.reminderSyncInterval = settings.reminderSyncInterval;
            if (this.syncIntervalSelect) {
                this.syncIntervalSelect.value = settings.reminderSyncInterval;
            }
        }
    }

    /**
     * Reset to defaults
     */
    resetToDefaults() {
        this.settings.googleEventReminder = false;
        this.settings.reminderMinutes = 5;
        this.settings.reminderSyncInterval = 60;

        if (this.googleReminderToggle) {
            this.googleReminderToggle.checked = false;
        }

        if (this.reminderMinutesSelect) {
            this.reminderMinutesSelect.value = '5';
        }

        if (this.syncIntervalSelect) {
            this.syncIntervalSelect.value = '60';
        }
    }

    /**
     * Get current settings
     * @returns {Object} Current settings
     */
    getSettings() {
        return { ...this.settings };
    }
}
