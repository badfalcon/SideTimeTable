/**
 * WhatsNewSettingsCard - Toggle to control auto-display of the What's New modal
 */
import { CardComponent } from '../base/card-component.js';
import { createSettingRow, createSwitch } from '../base/settings-dom.js';

export class WhatsNewSettingsCard extends CardComponent {
    constructor(onSettingsChange) {
        super({
            title: "What's new",
            titleLocalize: '__MSG_whatsNewSettings__',
            icon: 'fas fa-wand-magic-sparkles'
        });

        this.onSettingsChange = onSettingsChange;
        this.autoShowCheckbox = null;

        this.settings = {
            whatsNewAutoShow: true
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

        this.autoShowCheckbox = createSwitch('whats-new-auto-show-toggle', this.settings.whatsNewAutoShow);
        container.appendChild(createSettingRow({
            labelKey: 'whatsNewAutoShowLabel',
            labelFallback: 'Show what\'s new after updates',
            labelFor: 'whats-new-auto-show-toggle',
            hintKey: 'whatsNewAutoShowHelp',
            hintFallback: 'When the extension updates, a short tour of the new features opens.',
            control: this.autoShowCheckbox
        }).row);

        return container;
    }

    _setupEventListeners() {
        this.autoShowCheckbox?.addEventListener('change', () => {
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
            whatsNewAutoShow: this.autoShowCheckbox ? this.autoShowCheckbox.checked : true
        };
    }

    updateSettings(settings) {
        this.settings = { ...this.settings, ...settings };

        if (this.autoShowCheckbox) {
            this.autoShowCheckbox.checked = this.settings.whatsNewAutoShow;
        }
    }

    resetToDefaults() {
        this.updateSettings({ whatsNewAutoShow: true });
        this._handleSettingsChange();
    }
}
