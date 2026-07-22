/**
 * ReminderSettingsCard - Reminder settings card component
 */
import { CardComponent } from '../base/card-component.js';

export class ReminderSettingsCard extends CardComponent {
    constructor(onSettingsChange) {
        super({
            title: 'Reminder Settings',
            titleLocalize: '__MSG_reminderSettings__',
            subtitle: 'Configure automatic reminders for your events.',
            subtitleLocalize: '__MSG_reminderDescription__',
            icon: 'fas fa-bell',
            iconColor: 'text-primary'
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
     * Create form
     * @private
     */
    _createForm() {
        const form = document.createElement('form');

        // Google event reminder toggle
        const googleReminderSection = this._createGoogleReminderToggle();
        form.appendChild(googleReminderSection);

        // Reminder time selection
        const reminderTimeSection = this._createReminderTimeSelect();
        form.appendChild(reminderTimeSection);

        // Sync interval selection
        const syncIntervalSection = this._createSyncIntervalSelect();
        form.appendChild(syncIntervalSection);

        return form;
    }

    /**
     * Create sync interval selection
     * @private
     */
    _createSyncIntervalSelect() {
        const container = document.createElement('div');
        container.className = 'mb-3';

        // Label
        const label = document.createElement('label');
        label.className = 'form-label fw-semibold';
        label.htmlFor = 'reminder-sync-interval-select';
        label.setAttribute('data-localize', '__MSG_reminderSyncIntervalLabel__');
        label.textContent = window.getLocalizedMessage('reminderSyncIntervalLabel') || 'Check Google Calendar for changes:';

        // Select box
        this.syncIntervalSelect = document.createElement('select');
        this.syncIntervalSelect.className = 'form-select';
        this.syncIntervalSelect.id = 'reminder-sync-interval-select';

        // Add options
        this.syncIntervalOptions.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option.value;
            optionElement.setAttribute('data-localize', option.key);
            optionElement.textContent = option.text;

            if (option.value === this.settings.reminderSyncInterval) {
                optionElement.selected = true;
            }

            this.syncIntervalSelect.appendChild(optionElement);
        });

        // Help text
        const helpText = document.createElement('small');
        helpText.className = 'form-text text-muted mt-1';
        helpText.setAttribute('data-localize', '__MSG_reminderSyncIntervalHelp__');
        helpText.textContent = window.getLocalizedMessage('reminderSyncIntervalHelp') || 'How often to look for newly added or rescheduled Google Calendar events so their reminders stay up to date.';

        container.appendChild(label);
        container.appendChild(this.syncIntervalSelect);
        container.appendChild(helpText);

        return container;
    }

    /**
     * Create Google event reminder toggle
     * @private
     */
    _createGoogleReminderToggle() {
        const container = document.createElement('div');
        container.className = 'mb-3';

        const formCheck = document.createElement('div');
        formCheck.className = 'form-check form-switch';

        // Checkbox
        this.googleReminderToggle = document.createElement('input');
        this.googleReminderToggle.type = 'checkbox';
        this.googleReminderToggle.className = 'form-check-input';
        this.googleReminderToggle.id = 'google-reminder-toggle';
        this.googleReminderToggle.checked = this.settings.googleEventReminder;

        // Label
        const label = document.createElement('label');
        label.className = 'form-check-label fw-semibold';
        label.htmlFor = 'google-reminder-toggle';
        label.setAttribute('data-localize', '__MSG_googleEventReminderLabel__');
        label.textContent = window.getLocalizedMessage('googleEventReminderLabel') || 'Enable reminders for Google Calendar events';

        // Help text
        const helpText = document.createElement('small');
        helpText.className = 'form-text text-muted d-block mt-1';
        helpText.setAttribute('data-localize', '__MSG_googleEventReminderHelp__');
        helpText.textContent = window.getLocalizedMessage('googleEventReminderHelp') || 'You will receive notifications 5 minutes before each event starts, even when the side panel is closed.';

        formCheck.appendChild(this.googleReminderToggle);
        formCheck.appendChild(label);
        container.appendChild(formCheck);
        container.appendChild(helpText);

        return container;
    }

    /**
     * Create reminder time selection
     * @private
     */
    _createReminderTimeSelect() {
        const container = document.createElement('div');
        container.className = 'mb-3';

        // Label
        const label = document.createElement('label');
        label.className = 'form-label fw-semibold';
        label.htmlFor = 'reminder-minutes-select';
        label.setAttribute('data-localize', '__MSG_reminderTimeLabel__');
        label.textContent = window.getLocalizedMessage('reminderTimeLabel') || 'Notify me before:';

        // Select box
        this.reminderMinutesSelect = document.createElement('select');
        this.reminderMinutesSelect.className = 'form-select';
        this.reminderMinutesSelect.id = 'reminder-minutes-select';

        // Add options
        this.reminderOptions.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option.value;
            optionElement.setAttribute('data-localize', option.key);
            optionElement.textContent = option.text;

            if (option.value === this.settings.reminderMinutes) {
                optionElement.selected = true;
            }

            this.reminderMinutesSelect.appendChild(optionElement);
        });

        // Help text
        const helpText = document.createElement('small');
        helpText.className = 'form-text text-muted mt-1';
        helpText.setAttribute('data-localize', '__MSG_reminderTimeHelp__');
        helpText.textContent = window.getLocalizedMessage('reminderTimeHelp') || 'This applies to both Google Calendar events and local events.';

        container.appendChild(label);
        container.appendChild(this.reminderMinutesSelect);
        container.appendChild(helpText);

        return container;
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
