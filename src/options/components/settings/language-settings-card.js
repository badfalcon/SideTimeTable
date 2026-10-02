/**
 * LanguageSettingsCard - Language settings card component
 */
import { CardComponent } from '../base/card-component.js';
import { createNotice, createSelect, createSettingRow, msg, msgWith, setText } from '../base/settings-dom.js';

export class LanguageSettingsCard extends CardComponent {
    constructor(onSettingsChange) {
        super({
            title: 'Language',
            titleLocalize: '__MSG_languageSettings__',
            icon: 'fas fa-globe'
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
            { value: 'auto', key: '__MSG_languageAuto__', text: 'Auto (browser language)' },
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
     * Create form: the language select, with the browser's language in its hint
     * @private
     */
    _createForm() {
        const form = document.createElement('form');
        form.className = 'settings-rows';

        this.languageSelect = createSelect('language-settings-select', this.availableLanguages);
        this.languageSelect.value = this.settings.language;

        const { row, hint } = createSettingRow({
            labelKey: 'selectLanguage',
            labelFallback: 'Display language',
            labelFor: 'language-settings-select',
            hintKey: 'languageHelp',
            hintFallback: 'Changing it reloads the extension.',
            control: this.languageSelect
        });

        // "Your browser's language is …", on its own line under the hint
        this.currentLanguageDisplay = document.createElement('span');
        this.currentLanguageDisplay.id = 'current-language-display';
        this.currentLanguageDisplay.className = 'setting-row-hint-line';
        this.currentLanguageDisplay.textContent = msg('detectingLanguage', 'Detecting...');
        // The hint's own text keeps its data-localize; the line is a sibling
        const hintText = setText(document.createElement('span'), 'languageHelp', 'Changing it reloads the extension.');
        hint.removeAttribute('data-localize');
        hint.replaceChildren(hintText, this.currentLanguageDisplay);

        form.appendChild(row);
        return form;
    }

    /**
     * Update current browser language display
     * @private
     */
    _updateCurrentLanguageDisplay() {
        if (this.currentLanguageDisplay) {
            const browserLang = navigator.language || navigator.userLanguage || 'unknown';
            const displayText = this._formatLanguageDisplay(browserLang);
            this.currentLanguageDisplay.textContent = msgWith('browserLanguageIs', 'Your browser\'s language is $1.', displayText);
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

        // Create the confirmation message, with a button to reload now
        const content = document.createElement('div');
        content.className = 'settings-notice-split';
        const text = document.createElement('div');
        const title = document.createElement('strong');
        title.textContent = msg('languageChanged', 'Language setting changed');
        const desc = document.createElement('div');
        desc.textContent = msg('languageReloadRequired', 'A page reload is required to apply the changes.');
        text.appendChild(title);
        text.appendChild(desc);
        const reloadBtn = document.createElement('button');
        reloadBtn.type = 'button';
        reloadBtn.id = 'reload-page-btn';
        reloadBtn.className = 'settings-btn is-primary';
        reloadBtn.textContent = msg('reloadPage', 'Reload page');
        content.appendChild(text);
        content.appendChild(reloadBtn);
        const notice = createNotice({ content, tone: 'info', className: 'language-reload-notice' });

        this.bodyElement.appendChild(notice);

        reloadBtn.addEventListener('click', () => {
            window.location.reload();
        });
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