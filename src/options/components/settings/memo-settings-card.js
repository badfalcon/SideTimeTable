/**
 * MemoSettingsCard - Memo settings card component
 */
import { CardComponent } from '../base/card-component.js';
import { DEFAULT_SETTINGS, MEMO_FONT_SIZE_RANGE } from '../../../lib/constants.js';

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
        this.fontSizeSelect = null;

        this.settings = {
            memoMarkdown: false,
            memoFontSize: DEFAULT_SETTINGS.memoFontSize
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
        const container = document.createElement('div');

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

        container.appendChild(checkWrapper);
        container.appendChild(helpText);

        // Font size dropdown
        const fontSizeGroup = document.createElement('div');
        fontSizeGroup.className = 'mt-3';

        const fontSizeLabel = document.createElement('label');
        fontSizeLabel.className = 'form-label';
        fontSizeLabel.htmlFor = 'memo-font-size-select';
        fontSizeLabel.setAttribute('data-localize', '__MSG_memoFontSizeLabel__');
        fontSizeLabel.textContent = window.getLocalizedMessage('memoFontSizeLabel') || 'Font Size';

        this.fontSizeSelect = document.createElement('select');
        this.fontSizeSelect.className = 'form-select form-select-sm';
        this.fontSizeSelect.id = 'memo-font-size-select';

        const defaultLabel = window.getLocalizedMessage('memoFontSizeDefault') || 'Default';
        for (let size = MEMO_FONT_SIZE_RANGE.min; size <= MEMO_FONT_SIZE_RANGE.max; size++) {
            const option = document.createElement('option');
            option.value = size;
            option.textContent = size === DEFAULT_SETTINGS.memoFontSize
                ? `${size}px (${defaultLabel})`
                : `${size}px`;
            if (size === this.settings.memoFontSize) {
                option.selected = true;
            }
            this.fontSizeSelect.appendChild(option);
        }

        fontSizeGroup.appendChild(fontSizeLabel);
        fontSizeGroup.appendChild(this.fontSizeSelect);
        container.appendChild(fontSizeGroup);

        return container;
    }

    _setupEventListeners() {
        this.markdownCheckbox?.addEventListener('change', () => {
            this._handleSettingsChange();
        });
        this.fontSizeSelect?.addEventListener('change', () => {
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
            memoMarkdown: this.markdownCheckbox?.checked || false,
            memoFontSize: parseInt(this.fontSizeSelect?.value, 10) || DEFAULT_SETTINGS.memoFontSize
        };
    }

    updateSettings(settings) {
        this.settings = { ...this.settings, ...settings };

        if (this.markdownCheckbox) {
            this.markdownCheckbox.checked = this.settings.memoMarkdown;
        }
        if (this.fontSizeSelect) {
            this.fontSizeSelect.value = this.settings.memoFontSize;
        }
    }

    resetToDefaults() {
        this.updateSettings({ memoMarkdown: false, memoFontSize: DEFAULT_SETTINGS.memoFontSize });
        this._handleSettingsChange();
    }
}
