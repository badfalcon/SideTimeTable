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
            classes: '',
            hidden: true
        });

        this.onSettingsChange = onSettingsChange;
        this.demoModeToggle = null;
        this.dynamicElements = [];
    }

    createElement() {
        const card = super.createElement();
        this.addContent(this._createForm());
        this._updateUI();
        this._setupEventListeners();
        return card;
    }

    _createForm() {
        const form = document.createElement('form');
        form.appendChild(this._createDemoModeSection());
        form.appendChild(this._createInfoSection());
        return form;
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

    _createInfoSection() {
        const section = document.createElement('div');
        section.className = 'mt-4 p-3 bg-light rounded';

        const title = document.createElement('h6');
        title.className = 'mb-3';
        title.innerHTML = '<i class="fas fa-info-circle me-1"></i>Developer Information';

        const infoList = document.createElement('div');
        infoList.className = 'small';

        const infoItems = [
            { label: 'Extension ID', value: chrome.runtime?.id || 'Cannot retrieve', copyable: true },
            { label: 'Manifest Version', value: chrome.runtime?.getManifest?.()?.manifest_version || 'Unknown', copyable: false },
            { label: 'Version', value: chrome.runtime?.getManifest?.()?.version || 'Unknown', copyable: false },
            { label: 'Demo Mode Status', value: () => isDemoMode() ? 'Enabled' : 'Disabled', copyable: false, dynamic: true }
        ];

        infoItems.forEach(item => infoList.appendChild(this._createInfoRow(item)));
        section.appendChild(title);
        section.appendChild(infoList);
        return section;
    }

    _createInfoRow(item) {
        const row = document.createElement('div');
        row.className = 'd-flex justify-content-between align-items-center py-1 border-bottom';

        const label = document.createElement('span');
        label.className = 'fw-semibold';
        label.textContent = item.label + ':';

        const valueContainer = document.createElement('div');
        valueContainer.className = 'd-flex align-items-center gap-2';

        const value = document.createElement('code');
        value.className = 'small';
        if (item.dynamic) {
            value.textContent = item.value();
            this.dynamicElements.push({ element: value, getValue: item.value });
        } else {
            value.textContent = item.value;
        }
        valueContainer.appendChild(value);

        if (item.copyable) {
            const copyBtn = document.createElement('button');
            copyBtn.type = 'button';
            copyBtn.className = 'btn btn-outline-secondary btn-sm';
            copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
            copyBtn.title = 'Copy to clipboard';
            copyBtn.addEventListener('click', () => {
                this._copyToClipboard(item.value);
                this._showCopyNotification(copyBtn);
            });
            valueContainer.appendChild(copyBtn);
        }

        row.appendChild(label);
        row.appendChild(valueContainer);
        return row;
    }

    _updateUI() {
        if (this.demoModeToggle) {
            this.demoModeToggle.checked = isDemoMode();
        }
        this.dynamicElements.forEach(({ element, getValue }) => {
            element.textContent = getValue();
        });
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
