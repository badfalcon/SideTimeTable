/**
 * DemoModeCard - Demo mode settings card component
 */
import { CardComponent } from '../base/card-component.js';
import { isDemoMode, setDemoMode } from '../../../lib/demo-data.js';

export class DemoModeCard extends CardComponent {
    constructor(onSettingsChange) {
        super({
            id: 'demo-mode-card',
            title: 'Demo Mode',
            subtitle: 'Display sample data (no API access will be made).',
            icon: 'fas fa-flask',
            iconColor: 'text-warning',
            hidden: true
        });

        this.onSettingsChange = onSettingsChange;
        this.demoModeToggle = null;
    }

    createElement() {
        const card = super.createElement();
        this.addContent(this._createDemoModeSection());
        this._updateUI();
        this._setupEventListeners();
        return card;
    }

    _createDemoModeSection() {
        const section = document.createElement('div');
        section.className = 'form-check';

        this.demoModeToggle = document.createElement('input');
        this.demoModeToggle.type = 'checkbox';
        this.demoModeToggle.className = 'form-check-input';
        this.demoModeToggle.id = 'demo-mode-toggle';

        const label = document.createElement('label');
        label.className = 'form-check-label';
        label.htmlFor = 'demo-mode-toggle';

        const labelText = document.createElement('span');
        labelText.textContent = 'Demo Mode';

        const helpText = document.createElement('small');
        helpText.className = 'text-muted d-block';
        helpText.textContent = 'Display sample data (no API access will be made)';

        label.appendChild(labelText);
        label.appendChild(helpText);
        section.appendChild(this.demoModeToggle);
        section.appendChild(label);
        return section;
    }

    _updateUI() {
        if (this.demoModeToggle) {
            this.demoModeToggle.checked = isDemoMode();
        }
    }

    _setupEventListeners() {
        this.demoModeToggle?.addEventListener('change', (e) => {
            const enabled = e.target.checked;
            setDemoMode(enabled);
            this._updateUI();
            if (this.onSettingsChange) this.onSettingsChange({ demoMode: enabled });
            this._showAlert(
                `<i class="fas fa-${enabled ? 'flask' : 'globe'} me-1"></i>` +
                `<strong>Demo mode ${enabled ? 'enabled' : 'disabled'}</strong><br>` +
                `<small>Please reload the side panel to apply the changes.</small>`,
                'info', 5000
            );
        });
    }

    getSettings() {
        return { demoMode: isDemoMode() };
    }

    updateSettings(settings) {
        if ('demoMode' in settings) setDemoMode(settings.demoMode);
        this._updateUI();
    }
}
