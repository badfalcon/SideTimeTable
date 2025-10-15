/**
 * LanguageSettingsCard - Language settings card component
 */
import { CardComponent } from '../base/card-component.js';

export class LanguageSettingsCard extends CardComponent {
    constructor(onSettingsChange) {
        super({
            title: 'Language Settings',
            titleLocalize: '__MSG_languageSettings__',
            subtitle: 'Select the display language for the extension.',
            subtitleLocalize: '__MSG_languageDescription__',
            icon: 'fas fa-language',
            iconColor: 'text-primary'
        });

        this.onSettingsChange = onSettingsChange;

        // The form elements
        this.languageSelect = null;
        this.currentLanguageDisplay = null;

        // The current settings values
        this.settings = {
            language: 'auto'
        };

        // The available languages
        this.availableLanguages = [
            { value: 'auto', key: '__MSG_languageAuto__', text: 'Auto (Browser Language)' },
            { value: 'en', key: '__MSG_languageEnglish__', text: 'English' },
            { value: 'ja', key: '__MSG_languageJapanese__', text: 'Japanese (日本語)' }
        ];
    }

    createElement() {
        const card = super.createElement();

        // Create the form elements
        const form = this._createForm();
        this.addContent(form);

        // Display the current browser language
        this._updateCurrentLanguageDisplay();

        // Setup the event listeners
        this._setupEventListeners();

        return card;
    }


    /**
     * Create form
     * @private
     */
    _createForm() {
        const form = document.createElement('form');

        // The grid layout
        const row = document.createElement('div');
        row.className = 'row';

        // The language selection column
        const selectCol = this._createLanguageSelectColumn();
        row.appendChild(selectCol);

        // The current language display column
        const displayCol = this._createCurrentLanguageColumn();
        row.appendChild(displayCol);

        form.appendChild(row);

        return form;
    }

    /**
     * Create language selection column
     * @private
     */
    _createLanguageSelectColumn() {
        const col = document.createElement('div');
        col.className = 'col-md-6 mb-3';

        // The label
        const label = document.createElement('label');
        label.htmlFor = 'language-settings-select';
        label.className = 'form-label fw-semibold';
        label.setAttribute('data-localize', '__MSG_selectLanguage__');
        label.textContent = 'Select Language:';

        // The select box
        this.languageSelect = document.createElement('select');
        this.languageSelect.className = 'form-select';
        this.languageSelect.id = 'language-settings-select';

        // Add the options
        this.availableLanguages.forEach(lang => {
            const option = document.createElement('option');
            option.value = lang.value;
            option.setAttribute('data-localize', lang.key);
            option.textContent = lang.text;

            if (lang.value === this.settings.language) {
                option.selected = true;
            }

            this.languageSelect.appendChild(option);
        });

        // The help text
        const helpText = document.createElement('small');
        helpText.className = 'form-text text-muted mt-1';
        helpText.setAttribute('data-localize', '__MSG_languageHelp__');
        helpText.textContent = 'If the language is changed, you need to reload the extension to apply the changes.';

        col.appendChild(label);
        col.appendChild(this.languageSelect);
        col.appendChild(helpText);

        return col;
    }

    /**
     * Create current language display column
     * @private
     */
    _createCurrentLanguageColumn() {
        const col = document.createElement('div');
        col.className = 'col-md-6 mb-3';

        // The label
        const label = document.createElement('label');
        label.className = 'form-label fw-semibold';
        label.setAttribute('data-localize', '__MSG_currentLanguage__');
        label.textContent = 'Current Browser Language:';

        // The display area
        const display = document.createElement('div');
        display.className = 'p-2 bg-light rounded';

        // The icon and display text
        const icon = document.createElement('i');
        icon.className = 'fas fa-info-circle text-info me-1';

        this.currentLanguageDisplay = document.createElement('span');
        this.currentLanguageDisplay.id = 'current-language-display';
        this.currentLanguageDisplay.className = 'text-dark';
        this.currentLanguageDisplay.textContent = 'Detecting...';

        display.appendChild(icon);
        display.appendChild(this.currentLanguageDisplay);

        col.appendChild(label);
        col.appendChild(display);

        return col;
    }

    /**
     * Update current browser language display
     * @private
     */
    _updateCurrentLanguageDisplay() {
        if (this.currentLanguageDisplay) {
            const browserLang = navigator.language || navigator.userLanguage || 'unknown';
            const displayText = this._formatLanguageDisplay(browserLang);
            this.currentLanguageDisplay.textContent = displayText;
        }
    }

    /**
     * Format language display
     * @private
     */
    _formatLanguageDisplay(langCode) {
        const languageNames = {
            'en': 'English',
            'en-US': 'English (United States)',
            'en-GB': 'English (United Kingdom)',
            'ja': '日本語',
            'ja-JP': '日本語 (日本)',
            'zh': '中文',
            'zh-CN': '中文 (简体)',
            'zh-TW': '中文 (繁體)',
            'ko': '한국어',
            'fr': 'Français',
            'de': 'Deutsch',
            'es': 'Español',
            'it': 'Italiano',
            'pt': 'Português',
            'ru': 'Русский'
        };

        const displayName = languageNames[langCode] || languageNames[langCode.split('-')[0]];
        return displayName ? `${displayName} (${langCode})` : langCode;
    }

    /**
     * Setup event listeners
     * @private
     */
    _setupEventListeners() {
        // The language selection change
        this.languageSelect?.addEventListener('change', () => {
            this._handleLanguageChange();
        });
    }

    /**
     * Handle language setting change
     * @private
     */
    _handleLanguageChange() {
        const newSettings = this.getSettings();
        const previousLanguage = this.settings.language;

        this.settings = newSettings;

        // Callback with the changes
        if (this.onSettingsChange) {
            this.onSettingsChange(newSettings);
        }

        // Show the reload confirmation if language was changed
        if (newSettings.language !== previousLanguage) {
            this._showReloadConfirmation();
        }
    }

    /**
     * Show reload confirmation
     * @private
     */
    _showReloadConfirmation() {
        // Remove the existing confirmation message
        const existingNotice = this.element.querySelector('.language-reload-notice');
        if (existingNotice) {
            existingNotice.remove();
        }

        // Create the confirmation message
        const notice = document.createElement('div');
        notice.className = 'alert alert-info alert-dismissible fade show language-reload-notice mt-3';
        notice.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="fas fa-sync-alt me-2"></i>
                <div class="flex-grow-1">
                    <strong>Language setting changed</strong><br>
                    <small>A page reload is required to apply the changes.</small>
                </div>
                <button type="button" class="btn btn-sm btn-primary ms-2" id="reload-page-btn">
                    Reload Page
                </button>
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;

        this.bodyElement.appendChild(notice);

        // The reload button event
        const reloadBtn = notice.querySelector('#reload-page-btn');
        if (reloadBtn) {
            reloadBtn.addEventListener('click', () => {
                window.location.reload();
            });
        }
    }

    /**
     * Reload extension
     * @private
     */
    _reloadExtension() {
        if (chrome.runtime && chrome.runtime.reload) {
            chrome.runtime.reload();
        } else {
            // Fallback: reload the page
            window.location.reload();
        }
    }


    /**
     * Get current settings
     */
    getSettings() {
        return {
            language: this.languageSelect?.value || this.settings.language
        };
    }

    /**
     * Update settings
     */
    updateSettings(settings) {
        this.settings = { ...this.settings, ...settings };

        if (this.languageSelect) {
            this.languageSelect.value = this.settings.language;
        }
    }

    /**
     * Reset to default settings
     */
    resetToDefaults() {
        const defaultSettings = {
            language: 'auto'
        };

        this.updateSettings(defaultSettings);
        this._handleLanguageChange();
    }

    /**
     * Get list of supported languages
     */
    getSupportedLanguages() {
        return this.availableLanguages.map(lang => ({
            value: lang.value,
            text: lang.text
        }));
    }
}