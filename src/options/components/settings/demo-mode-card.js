/**
 * DemoModeCard - Demo mode settings card component
 */
import { CardComponent } from '../base/card-component.js';
import {
    isDemoMode, setDemoMode,
    getDemoCurrentTimeString, setDemoCurrentTime,
    getDemoScenario, setDemoScenario, getDemoScenarioList,
    getDemoLang, setDemoLang
} from '../../../lib/demo-data.js';

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
        this.scenarioSelect = null;
        this.scenarioSection = null;
        this.langSelect = null;
        this.demoLinkSection = null;
    }

    createElement() {
        const card = super.createElement();
        this.addContent(this._createDemoModeSection());
        this.addContent(this._createTimeSection());
        this.scenarioSection = this._createScenarioSection();
        this.addContent(this.scenarioSection);
        this.addContent(this._createLanguageSection());
        this.demoLinkSection = this._createDemoLinkSection();
        this.addContent(this.demoLinkSection);
        this._updateUI();
        this._setupEventListeners();
        this._loadScenarioOptions();
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
        section.className = 'mb-3';

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

    _createScenarioSection() {
        const section = document.createElement('div');
        section.className = 'mb-1';
        section.id = 'demo-scenario-section';

        const label = document.createElement('label');
        label.className = 'form-label small mb-1';
        label.htmlFor = 'demo-scenario-select';
        label.textContent = 'Scenario';

        this.scenarioSelect = document.createElement('select');
        this.scenarioSelect.className = 'form-select form-select-sm';
        this.scenarioSelect.id = 'demo-scenario-select';
        this.scenarioSelect.style.maxWidth = '260px';
        this.scenarioSelect.disabled = true;

        this._scenarioDescEl = document.createElement('small');
        this._scenarioDescEl.className = 'text-muted d-block mt-1';

        const helpText = document.createElement('small');
        helpText.className = 'text-muted d-block mt-1';
        helpText.textContent = 'Reload the side panel to apply changes.';

        section.appendChild(label);
        section.appendChild(this.scenarioSelect);
        section.appendChild(this._scenarioDescEl);
        section.appendChild(helpText);
        return section;
    }

    async _loadScenarioOptions() {
        try {
            const scenarios = await getDemoScenarioList();
            const current = getDemoScenario();
            if (!this.scenarioSelect) return;
            this.scenarioSelect.innerHTML = '';
            scenarios.forEach(s => {
                const opt = document.createElement('option');
                opt.value = s.id;
                opt.textContent = s.name;
                if (s.id === current) opt.selected = true;
                this.scenarioSelect.appendChild(opt);
            });
            this._updateScenarioDesc(scenarios, current);
            this._scenarioOptions = scenarios;
        } catch (e) {
            console.warn('Failed to load scenario options:', e);
        }
    }

    _updateScenarioDesc(scenarios, selectedId) {
        const found = (scenarios || this._scenarioOptions || []).find(s => s.id === selectedId);
        this._scenarioDescEl.textContent = found ? found.desc : '';
    }

    _createLanguageSection() {
        const section = document.createElement('div');
        section.className = 'mb-3';
        section.id = 'demo-language-section';

        const label = document.createElement('label');
        label.className = 'form-label small mb-1';
        label.htmlFor = 'demo-lang-select';
        label.textContent = 'Demo language';

        this.langSelect = document.createElement('select');
        this.langSelect.className = 'form-select form-select-sm';
        this.langSelect.id = 'demo-lang-select';
        this.langSelect.style.maxWidth = '180px';
        this.langSelect.disabled = true;

        [
            { value: 'auto', label: 'Auto (follow extension setting)' },
            { value: 'en', label: 'English' },
            { value: 'ja', label: '日本語' }
        ].forEach(({ value, label: text }) => {
            const opt = document.createElement('option');
            opt.value = value;
            opt.textContent = text;
            this.langSelect.appendChild(opt);
        });
        this.langSelect.value = getDemoLang();

        const helpText = document.createElement('small');
        helpText.className = 'text-muted d-block mt-1';
        helpText.textContent = 'Override language used in demo data (for screenshots etc.)';

        section.appendChild(label);
        section.appendChild(this.langSelect);
        section.appendChild(helpText);
        return section;
    }

    _createDemoLinkSection() {
        const section = document.createElement('div');
        section.className = 'mt-3 p-2 bg-light rounded d-none';
        section.id = 'demo-link-section';

        const demoUrl = window.location.pathname + '?demo=true';

        section.innerHTML = `
            <small class="text-muted d-block mb-2">
                <i class="fas fa-info-circle me-1"></i>
                Open with <code>?demo=true</code> to preview demo settings:
            </small>
            <div class="d-flex align-items-center gap-2">
                <code class="flex-grow-1 text-truncate small border rounded px-2 py-1 bg-white">${demoUrl}</code>
                <a href="${demoUrl}" target="_blank" class="btn btn-sm btn-outline-warning text-nowrap">
                    <i class="fas fa-external-link-alt me-1"></i>Open
                </a>
            </div>
        `;

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
        if (this.scenarioSelect) {
            this.scenarioSelect.disabled = !isDemo;
        }
        if (this.langSelect) {
            this.langSelect.disabled = !isDemo;
        }
        if (this.demoLinkSection) {
            this.demoLinkSection.classList.toggle('d-none', !isDemo);
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

        this.langSelect?.addEventListener('change', (e) => {
            setDemoLang(e.target.value);
            this._loadScenarioOptions();
            this._showAlert(
                `<i class="fas fa-language me-1"></i>Language changed — reload the side panel to apply.`,
                'info', 4000
            );
        });

        this.scenarioSelect?.addEventListener('change', (e) => {
            const id = e.target.value;
            setDemoScenario(id);
            this._updateScenarioDesc(this._scenarioOptions, id);
            this._showAlert(
                `<i class="fas fa-users me-1"></i>Scenario changed — reload the side panel to apply.`,
                'info', 4000
            );
            if (this.onSettingsChange) this.onSettingsChange({ demoScenario: id });
        });
    }

    getSettings() {
        return { demoMode: isDemoMode(), demoScenario: getDemoScenario() };
    }

    updateSettings(settings) {
        if ('demoMode' in settings) setDemoMode(settings.demoMode);
        if ('demoScenario' in settings) {
            setDemoScenario(settings.demoScenario);
            if (this.scenarioSelect) this.scenarioSelect.value = settings.demoScenario;
        }
        this._updateUI();
    }
}
