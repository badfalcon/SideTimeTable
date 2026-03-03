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
import { createGoogleSignInButton } from '../../../lib/google-button-helper.js';

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
            language: DEFAULT_SETTINGS.language,
            openTime: DEFAULT_SETTINGS.openTime,
            closeTime: DEFAULT_SETTINGS.closeTime,
            googleIntegrated: DEFAULT_SETTINGS.googleIntegrated,
            googleEventReminder: DEFAULT_SETTINGS.googleEventReminder,
            reminderMinutes: DEFAULT_SETTINGS.reminderMinutes
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
            this.setupData.openTime = settings.openTime ?? DEFAULT_SETTINGS.openTime;
            this.setupData.closeTime = settings.closeTime ?? DEFAULT_SETTINGS.closeTime;
            this.setupData.language = settings.language ?? DEFAULT_SETTINGS.language;
            this.setupData.googleEventReminder = settings.googleEventReminder ?? DEFAULT_SETTINGS.googleEventReminder;
            this.setupData.reminderMinutes = settings.reminderMinutes ?? DEFAULT_SETTINGS.reminderMinutes;
            this.setupData.googleIntegrated = settings.googleIntegrated ?? DEFAULT_SETTINGS.googleIntegrated;
        } catch {
            // Use defaults
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
            backBtn.textContent = this.getMessage('setupBack');
            backBtn.addEventListener('click', () => this._prevStep());
            nav.appendChild(backBtn);
        }

        const skipBtn = document.createElement('button');
        skipBtn.className = 'setup-btn setup-btn-skip';
        skipBtn.textContent = this.getMessage('setupSkipAll');
        skipBtn.addEventListener('click', () => this._finish());
        nav.appendChild(skipBtn);

        const isLast = this.currentStep === this.steps.length - 1;
        const nextBtn = document.createElement('button');
        nextBtn.className = 'setup-btn setup-btn-primary';
        nextBtn.textContent = isLast ? this.getMessage('setupComplete') : this.getMessage('setupNext');
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
     * Create a step container with title and description
     * @param {string} titleKey - Localization key for the title
     * @param {string} descKey - Localization key for the description
     * @returns {HTMLElement} The container element
     * @private
     */
    _createStepContainer(titleKey, descKey) {
        const container = document.createElement('div');
        container.className = 'setup-step-content';

        const title = document.createElement('h3');
        title.className = 'setup-step-title';
        title.textContent = this.getMessage(titleKey);
        container.appendChild(title);

        const desc = document.createElement('p');
        desc.className = 'setup-step-desc';
        desc.textContent = this.getMessage(descKey);
        container.appendChild(desc);

        return container;
    }

    /**
     * Language selection step
     * @private
     */
    _renderLanguageStep() {
        const container = this._createStepContainer('setupLanguageTitle', 'setupLanguageDesc');

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
            text.textContent = this.getMessage(opt.labelKey);

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
        const container = this._createStepContainer('setupWorkHoursTitle', 'setupWorkHoursDesc');

        const formGroup = document.createElement('div');
        formGroup.className = 'setup-form-group';

        // Start time
        const startLabel = document.createElement('label');
        startLabel.className = 'setup-time-label';
        startLabel.textContent = this.getMessage('setupWorkStart');

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
        endLabel.textContent = this.getMessage('setupWorkEnd');

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
        const container = this._createStepContainer('setupGoogleTitle', 'setupGoogleDesc');

        const buttonContainer = document.createElement('div');
        buttonContainer.style.marginBottom = '12px';

        // Google Sign-in button (following Google branding guidelines)
        const googleButton = this._createGoogleButton(buttonContainer);
        buttonContainer.appendChild(googleButton);

        // Connected status badge (hidden by default, shown instead of button when connected)
        const connectedBadge = document.createElement('div');
        connectedBadge.className = 'setup-google-connected-badge';
        connectedBadge.style.display = 'none';
        connectedBadge.textContent = this.getMessage('setupGoogleConnected');
        buttonContainer.appendChild(connectedBadge);

        // Status text (shown below button when not connected)
        const statusText = document.createElement('div');
        statusText.className = 'setup-google-status';
        statusText.textContent = this.getMessage('setupGoogleNotConnected');
        buttonContainer.appendChild(statusText);

        // Note
        const note = document.createElement('p');
        note.className = 'setup-note';
        note.textContent = this.getMessage('setupGoogleNote');
        note.style.textAlign = 'center';
        note.style.paddingLeft = '0';

        container.appendChild(buttonContainer);
        container.appendChild(note);

        // Check actual Google auth status
        this._checkGoogleAuthStatus(buttonContainer);

        return container;
    }

    /**
     * Check Google auth status from background script and update UI
     * @param {HTMLElement} buttonContainer - The container with button, badge, and status
     * @private
     */
    async _checkGoogleAuthStatus(buttonContainer) {
        try {
            const response = await new Promise((resolve) => {
                chrome.runtime.sendMessage({action: 'checkGoogleAuth'}, resolve);
            });

            if (response && response.authenticated) {
                this.setupData.googleIntegrated = true;
                this._showConnectedState(buttonContainer);
            }
        } catch (error) {
            console.warn('Google auth status check error:', error);
        }
    }

    /**
     * Show connected state: hide Google button, show badge
     * @param {HTMLElement} buttonContainer
     * @private
     */
    _showConnectedState(buttonContainer) {
        const button = buttonContainer.querySelector('.gsi-material-button');
        const badge = buttonContainer.querySelector('.setup-google-connected-badge');
        const status = buttonContainer.querySelector('.setup-google-status');

        if (button) button.style.display = 'none';
        if (badge) badge.style.display = '';
        if (status) status.style.display = 'none';
    }

    /**
     * Show disconnected state: show Google button, hide badge
     * @param {HTMLElement} buttonContainer
     * @private
     */
    _showDisconnectedState(buttonContainer) {
        const button = buttonContainer.querySelector('.gsi-material-button');
        const badge = buttonContainer.querySelector('.setup-google-connected-badge');
        const status = buttonContainer.querySelector('.setup-google-status');

        if (button) {
            button.style.display = '';
            button.disabled = false;
        }
        if (badge) badge.style.display = 'none';
        if (status) {
            status.style.display = '';
            status.textContent = this.getMessage('setupGoogleNotConnected');
        }
    }

    /**
     * Create Google Sign-in button (branding-compliant: text/style never modified)
     * @param {HTMLElement} buttonContainer - Parent container
     * @private
     */
    _createGoogleButton(buttonContainer) {
        const button = createGoogleSignInButton({
            text: this.getMessage('setupGoogleConnect')
        });

        // Authenticate on click
        button.addEventListener('click', async () => {
            const statusText = buttonContainer.querySelector('.setup-google-status');
            button.disabled = true;
            if (statusText) statusText.textContent = this.getMessage('setupGoogleConnecting');

            try {
                const response = await new Promise((resolve) => {
                    chrome.runtime.sendMessage({action: 'authenticateGoogle'}, resolve);
                });

                if (response && response.success) {
                    this.setupData.googleIntegrated = true;
                    this._showConnectedState(buttonContainer);
                } else {
                    const errorMsg = (response && response.error) || 'Authentication failed';
                    throw new Error(errorMsg);
                }
            } catch (error) {
                console.warn('Google integration error in setup:', error);
                button.disabled = false;
                if (statusText) {
                    statusText.textContent = this.getMessage('setupGoogleNotConnected');
                }
            }
        });

        return button;
    }

    /**
     * Notification/reminder step
     * @private
     */
    _renderReminderStep() {
        const container = this._createStepContainer('setupReminderTitle', 'setupReminderDesc');

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
        text.textContent = this.getMessage('setupReminderToggle');

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
        minutesLabel.textContent = this.getMessage('setupReminderMinutes');

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

            // Save language separately (matches existing pattern in options page)
            await StorageHelper.set({ language: this.setupData.language });

            // Mark setup as completed
            await StorageHelper.set({ [SETUP_STORAGE_KEY]: true });

            // Google auth is already handled in the Google step button click,
            // so we only save the setting here without triggering auth again.

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

}
