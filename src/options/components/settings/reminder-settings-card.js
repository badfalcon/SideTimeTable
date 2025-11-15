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

        // Current settings values
        this.settings = {
            googleEventReminder: false,
            reminderMinutes: 5
        };

        // Available reminder time options (in minutes)
        this.reminderOptions = [
            { value: 1, key: '__MSG_reminderTime1Min__', text: '1 minute' },
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

        // Debug/test section
        const debugSection = this._createDebugSection();
        form.appendChild(debugSection);

        return form;
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
        label.textContent = 'Enable reminders for Google Calendar events';

        // Help text
        const helpText = document.createElement('small');
        helpText.className = 'form-text text-muted d-block mt-1';
        helpText.setAttribute('data-localize', '__MSG_googleEventReminderHelp__');
        helpText.textContent = 'You will receive notifications 5 minutes before each event starts, even when the side panel is closed.';

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
        label.textContent = 'Notify me before:';

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
        helpText.textContent = 'This applies to both Google Calendar events and local events.';

        container.appendChild(label);
        container.appendChild(this.reminderMinutesSelect);
        container.appendChild(helpText);

        return container;
    }

    /**
     * Create debug/test section
     * @private
     */
    _createDebugSection() {
        const container = document.createElement('div');
        container.className = 'mb-3 p-3 bg-light border rounded';

        const heading = document.createElement('h6');
        heading.textContent = 'Debug & Test';
        heading.className = 'mb-2';
        container.appendChild(heading);

        // Test notification button
        const testButton = document.createElement('button');
        testButton.type = 'button';
        testButton.className = 'btn btn-sm btn-outline-primary me-2';
        testButton.textContent = 'Test Notification';
        testButton.onclick = () => this._testNotification();
        container.appendChild(testButton);

        // Force sync button
        const syncButton = document.createElement('button');
        syncButton.type = 'button';
        syncButton.className = 'btn btn-sm btn-outline-secondary me-2';
        syncButton.textContent = 'Force Sync Now';
        syncButton.onclick = () => this._forceSyncReminders();
        container.appendChild(syncButton);

        // Debug info button
        const debugButton = document.createElement('button');
        debugButton.type = 'button';
        debugButton.className = 'btn btn-sm btn-outline-info';
        debugButton.textContent = 'Show Debug Info';
        debugButton.onclick = () => this._showDebugInfo();
        container.appendChild(debugButton);

        // Debug output area
        this.debugOutput = document.createElement('pre');
        this.debugOutput.className = 'mt-2 p-2 bg-white border rounded';
        this.debugOutput.style.cssText = 'font-size: 11px; max-height: 200px; overflow-y: auto; display: none;';
        container.appendChild(this.debugOutput);

        return container;
    }

    /**
     * Test notification
     * @private
     */
    async _testNotification() {
        try {
            const response = await chrome.runtime.sendMessage({ action: 'testReminder' });
            if (response.success) {
                alert('Test notification sent! Check your notifications.');
            } else {
                alert('Failed to send test notification: ' + response.error);
            }
        } catch (error) {
            alert('Error: ' + error.message);
        }
    }

    /**
     * Force sync reminders
     * @private
     */
    async _forceSyncReminders() {
        try {
            const response = await chrome.runtime.sendMessage({ action: 'forceSyncReminders' });
            if (response.success) {
                alert('Reminder sync completed! Check background console for logs.');
            } else {
                alert('Failed to sync reminders: ' + response.error);
            }
        } catch (error) {
            alert('Error: ' + error.message);
        }
    }

    /**
     * Show debug info
     * @private
     */
    async _showDebugInfo() {
        try {
            const response = await chrome.runtime.sendMessage({ action: 'debugAlarms' });
            if (response.success) {
                const info = {
                    settings: response.settings,
                    alarms: response.alarms,
                    timestamp: new Date().toLocaleString()
                };
                this.debugOutput.textContent = JSON.stringify(info, null, 2);
                this.debugOutput.style.display = 'block';
            } else {
                alert('Failed to get debug info: ' + response.error);
            }
        } catch (error) {
            alert('Error: ' + error.message);
        }
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
    }

    /**
     * Handle settings change
     * @private
     */
    _handleSettingsChange() {
        this.settings.googleEventReminder = this.googleReminderToggle.checked;
        this.settings.reminderMinutes = parseInt(this.reminderMinutesSelect.value, 10);

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
    }

    /**
     * Reset to defaults
     */
    resetToDefaults() {
        this.settings.googleEventReminder = false;
        this.settings.reminderMinutes = 5;

        if (this.googleReminderToggle) {
            this.googleReminderToggle.checked = false;
        }

        if (this.reminderMinutesSelect) {
            this.reminderMinutesSelect.value = '5';
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
