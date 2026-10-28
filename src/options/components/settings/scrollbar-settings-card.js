/**
 * ScrollbarSettingsCard - Scrollbar settings card component
 */
import { CardComponent } from '../base/card-component.js';
import { createSettingRow, createSwitch } from '../base/settings-dom.js';

export class ScrollbarSettingsCard extends CardComponent {
    constructor(onSettingsChange) {
        super({
            title: 'Scrollbar',
            titleLocalize: '__MSG_scrollbarSettings__',
            icon: 'fas fa-arrows-up-down'
        });

        this.onSettingsChange = onSettingsChange;
        this.thinScrollbarCheckbox = null;

        this.settings = {
            thinScrollbar: false
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

        this.thinScrollbarCheckbox = createSwitch('thin-scrollbar-toggle', this.settings.thinScrollbar);
        container.appendChild(createSettingRow({
            labelKey: 'thinScrollbarLabel',
            labelFallback: 'Thin scrollbar',
            labelFor: 'thin-scrollbar-toggle',
            hintKey: 'thinScrollbarHelp',
            hintFallback: 'A narrow scrollbar in the side panel, for a cleaner look.',
            control: this.thinScrollbarCheckbox
        }).row);

        return container;
    }

    _setupEventListeners() {
        this.thinScrollbarCheckbox?.addEventListener('change', () => {
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
            thinScrollbar: this.thinScrollbarCheckbox?.checked || false
        };
    }

    updateSettings(settings) {
        this.settings = { ...this.settings, ...settings };

        if (this.thinScrollbarCheckbox) {
            this.thinScrollbarCheckbox.checked = this.settings.thinScrollbar;
        }
    }

    resetToDefaults() {
        this.updateSettings({ thinScrollbar: false });
        this._handleSettingsChange();
    }
}
