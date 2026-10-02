/**
 * TimeSettingsCard - Time settings card component
 */
import { CardComponent } from '../base/card-component.js';
import { createTimeField } from '../../../lib/time-field.js';
import { createNotice, createSettingRow, createSwitch, msg } from '../base/settings-dom.js';

export class TimeSettingsCard extends CardComponent {
    constructor(onSettingsChange) {
        super({
            title: 'Time',
            titleLocalize: '__MSG_timeSettings__',
            icon: 'fas fa-clock'
        });

        this.onSettingsChange = onSettingsChange;

        // The form elements
        this.openTimeInput = null;
        this.closeTimeInput = null;
        this.breakTimeFixedCheckbox = null;
        this.breakTimeStartInput = null;
        this.breakTimeEndInput = null;

        // The current settings values
        this.settings = {
            openTime: '09:00',
            closeTime: '18:00',
            breakTimeFixed: false,
            breakTimeStart: '12:00',
            breakTimeEnd: '13:00'
        };
    }

    createElement() {
        const card = super.createElement();

        // Create the form elements
        const form = this._createForm();
        this.addContent(form);

        // Set up the event listeners
        this._setupEventListeners();

        return card;
    }

    /**
     * Create form: work hours, then break time with its on/off switch
     * @private
     */
    _createForm() {
        const form = document.createElement('form');
        form.className = 'settings-rows';

        this.openTimeInput = this._createTimeInput('time-settings-open-time', this.settings.openTime, 'startTime');
        this.closeTimeInput = this._createTimeInput('time-settings-close-time', this.settings.closeTime, 'endTime');
        form.appendChild(createSettingRow({
            labelKey: 'workHoursLabel',
            labelFallback: 'Work hours',
            labelFor: 'time-settings-open-time',
            hintKey: 'workHoursHint',
            hintFallback: 'Shown as a band on the timeline.',
            control: this._createTimeRange(this.openTimeInput, this.closeTimeInput)
        }).row);

        this.breakTimeStartInput = this._createTimeInput('time-settings-break-time-start', this.settings.breakTimeStart, 'startTime');
        this.breakTimeEndInput = this._createTimeInput('time-settings-break-time-end', this.settings.breakTimeEnd, 'endTime');
        this.breakTimeStartInput.disabled = !this.settings.breakTimeFixed;
        this.breakTimeEndInput.disabled = !this.settings.breakTimeFixed;
        this.breakTimeFixedCheckbox = createSwitch('time-settings-break-time-fixed', this.settings.breakTimeFixed);
        form.appendChild(createSettingRow({
            labelKey: 'breakTimeLabel',
            labelFallback: 'Break',
            labelFor: 'time-settings-break-time-fixed',
            hintKey: 'breakTimeHint',
            hintFallback: 'Shows the same break on the timeline every day.',
            control: [
                this._createTimeRange(this.breakTimeStartInput, this.breakTimeEndInput),
                this.breakTimeFixedCheckbox
            ]
        }).row);

        return form;
    }

    /**
     * @param {string} id
     * @param {string} value
     * @param {string} ariaKey - 'startTime' or 'endTime'
     * @returns {HTMLInputElement}
     * @private
     */
    _createTimeInput(id, value, ariaKey) {
        // In the extension's language and 12/24-hour setting, with a list of
        // times every 15 minutes
        const input = createTimeField({ id, className: 'settings-input settings-time-input' });
        input.value = value;
        input.setAttribute('aria-label', msg(ariaKey, ariaKey === 'startTime' ? 'Start time' : 'End time'));
        input.setAttribute('data-localize-aria-label', `__MSG_${ariaKey}__`);
        return input;
    }

    /**
     * Start – end.
     * @private
     */
    _createTimeRange(start, end) {
        const range = document.createElement('div');
        range.className = 'settings-time-range';
        const dash = document.createElement('span');
        dash.className = 'settings-time-dash';
        dash.setAttribute('aria-hidden', 'true');
        dash.textContent = '–';
        range.appendChild(start);
        range.appendChild(dash);
        range.appendChild(end);
        return range;
    }

    /**
     * Set up event listeners
     * @private
     */
    _setupEventListeners() {
        // Work hours change
        this.openTimeInput?.addEventListener('change', () => this._handleTimeChange());
        this.closeTimeInput?.addEventListener('change', () => this._handleTimeChange());

        // Fixed break time checkbox
        this.breakTimeFixedCheckbox?.addEventListener('change', (e) => {
            const isFixed = e.target.checked;
            this.breakTimeStartInput.disabled = !isFixed;
            this.breakTimeEndInput.disabled = !isFixed;
            this._handleTimeChange();
        });

        // Break time change
        this.breakTimeStartInput?.addEventListener('change', () => this._handleTimeChange());
        this.breakTimeEndInput?.addEventListener('change', () => this._handleTimeChange());
    }

    /**
     * Handle time settings change
     * @private
     */
    _handleTimeChange() {
        const newSettings = this.getSettings();

        // Validation
        if (!this._validateTimeSettings(newSettings)) {
            return;
        }

        this.settings = newSettings;

        // Callback with changes
        if (this.onSettingsChange) {
            this.onSettingsChange(newSettings);
        }
    }

    /**
     * Validate time settings
     * @private
     */
    _validateTimeSettings(settings) {
        // Validate work hours
        if (settings.openTime >= settings.closeTime) {
            this._showValidationError(window.getLocalizedMessage('validationEndTimeAfterStart') || 'End time must be after start time');
            return false;
        }

        // Validate break time (when fixed)
        if (settings.breakTimeFixed) {
            if (settings.breakTimeStart >= settings.breakTimeEnd) {
                this._showValidationError(window.getLocalizedMessage('validationBreakEndAfterStart') || 'Break end time must be after start time');
                return false;
            }

            // Check if break time is within work hours
            if (settings.breakTimeStart < settings.openTime ||
                settings.breakTimeEnd > settings.closeTime) {
                this._showValidationError(window.getLocalizedMessage('validationBreakWithinWork') || 'Break time must be within work hours');
                return false;
            }
        }

        return true;
    }

    /**
     * Show validation error
     * @private
     */
    _showValidationError(message) {
        this.bodyElement?.querySelector('.time-validation-error')?.remove();
        const el = createNotice({ content: message, tone: 'danger', duration: 3000, className: 'time-validation-error' });
        this.bodyElement.appendChild(el);
    }

    /**
     * Get current settings
     */
    getSettings() {
        return {
            openTime: this.openTimeInput?.value || this.settings.openTime,
            closeTime: this.closeTimeInput?.value || this.settings.closeTime,
            breakTimeFixed: this.breakTimeFixedCheckbox?.checked || false,
            breakTimeStart: this.breakTimeStartInput?.value || this.settings.breakTimeStart,
            breakTimeEnd: this.breakTimeEndInput?.value || this.settings.breakTimeEnd
        };
    }

    /**
     * Update settings
     */
    updateSettings(settings) {
        this.settings = { ...this.settings, ...settings };

        if (this.openTimeInput) this.openTimeInput.value = this.settings.openTime;
        if (this.closeTimeInput) this.closeTimeInput.value = this.settings.closeTime;
        if (this.breakTimeFixedCheckbox) this.breakTimeFixedCheckbox.checked = this.settings.breakTimeFixed;
        if (this.breakTimeStartInput) {
            this.breakTimeStartInput.value = this.settings.breakTimeStart;
            this.breakTimeStartInput.disabled = !this.settings.breakTimeFixed;
        }
        if (this.breakTimeEndInput) {
            this.breakTimeEndInput.value = this.settings.breakTimeEnd;
            this.breakTimeEndInput.disabled = !this.settings.breakTimeFixed;
        }
    }

    /**
     * Reset to default settings
     */
    resetToDefaults() {
        const defaultSettings = {
            openTime: '09:00',
            closeTime: '18:00',
            breakTimeFixed: false,
            breakTimeStart: '12:00',
            breakTimeEnd: '13:00'
        };

        this.updateSettings(defaultSettings);
        this._handleTimeChange();
    }
}