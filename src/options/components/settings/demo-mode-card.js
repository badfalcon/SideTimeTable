/**
 * DemoModeCard - Demo mode settings card component
 */
import { CardComponent } from '../base/card-component.js';
import { createIcon, createSelect, createSettingRow, createSwitch, msg, setText } from '../base/settings-dom.js';
import { createTimeField } from '../../../lib/time-field.js';
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
            title: msg('demoModeCardTitle', 'Demo mode'),
            titleLocalize: '__MSG_demoModeCardTitle__',
            icon: 'fas fa-flask',
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
        this.demoModeToggle = createSwitch('demo-mode-toggle');
        return createSettingRow({
            labelKey: 'demoModeToggleLabel',
            labelFallback: 'Use demo data',
            labelFor: 'demo-mode-toggle',
            hintKey: 'demoModeHelp',
            hintFallback: 'Display sample data (no API access will be made)',
            control: this.demoModeToggle
        }).row;
    }

    _createTimeSection() {
        this.timeInput = createTimeField({ id: 'demo-time-input', className: 'settings-input settings-time-input', step: 30 });
        this.timeInput.disabled = true;

        return createSettingRow({
            labelKey: 'demoTimeLabel',
            labelFallback: 'Current time line position',
            labelFor: 'demo-time-input',
            hintKey: 'demoTimeHelp',
            hintFallback: 'Time shown by the current time line in demo mode',
            control: this.timeInput
        }).row;
    }

    _createScenarioSection() {
        this.scenarioSelect = createSelect('demo-scenario-select');
        this.scenarioSelect.disabled = true;

        const { row, hint } = createSettingRow({
            labelKey: 'demoScenarioLabel',
            labelFallback: 'Scenario',
            labelFor: 'demo-scenario-select',
            hintKey: 'demoScenarioHelp',
            hintFallback: 'Reload the side panel to apply changes.',
            control: this.scenarioSelect
        });
        row.id = 'demo-scenario-section';

        // The hint: what the chosen scenario shows, then how to apply it
        const help = setText(document.createElement('span'), 'demoScenarioHelp', 'Reload the side panel to apply changes.');
        help.className = 'setting-row-hint-line';
        this._scenarioDescEl = document.createElement('span');
        this._scenarioDescEl.className = 'setting-row-hint-line';
        hint.removeAttribute('data-localize');
        hint.replaceChildren(this._scenarioDescEl, help);
        return row;
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
        this.langSelect = createSelect('demo-lang-select', [
            { value: 'auto', text: msg('demoLanguageAuto', 'Auto (follow extension setting)'), key: '__MSG_demoLanguageAuto__' },
            { value: 'en', text: 'English' },
            { value: 'ja', text: '日本語' }
        ]);
        this.langSelect.disabled = true;
        this.langSelect.value = getDemoLang();

        const { row } = createSettingRow({
            labelKey: 'demoLanguageLabel',
            labelFallback: 'Demo language',
            labelFor: 'demo-lang-select',
            hintKey: 'demoLanguageHelp',
            hintFallback: 'Override language used in demo data (for screenshots etc.)',
            control: this.langSelect
        });
        row.id = 'demo-language-section';
        return row;
    }

    /**
     * While demo mode is on: this page with ?demo=true, to preview the demo
     * settings
     * @private
     */
    _createDemoLinkSection() {
        const demoUrl = window.location.pathname + '?demo=true';

        const link = document.createElement('a');
        link.href = demoUrl;
        link.target = '_blank';
        link.rel = 'noopener';
        link.className = 'settings-btn';
        link.appendChild(createIcon('fas fa-arrow-up-right-from-square'));
        link.appendChild(setText(document.createElement('span'), 'demoLinkOpen', 'Open'));

        const { row } = createSettingRow({
            labelKey: 'demoLinkLabel',
            labelFallback: 'Preview the demo settings',
            control: link
        });
        row.id = 'demo-link-section';

        // The address it opens, under the name
        const path = document.createElement('p');
        path.className = 'setting-row-hint settings-mono';
        path.textContent = demoUrl;
        row.querySelector('.setting-row-text').appendChild(path);
        return row;
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
            this.demoLinkSection.hidden = !isDemo;
        }
    }

    _setupEventListeners() {
        this.demoModeToggle?.addEventListener('change', (e) => {
            const enabled = e.target.checked;
            setDemoMode(enabled);
            this._updateUI();
            const demoMsg = enabled
                ? msg('demoModeEnabled', 'Demo mode enabled')
                : msg('demoModeDisabled', 'Demo mode disabled');
            this._showAlert(demoMsg, 'info', 3000);
            if (this.onSettingsChange) this.onSettingsChange({ demoMode: enabled });
        });

        this.timeInput?.addEventListener('change', (e) => {
            setDemoCurrentTime(e.target.value);
            if (this.onSettingsChange) this.onSettingsChange({ demoCurrentTime: e.target.value });
        });

        this.langSelect?.addEventListener('change', (e) => {
            setDemoLang(e.target.value);
            this._loadScenarioOptions();
            this._showAlert(msg('demoLanguageChanged', 'Language changed — reload the side panel to apply.'), 'info', 4000);
        });

        this.scenarioSelect?.addEventListener('change', (e) => {
            const id = e.target.value;
            setDemoScenario(id);
            this._updateScenarioDesc(this._scenarioOptions, id);
            this._showAlert(msg('demoScenarioChanged', 'Scenario changed — reload the side panel to apply.'), 'info', 4000);
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
