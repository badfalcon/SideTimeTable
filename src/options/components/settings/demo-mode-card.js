/**
 * DemoModeCard - Demo mode settings card component
 */
import { CardComponent } from '../base/card-component.js';
import { isDemoMode, setDemoMode, getDemoCurrentTimeString, setDemoCurrentTime } from '../../../lib/demo-data.js';

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
        this.timeInput = null;
    }

    createElement() {
        const card = super.createElement();
        this.addContent(this._createDemoModeSection());
        this.addContent(this._createTimeSection());
        this._updateUI();
        this._setupEventListeners();
        return card;
    }

    _createDemoModeSection() {
        const section = document.createElement('div');
        section.className = 'form-check mb-3';

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

    _createTimeSection() {
        const section = document.createElement('div');
        section.className = 'mb-1';

        const label = document.createElement('label');
        label.className = 'form-label small mb-1';
        label.htmlFor = 'demo-time-input';
        label.textContent = 'Current time line position';

        this.timeInput = document.createElement('input');
        this.timeInput.type = 'time';
        this.timeInput.className = 'form-control form-control-sm';
        this.timeInput.id = 'demo-time-input';
        this.timeInput.style.width = '130px';
        this.timeInput.disabled = true;

        const helpText = document.createElement('small');
        helpText.className = 'text-muted d-block mt-1';
        helpText.textContent = 'Time shown by the current time line in demo mode';

        section.appendChild(label);
        section.appendChild(this.timeInput);
        section.appendChild(helpText);
        return section;
    }

    _updateUI() {
        const isDemo = isDemoMode();
        if (this.demoModeToggle) {
            this.demoModeToggle.checked = isDemo;
        }
        if (this.timeInput) {
            this.timeInput.disabled = !isDemo;
            this.timeInput.value = getDemoCurrentTimeString();
        }
    }

    _setupEventListeners() {
        this.demoModeToggle?.addEventListener('change', (e) => {
            const enabled = e.target.checked;
            setDemoMode(enabled);
            this._updateUI();
            this._showAlert(
                `<i class="fas fa-${enabled ? 'flask' : 'globe'} me-1"></i>` +
                `<strong>Demo mode ${enabled ? 'enabled' : 'disabled'}</strong>`,
                'info', 3000
            );
            if (this.onSettingsChange) this.onSettingsChange({ demoMode: enabled });
        });

        this.timeInput?.addEventListener('change', (e) => {
            setDemoCurrentTime(e.target.value);
            if (this.onSettingsChange) this.onSettingsChange({ demoCurrentTime: e.target.value });
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
