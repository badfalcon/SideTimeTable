/**
 * MemoSettingsCard - Memo settings card component
 */
import { CardComponent } from '../base/card-component.js';
import { DEFAULT_SETTINGS, MEMO_FONT_SIZE_RANGE } from '../../../lib/constants.js';
import { createSelect, createSettingRow, createSwitch, msg } from '../base/settings-dom.js';

export class MemoSettingsCard extends CardComponent {
    constructor(onSettingsChange) {
        super({
            title: 'Memo',
            titleLocalize: '__MSG_memoSettings__',
            icon: 'fas fa-note-sticky'
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
        container.className = 'settings-rows';

        this.markdownCheckbox = createSwitch('memo-markdown-toggle', this.settings.memoMarkdown);
        container.appendChild(createSettingRow({
            labelKey: 'memoMarkdownLabel',
            labelFallback: 'Show as Markdown',
            labelFor: 'memo-markdown-toggle',
            hintKey: 'memoMarkdownHelp',
            hintFallback: 'When not editing, the memo is shown as Markdown; click it to edit.',
            control: this.markdownCheckbox
        }).row);

        // Font size dropdown
        const defaultLabel = msg('memoFontSizeDefault', 'default');
        const sizes = [];
        for (let size = MEMO_FONT_SIZE_RANGE.min; size <= MEMO_FONT_SIZE_RANGE.max; size++) {
            sizes.push({
                value: size,
                text: size === DEFAULT_SETTINGS.memoFontSize ? `${size}px${defaultLabel}` : `${size}px`
            });
        }
        this.fontSizeSelect = createSelect('memo-font-size-select', sizes);
        this.fontSizeSelect.value = this.settings.memoFontSize;
        container.appendChild(createSettingRow({
            labelKey: 'memoFontSizeLabel',
            labelFallback: 'Text size',
            labelFor: 'memo-font-size-select',
            control: this.fontSizeSelect
        }).row);

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
