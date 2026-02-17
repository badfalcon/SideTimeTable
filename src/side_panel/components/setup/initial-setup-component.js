/**
 * InitialSetupComponent - First-launch setup wizard
 *
 * A step-by-step wizard that guides new users through initial configuration:
 * 1. Language selection
 * 2. Work hours setup
 * 3. Google Calendar integration
 * 4. Notification/reminder settings
 */
import { Component } from '../base/component.js';
import { StorageHelper } from '../../../lib/storage-helper.js';
import { DEFAULT_SETTINGS, saveSettings, loadSettings } from '../../../lib/utils.js';

const SETUP_STORAGE_KEY = 'initialSetupCompleted';

export class InitialSetupComponent extends Component {
    constructor(options = {}) {
        super({
            id: 'initialSetupOverlay',
            className: 'setup-overlay',
            hidden: true,
            ...options
        });

        this.currentStep = 0;
        this.steps = [];
        this.backdropElement = null;
        this.cardElement = null;
        this.onComplete = options.onComplete || null;

        // Collected settings
        this.setupData = {
            language: 'auto',
            openTime: DEFAULT_SETTINGS.openTime,
            closeTime: DEFAULT_SETTINGS.closeTime,
            googleIntegrated: false,
            googleEventReminder: false,
            reminderMinutes: 5
        };
    }

    createElement() {
        const el = super.createElement();

        if (el.children.length > 0) {
            return el;
        }

        // Backdrop
        this.backdropElement = document.createElement('div');
        this.backdropElement.className = 'setup-backdrop';
        el.appendChild(this.backdropElement);

        // Card container
        this.cardElement = document.createElement('div');
        this.cardElement.className = 'setup-card';
        el.appendChild(this.cardElement);

        // ESC to close
        this.addEventListener(document, 'keydown', (e) => {
            if (e.key === 'Escape' && this._isActive()) {
                this._finish();
            }
        });

        return el;
    }

    /**
     * Define wizard steps
     * @private
     */
    _defineSteps() {
        this.steps = [
            { id: 'language', render: () => this._renderLanguageStep() },
            { id: 'workHours', render: () => this._renderWorkHoursStep() },
            { id: 'google', render: () => this._renderGoogleStep() },
            { id: 'reminder', render: () => this._renderReminderStep() }
        ];
    }

    /**
     * Check if setup should be shown (first launch)
     * @returns {Promise<boolean>}
     */
    async shouldShow() {
        try {
            const data = await StorageHelper.get([SETUP_STORAGE_KEY], {});
            return !data[SETUP_STORAGE_KEY];
        } catch {
            return false;
        }
    }

    /**
     * Start the setup wizard
     */
    async start() {
        this._defineSteps();
        this.currentStep = 0;

        // Load current settings as defaults
        try {
            const settings = await loadSettings();
            this.setupData.openTime = settings.openTime || DEFAULT_SETTINGS.openTime;
            this.setupData.closeTime = settings.closeTime || DEFAULT_SETTINGS.closeTime;
            this.setupData.googleEventReminder = settings.googleEventReminder || false;
            this.setupData.reminderMinutes = settings.reminderMinutes || 5;
        } catch {
            // Use defaults
        }

        // Load language setting
        try {
            const langData = await new Promise((resolve) => {
                chrome.storage.sync.get(['language'], resolve);
            });
            this.setupData.language = langData.language || 'auto';
        } catch {
            // Use default
        }

        if (!this.element) {
            this.createElement();
        }

        this.element.style.display = '';
        this.element.removeAttribute('hidden');

        this._renderStep();
    }

    /**
     * Render the current step
     * @private
     */
    _renderStep() {
        const step = this.steps[this.currentStep];
        if (!step) {
            this._finish();
            return;
        }

        this.cardElement.innerHTML = '';
        this.cardElement.style.animation = 'none';
        // Trigger reflow for animation restart
        void this.cardElement.offsetHeight;
        this.cardElement.style.animation = '';

        // Progress indicator
        const progress = document.createElement('div');
        progress.className = 'setup-progress';
        for (let i = 0; i < this.steps.length; i++) {
            const dot = document.createElement('div');
            dot.className = 'setup-progress-dot' + (i === this.currentStep ? ' active' : '') + (i < this.currentStep ? ' completed' : '');
            progress.appendChild(dot);
        }
        this.cardElement.appendChild(progress);

        // Step content
        const content = step.render();
        this.cardElement.appendChild(content);

        // Navigation buttons
        const nav = document.createElement('div');
        nav.className = 'setup-nav';

        if (this.currentStep > 0) {
            const backBtn = document.createElement('button');
            backBtn.className = 'setup-btn setup-btn-secondary';
            backBtn.textContent = this._getMessage('setupBack');
            backBtn.addEventListener('click', () => this._prevStep());
            nav.appendChild(backBtn);
        }

        const skipBtn = document.createElement('button');
        skipBtn.className = 'setup-btn setup-btn-skip';
        skipBtn.textContent = this._getMessage('setupSkipAll');
        skipBtn.addEventListener('click', () => this._finish());
        nav.appendChild(skipBtn);

        const isLast = this.currentStep === this.steps.length - 1;
        const nextBtn = document.createElement('button');
        nextBtn.className = 'setup-btn setup-btn-primary';
        nextBtn.textContent = isLast ? this._getMessage('setupComplete') : this._getMessage('setupNext');
        nextBtn.addEventListener('click', () => {
            if (isLast) {
                this._finish();
            } else {
                this._nextStep();
            }
        });
        nav.appendChild(nextBtn);

        this.cardElement.appendChild(nav);
    }

    // --- Step renderers ---

    /**
     * Language selection step
     * @private
     */
    _renderLanguageStep() {
        const container = document.createElement('div');
        container.className = 'setup-step-content';

        const title = document.createElement('h3');
        title.className = 'setup-step-title';
        title.textContent = this._getMessage('setupLanguageTitle');
        container.appendChild(title);

        const desc = document.createElement('p');
        desc.className = 'setup-step-desc';
        desc.textContent = this._getMessage('setupLanguageDesc');
        container.appendChild(desc);

        const options = [
            { value: 'auto', labelKey: 'setupLanguageAuto' },
            { value: 'en', labelKey: 'setupLanguageEn' },
            { value: 'ja', labelKey: 'setupLanguageJa' }
        ];

        const group = document.createElement('div');
        group.className = 'setup-option-group';

        options.forEach(opt => {
            const label = document.createElement('label');
            label.className = 'setup-radio-label' + (this.setupData.language === opt.value ? ' selected' : '');

            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = 'setupLanguage';
            radio.value = opt.value;
            radio.checked = this.setupData.language === opt.value;
            radio.addEventListener('change', () => {
                this.setupData.language = opt.value;
                // Update visual selection
                group.querySelectorAll('.setup-radio-label').forEach(l => l.classList.remove('selected'));
                label.classList.add('selected');
            });

            const text = document.createElement('span');
            text.textContent = this._getMessage(opt.labelKey);

            label.appendChild(radio);
            label.appendChild(text);
            group.appendChild(label);
        });

        container.appendChild(group);
        return container;
    }

    /**
     * Work hours step
     * @private
     */
    _renderWorkHoursStep() {
        const container = document.createElement('div');
        container.className = 'setup-step-content';

        const title = document.createElement('h3');
        title.className = 'setup-step-title';
        title.textContent = this._getMessage('setupWorkHoursTitle');
        container.appendChild(title);

        const desc = document.createElement('p');
        desc.className = 'setup-step-desc';
        desc.textContent = this._getMessage('setupWorkHoursDesc');
        container.appendChild(desc);

        const formGroup = document.createElement('div');
        formGroup.className = 'setup-form-group';

        // Start time
        const startLabel = document.createElement('label');
        startLabel.className = 'setup-time-label';
        startLabel.textContent = this._getMessage('setupWorkStart');

        const startInput = document.createElement('input');
        startInput.type = 'time';
        startInput.className = 'setup-time-input';
        startInput.value = this.setupData.openTime;
        startInput.addEventListener('change', () => {
            this.setupData.openTime = startInput.value;
        });

        const startRow = document.createElement('div');
        startRow.className = 'setup-time-row';
        startRow.appendChild(startLabel);
        startRow.appendChild(startInput);
        formGroup.appendChild(startRow);

        // End time
        const endLabel = document.createElement('label');
        endLabel.className = 'setup-time-label';
        endLabel.textContent = this._getMessage('setupWorkEnd');

        const endInput = document.createElement('input');
        endInput.type = 'time';
        endInput.className = 'setup-time-input';
        endInput.value = this.setupData.closeTime;
        endInput.addEventListener('change', () => {
            this.setupData.closeTime = endInput.value;
        });

        const endRow = document.createElement('div');
        endRow.className = 'setup-time-row';
        endRow.appendChild(endLabel);
        endRow.appendChild(endInput);
        formGroup.appendChild(endRow);

        container.appendChild(formGroup);
        return container;
    }

    /**
     * Google Calendar integration step
     * @private
     */
    _renderGoogleStep() {
        const container = document.createElement('div');
        container.className = 'setup-step-content';

        const title = document.createElement('h3');
        title.className = 'setup-step-title';
        title.textContent = this._getMessage('setupGoogleTitle');
        container.appendChild(title);

        const desc = document.createElement('p');
        desc.className = 'setup-step-desc';
        desc.textContent = this._getMessage('setupGoogleDesc');
        container.appendChild(desc);

        const toggleGroup = document.createElement('div');
        toggleGroup.className = 'setup-toggle-group';

        const toggleLabel = document.createElement('label');
        toggleLabel.className = 'setup-toggle-label';

        const toggle = document.createElement('input');
        toggle.type = 'checkbox';
        toggle.className = 'setup-toggle-input';
        toggle.checked = this.setupData.googleIntegrated;
        toggle.addEventListener('change', () => {
            this.setupData.googleIntegrated = toggle.checked;
        });

        const slider = document.createElement('span');
        slider.className = 'setup-toggle-slider';

        const text = document.createElement('span');
        text.className = 'setup-toggle-text';
        text.textContent = this._getMessage('setupGoogleToggle');

        toggleLabel.appendChild(toggle);
        toggleLabel.appendChild(slider);
        toggleLabel.appendChild(text);
        toggleGroup.appendChild(toggleLabel);

        const note = document.createElement('p');
        note.className = 'setup-note';
        note.textContent = this._getMessage('setupGoogleNote');
        toggleGroup.appendChild(note);

        container.appendChild(toggleGroup);
        return container;
    }

    /**
     * Notification/reminder step
     * @private
     */
    _renderReminderStep() {
        const container = document.createElement('div');
        container.className = 'setup-step-content';

        const title = document.createElement('h3');
        title.className = 'setup-step-title';
        title.textContent = this._getMessage('setupReminderTitle');
        container.appendChild(title);

        const desc = document.createElement('p');
        desc.className = 'setup-step-desc';
        desc.textContent = this._getMessage('setupReminderDesc');
        container.appendChild(desc);

        // Toggle
        const toggleGroup = document.createElement('div');
        toggleGroup.className = 'setup-toggle-group';

        const toggleLabel = document.createElement('label');
        toggleLabel.className = 'setup-toggle-label';

        const toggle = document.createElement('input');
        toggle.type = 'checkbox';
        toggle.className = 'setup-toggle-input';
        toggle.checked = this.setupData.googleEventReminder;

        const slider = document.createElement('span');
        slider.className = 'setup-toggle-slider';

        const text = document.createElement('span');
        text.className = 'setup-toggle-text';
        text.textContent = this._getMessage('setupReminderToggle');

        toggleLabel.appendChild(toggle);
        toggleLabel.appendChild(slider);
        toggleLabel.appendChild(text);
        toggleGroup.appendChild(toggleLabel);

        // Minutes selector
        const minutesRow = document.createElement('div');
        minutesRow.className = 'setup-minutes-row';
        minutesRow.style.display = this.setupData.googleEventReminder ? 'flex' : 'none';

        const minutesLabel = document.createElement('label');
        minutesLabel.className = 'setup-time-label';
        minutesLabel.textContent = this._getMessage('setupReminderMinutes');

        const minutesSelect = document.createElement('select');
        minutesSelect.className = 'setup-select';
        [1, 3, 5, 10, 15, 30].forEach(min => {
            const option = document.createElement('option');
            option.value = min;
            option.textContent = `${min} min`;
            if (min === this.setupData.reminderMinutes) {
                option.selected = true;
            }
            minutesSelect.appendChild(option);
        });
        minutesSelect.addEventListener('change', () => {
            this.setupData.reminderMinutes = parseInt(minutesSelect.value, 10);
        });

        minutesRow.appendChild(minutesLabel);
        minutesRow.appendChild(minutesSelect);
        toggleGroup.appendChild(minutesRow);

        toggle.addEventListener('change', () => {
            this.setupData.googleEventReminder = toggle.checked;
            minutesRow.style.display = toggle.checked ? 'flex' : 'none';
        });

        container.appendChild(toggleGroup);
        return container;
    }

    // --- Navigation ---

    /** @private */
    _nextStep() {
        if (this.currentStep < this.steps.length - 1) {
            this.currentStep++;
            this._renderStep();
        }
    }

    /** @private */
    _prevStep() {
        if (this.currentStep > 0) {
            this.currentStep--;
            this._renderStep();
        }
    }

    /**
     * Finish setup and save settings
     * @private
     */
    async _finish() {
        // Hide overlay
        this.element.style.display = 'none';
        this.element.setAttribute('hidden', '');

        // Save all collected settings
        try {
            const currentSettings = await loadSettings();
            const updatedSettings = {
                ...currentSettings,
                openTime: this.setupData.openTime,
                closeTime: this.setupData.closeTime,
                googleIntegrated: this.setupData.googleIntegrated,
                googleEventReminder: this.setupData.googleEventReminder,
                reminderMinutes: this.setupData.reminderMinutes
            };
            await saveSettings(updatedSettings);

            // Save language separately (matches existing pattern)
            await new Promise((resolve) => {
                chrome.storage.sync.set({ language: this.setupData.language }, resolve);
            });

            // Mark setup as completed
            await StorageHelper.set({ [SETUP_STORAGE_KEY]: true });

            // Trigger Google auth if enabled
            if (this.setupData.googleIntegrated) {
                try {
                    chrome.runtime.sendMessage({ action: 'authenticateGoogle' });
                } catch {
                    // Non-blocking - user can configure later in settings
                }
            }

            // Notify background about reminder settings
            if (this.setupData.googleEventReminder) {
                try {
                    chrome.runtime.sendMessage({
                        action: 'updateReminderSettings',
                        settings: {
                            googleEventReminder: this.setupData.googleEventReminder,
                            reminderMinutes: this.setupData.reminderMinutes
                        }
                    });
                } catch {
                    // Non-blocking
                }
            }
        } catch (error) {
            console.warn('Failed to save initial setup settings:', error);
        }

        if (this.onComplete) {
            this.onComplete();
        }
    }

    /**
     * Check if setup is currently active
     * @private
     */
    _isActive() {
        return this.element && !this.element.hasAttribute('hidden');
    }

    /**
     * Get localized message with fallback
     * @private
     */
    _getMessage(key) {
        try {
            const msg = chrome.i18n.getMessage(key);
            return msg || key;
        } catch {
            return key;
        }
    }
}
