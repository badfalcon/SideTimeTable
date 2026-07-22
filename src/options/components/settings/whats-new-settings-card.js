/**
 * WhatsNewSettingsCard - Toggle to control auto-display of the What's New modal
 */
import { CardComponent } from '../base/card-component.js';

export class WhatsNewSettingsCard extends CardComponent {
    constructor(onSettingsChange) {
        super({
            title: 'Update Notifications',
            titleLocalize: '__MSG_whatsNewSettings__',
            subtitle: "Control whether the What's New modal appears on version updates.",
            subtitleLocalize: '__MSG_whatsNewSettingsDescription__',
            icon: 'fas fa-bullhorn',
            iconColor: 'text-info'
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

        const checkWrapper = document.createElement('div');
        checkWrapper.className = 'form-check form-switch';

        this.autoShowCheckbox = document.createElement('input');
        this.autoShowCheckbox.type = 'checkbox';
        this.autoShowCheckbox.className = 'form-check-input';
        this.autoShowCheckbox.id = 'whats-new-auto-show-toggle';
        this.autoShowCheckbox.checked = this.settings.whatsNewAutoShow;

        const label = document.createElement('label');
        label.className = 'form-check-label';
        label.htmlFor = 'whats-new-auto-show-toggle';
        label.setAttribute('data-localize', '__MSG_whatsNewAutoShowLabel__');
        label.textContent = window.getLocalizedMessage('whatsNewAutoShowLabel') || "Show What's New on updates";

        const helpText = document.createElement('small');
        helpText.className = 'form-text text-muted d-block mt-1';
        helpText.setAttribute('data-localize', '__MSG_whatsNewAutoShowHelp__');
        helpText.textContent = window.getLocalizedMessage('whatsNewAutoShowHelp') || 'When enabled, a summary of new features is shown automatically after the extension updates.';

        checkWrapper.appendChild(this.autoShowCheckbox);
        checkWrapper.appendChild(label);

        container.appendChild(checkWrapper);
        container.appendChild(helpText);

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
