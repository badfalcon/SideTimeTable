/**
 * ScrollbarSettingsCard - Scrollbar settings card component
 */
import { CardComponent } from '../base/card-component.js';

export class ScrollbarSettingsCard extends CardComponent {
    constructor(onSettingsChange) {
        super({
            title: 'Scrollbar Settings',
            titleLocalize: '__MSG_scrollbarSettings__',
            subtitle: 'Configure the scrollbar appearance.',
            subtitleLocalize: '__MSG_scrollbarSettingsDescription__',
            icon: 'fas fa-arrows-alt-v',
            iconColor: 'text-info'
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

        const checkWrapper = document.createElement('div');
        checkWrapper.className = 'form-check form-switch';

        this.thinScrollbarCheckbox = document.createElement('input');
        this.thinScrollbarCheckbox.type = 'checkbox';
        this.thinScrollbarCheckbox.className = 'form-check-input';
        this.thinScrollbarCheckbox.id = 'thin-scrollbar-toggle';
        this.thinScrollbarCheckbox.checked = this.settings.thinScrollbar;

        const label = document.createElement('label');
        label.className = 'form-check-label';
        label.htmlFor = 'thin-scrollbar-toggle';
        label.setAttribute('data-localize', '__MSG_thinScrollbarLabel__');
        label.textContent = window.getLocalizedMessage('thinScrollbarLabel') || 'Use thin scrollbar';

        const helpText = document.createElement('small');
        helpText.className = 'form-text text-muted d-block mt-1';
        helpText.setAttribute('data-localize', '__MSG_thinScrollbarHelp__');
        helpText.textContent = window.getLocalizedMessage('thinScrollbarHelp') || 'Display a narrow scrollbar in the side panel for a cleaner look.';

        checkWrapper.appendChild(this.thinScrollbarCheckbox);
        checkWrapper.appendChild(label);

        container.appendChild(checkWrapper);
        container.appendChild(helpText);

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
