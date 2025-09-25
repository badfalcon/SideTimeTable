/**
 * TimeSettingsCard - Time settings card component
 */
import { CardComponent } from '../base/card-component.js';
import { generateTimeList } from '../../../lib/utils.js';

export class TimeSettingsCard extends CardComponent {
    constructor(onSettingsChange) {
        super({
            title: 'Time Settings',
            titleLocalize: '__MSG_timeSettings__',
            icon: 'fas fa-clock',
            iconColor: 'text-info'
        });

        this.onSettingsChange = onSettingsChange;

        // Form elements
        this.openTimeInput = null;
        this.closeTimeInput = null;
        this.breakTimeFixedCheckbox = null;
        this.breakTimeStartInput = null;
        this.breakTimeEndInput = null;
        this.timeDatalist = null;

        // Current settings values
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

        // Create form elements
        const form = this._createForm();
        this.addContent(form);

        // Generate time list
        this._generateTimeList();

        // Set up event listeners
        this._setupEventListeners();

        return card;
    }

    /**
     * Create form
     * @private
     */
    _createForm() {
        const form = document.createElement('form');

        // Work hours section
        const workHoursSection = this._createWorkHoursSection();
        form.appendChild(workHoursSection);

        // Break time section
        const breakTimeSection = this._createBreakTimeSection();
        form.appendChild(breakTimeSection);

        // Time selection list
        this.timeDatalist = document.createElement('datalist');
        this.timeDatalist.id = 'time-settings-time-list';
        form.appendChild(this.timeDatalist);

        return form;
    }

    /**
     * Create work hours section
     * @private
     */
    _createWorkHoursSection() {
        const section = document.createElement('div');
        section.className = 'mb-3';

        // Label
        const label = document.createElement('label');
        label.htmlFor = 'time-settings-open-time';
        label.className = 'form-label';
        label.setAttribute('data-localize', '__MSG_workHours__');
        label.textContent = 'Work Hours:';

        // Input group
        const inputGroup = document.createElement('div');
        inputGroup.className = 'input-group';

        // Start time
        this.openTimeInput = document.createElement('input');
        this.openTimeInput.type = 'time';
        this.openTimeInput.className = 'form-control';
        this.openTimeInput.id = 'time-settings-open-time';
        this.openTimeInput.step = '900'; // 15-minute increments
        this.openTimeInput.value = this.settings.openTime;
        this.openTimeInput.setAttribute('list', 'time-settings-time-list');
        this.openTimeInput.setAttribute('data-localize-aria-label', '__MSG_startTime__');

        // Separator
        const separator = document.createElement('span');
        separator.className = 'input-group-text';
        separator.setAttribute('data-localize', '__MSG_to__');
        separator.textContent = '～';

        // End time
        this.closeTimeInput = document.createElement('input');
        this.closeTimeInput.type = 'time';
        this.closeTimeInput.className = 'form-control';
        this.closeTimeInput.id = 'time-settings-close-time';
        this.closeTimeInput.step = '900';
        this.closeTimeInput.value = this.settings.closeTime;
        this.closeTimeInput.setAttribute('list', 'time-settings-time-list');
        this.closeTimeInput.setAttribute('data-localize-aria-label', '__MSG_endTime__');

        inputGroup.appendChild(this.openTimeInput);
        inputGroup.appendChild(separator);
        inputGroup.appendChild(this.closeTimeInput);

        section.appendChild(label);
        section.appendChild(inputGroup);

        return section;
    }

    /**
     * Create break time section
     * @private
     */
    _createBreakTimeSection() {
        const section = document.createElement('div');
        section.className = 'mb-3';

        // Label
        const label = document.createElement('label');
        label.htmlFor = 'time-settings-break-time-fixed';
        label.className = 'form-label';
        label.setAttribute('data-localize', '__MSG_breakTime__');
        label.textContent = 'Break Time:';

        // Checkbox
        const checkboxDiv = document.createElement('div');
        checkboxDiv.className = 'form-check mb-2';

        this.breakTimeFixedCheckbox = document.createElement('input');
        this.breakTimeFixedCheckbox.type = 'checkbox';
        this.breakTimeFixedCheckbox.className = 'form-check-input';
        this.breakTimeFixedCheckbox.id = 'time-settings-break-time-fixed';
        this.breakTimeFixedCheckbox.checked = this.settings.breakTimeFixed;

        const checkboxLabel = document.createElement('label');
        checkboxLabel.className = 'form-check-label';
        checkboxLabel.htmlFor = 'time-settings-break-time-fixed';
        checkboxLabel.setAttribute('data-localize', '__MSG_fixed__');
        checkboxLabel.textContent = 'Fixed';

        checkboxDiv.appendChild(this.breakTimeFixedCheckbox);
        checkboxDiv.appendChild(checkboxLabel);

        // Time input group
        const inputGroup = document.createElement('div');
        inputGroup.className = 'input-group';

        // Start time
        this.breakTimeStartInput = document.createElement('input');
        this.breakTimeStartInput.type = 'time';
        this.breakTimeStartInput.className = 'form-control';
        this.breakTimeStartInput.id = 'time-settings-break-time-start';
        this.breakTimeStartInput.step = '900';
        this.breakTimeStartInput.value = this.settings.breakTimeStart;
        this.breakTimeStartInput.disabled = !this.settings.breakTimeFixed;
        this.breakTimeStartInput.setAttribute('list', 'time-settings-time-list');
        this.breakTimeStartInput.setAttribute('data-localize-aria-label', '__MSG_startTime__');

        // Separator
        const separator = document.createElement('span');
        separator.className = 'input-group-text';
        separator.setAttribute('data-localize', '__MSG_to__');
        separator.textContent = '～';

        // End time
        this.breakTimeEndInput = document.createElement('input');
        this.breakTimeEndInput.type = 'time';
        this.breakTimeEndInput.className = 'form-control';
        this.breakTimeEndInput.id = 'time-settings-break-time-end';
        this.breakTimeEndInput.step = '900';
        this.breakTimeEndInput.value = this.settings.breakTimeEnd;
        this.breakTimeEndInput.disabled = !this.settings.breakTimeFixed;
        this.breakTimeEndInput.setAttribute('list', 'time-settings-time-list');
        this.breakTimeEndInput.setAttribute('data-localize-aria-label', '__MSG_endTime__');

        inputGroup.appendChild(this.breakTimeStartInput);
        inputGroup.appendChild(separator);
        inputGroup.appendChild(this.breakTimeEndInput);

        section.appendChild(label);
        section.appendChild(checkboxDiv);
        section.appendChild(inputGroup);

        return section;
    }

    /**
     * Generate time selection list
     * @private
     */
    _generateTimeList() {
        if (this.timeDatalist) {
            generateTimeList(this.timeDatalist);
        }
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
            this._showValidationError('End time must be after start time');
            return false;
        }

        // Validate break time (when fixed)
        if (settings.breakTimeFixed) {
            if (settings.breakTimeStart >= settings.breakTimeEnd) {
                this._showValidationError('Break end time must be after start time');
                return false;
            }

            // Check if break time is within work hours
            if (settings.breakTimeStart < settings.openTime ||
                settings.breakTimeEnd > settings.closeTime) {
                this._showValidationError('Break time must be within work hours');
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
        // Remove existing error message
        const existingError = this.element.querySelector('.time-validation-error');
        if (existingError) {
            existingError.remove();
        }

        // Create error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'alert alert-warning alert-dismissible fade show time-validation-error mt-2';
        errorDiv.innerHTML = `
            <small><strong>Warning:</strong> ${message}</small>
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        this.bodyElement.appendChild(errorDiv);

        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 3000);
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