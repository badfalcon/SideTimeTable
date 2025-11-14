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

        // Current settings values
        this.settings = {
            googleEventReminder: false
        };
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
     * Setup event listeners
     * @private
     */
    _setupEventListeners() {
        if (this.googleReminderToggle) {
            this.googleReminderToggle.addEventListener('change', () => {
                this._handleGoogleReminderChange();
            });
        }
    }

    /**
     * Handle Google reminder toggle change
     * @private
     */
    _handleGoogleReminderChange() {
        this.settings.googleEventReminder = this.googleReminderToggle.checked;

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
    }

    /**
     * Reset to defaults
     */
    resetToDefaults() {
        this.settings.googleEventReminder = false;
        if (this.googleReminderToggle) {
            this.googleReminderToggle.checked = false;
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
