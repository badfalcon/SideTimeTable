/**
 * DarkModeSettingsCard - Dark mode toggle card component
 */
import { CardComponent } from '../base/card-component.js';

export class DarkModeSettingsCard extends CardComponent {
    constructor(onSettingsChange) {
        super({
            title: 'Dark Mode',
            titleLocalize: '__MSG_darkModeSettings__',
            subtitle: 'Toggle dark mode for the extension interface.',
            subtitleLocalize: '__MSG_darkModeDescription__',
            icon: 'fas fa-moon',
            iconColor: 'text-info'
        });

        this.onSettingsChange = onSettingsChange;
        this.darkModeToggle = null;
        this.settings = { darkMode: false };
    }

    createElement() {
        const card = super.createElement();
        const form = this._createForm();
        this.addContent(form);
        this._setupEventListeners();
        return card;
    }

    /**
     * Create form
     * @private
     */
    _createForm() {
        const form = document.createElement('form');

        const row = document.createElement('div');
        row.className = 'row';

        const col = document.createElement('div');
        col.className = 'col-md-6 mb-3';

        // Toggle container
        const container = document.createElement('div');
        container.className = 'd-flex align-items-center gap-3';

        // Toggle switch
        const toggleWrapper = document.createElement('div');
        toggleWrapper.className = 'form-check form-switch';

        this.darkModeToggle = document.createElement('input');
        this.darkModeToggle.className = 'form-check-input';
        this.darkModeToggle.type = 'checkbox';
        this.darkModeToggle.id = 'dark-mode-toggle';
        this.darkModeToggle.checked = this.settings.darkMode;
        this.darkModeToggle.style.cursor = 'pointer';

        const label = document.createElement('label');
        label.className = 'form-check-label';
        label.htmlFor = 'dark-mode-toggle';
        label.setAttribute('data-localize', '__MSG_darkModeToggle__');
        label.textContent = 'Enable Dark Mode';
        label.style.cursor = 'pointer';

        toggleWrapper.appendChild(this.darkModeToggle);
        toggleWrapper.appendChild(label);
        container.appendChild(toggleWrapper);

        col.appendChild(container);
        row.appendChild(col);
        form.appendChild(row);

        return form;
    }

    /**
     * Set up event listeners
     * @private
     */
    _setupEventListeners() {
        this.darkModeToggle?.addEventListener('change', () => {
            this._handleDarkModeChange();
        });
    }

    /**
     * Handle dark mode toggle change
     * @private
     */
    _handleDarkModeChange() {
        const newSettings = this.getSettings();
        this.settings = newSettings;

        // Apply theme immediately on options page
        if (newSettings.darkMode) {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }

        if (this.onSettingsChange) {
            this.onSettingsChange(newSettings);
        }
    }

    /**
     * Get current settings
     */
    getSettings() {
        return {
            darkMode: this.darkModeToggle?.checked || false
        };
    }

    /**
     * Update settings
     */
    updateSettings(settings) {
        this.settings = { ...this.settings, ...settings };

        if (this.darkModeToggle) {
            this.darkModeToggle.checked = this.settings.darkMode;
        }

        // Apply theme attribute
        if (this.settings.darkMode) {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
    }

    /**
     * Reset to default settings
     */
    resetToDefaults() {
        this.updateSettings({ darkMode: false });
        this._handleDarkModeChange();
    }
}
