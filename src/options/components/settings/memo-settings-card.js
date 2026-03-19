/**
 * MemoSettingsCard - Memo settings card component
 */
import { CardComponent } from '../base/card-component.js';

export class MemoSettingsCard extends CardComponent {
    constructor(onSettingsChange) {
        super({
            title: 'Memo Settings',
            titleLocalize: '__MSG_memoSettings__',
            subtitle: 'Configure the memo panel behavior.',
            subtitleLocalize: '__MSG_memoSettingsDescription__',
            icon: 'fas fa-sticky-note',
            iconColor: 'text-warning'
        });

        this.onSettingsChange = onSettingsChange;
        this.markdownCheckbox = null;

        this.settings = {
            memoMarkdown: false
        };
    }

    createElement() {
        const card = super.createElement();

        const form = this._createForm();
        this.addContent(form);

        this._setupEventListeners();

        return card;
    }

    _createForm() {
        const form = document.createElement('form');

        const checkWrapper = document.createElement('div');
        checkWrapper.className = 'form-check form-switch';

        this.markdownCheckbox = document.createElement('input');
        this.markdownCheckbox.type = 'checkbox';
        this.markdownCheckbox.className = 'form-check-input';
        this.markdownCheckbox.id = 'memo-markdown-toggle';
        this.markdownCheckbox.checked = this.settings.memoMarkdown;

        const label = document.createElement('label');
        label.className = 'form-check-label';
        label.htmlFor = 'memo-markdown-toggle';
        label.setAttribute('data-localize', '__MSG_memoMarkdownLabel__');
        label.textContent = window.getLocalizedMessage('memoMarkdownLabel') || 'Enable Markdown rendering';

        const helpText = document.createElement('small');
        helpText.className = 'form-text text-muted d-block mt-1';
        helpText.setAttribute('data-localize', '__MSG_memoMarkdownHelp__');
        helpText.textContent = window.getLocalizedMessage('memoMarkdownHelp') || 'When enabled, memo content is rendered as Markdown when not editing.';

        checkWrapper.appendChild(this.markdownCheckbox);
        checkWrapper.appendChild(label);

        form.appendChild(checkWrapper);
        form.appendChild(helpText);

        return form;
    }

    _setupEventListeners() {
        this.markdownCheckbox?.addEventListener('change', () => {
            this._handleSettingsChange();
        });
    }

    _handleSettingsChange() {
        const newSettings = this.getSettings();
        this.settings = newSettings;

        if (this.onSettingsChange) {
            this.onSettingsChange(newSettings);
        }
    }

    getSettings() {
        return {
            memoMarkdown: this.markdownCheckbox?.checked || false
        };
    }

    updateSettings(settings) {
        this.settings = { ...this.settings, ...settings };

        if (this.markdownCheckbox) {
            this.markdownCheckbox.checked = this.settings.memoMarkdown;
        }
    }

    resetToDefaults() {
        this.updateSettings({ memoMarkdown: false });
        this._handleSettingsChange();
    }
}
