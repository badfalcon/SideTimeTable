/**
 * ExtensionInfoCard - Extension information card component
 */
import { CardComponent } from '../base/card-component.js';

export class ExtensionInfoCard extends CardComponent {
    constructor() {
        super({
            id: 'extension-info-card',
            title: window.getLocalizedMessage('extensionInfoCardTitle') || 'Extension Info',
            subtitle: window.getLocalizedMessage('extensionInfoCardSubtitle') || 'Information about this extension.',
            icon: 'fas fa-info-circle',
            iconColor: 'text-secondary',
            hidden: true
        });
    }

    createElement() {
        const card = super.createElement();
        this.addContent(this._createInfoSection());
        return card;
    }

    _createInfoSection() {
        const infoList = document.createElement('div');
        infoList.className = 'small';

        const manifest = chrome.runtime?.getManifest?.() || {};
        const infoItems = [
            { label: window.getLocalizedMessage('extensionIdLabel') || 'Extension ID', value: chrome.runtime?.id || (window.getLocalizedMessage('cannotRetrieve') || 'Cannot retrieve'), copyable: true },
            { label: window.getLocalizedMessage('manifestVersionLabel') || 'Manifest Version', value: manifest.manifest_version || (window.getLocalizedMessage('unknown') || 'Unknown') },
            { label: window.getLocalizedMessage('versionLabel') || 'Version', value: manifest.version || (window.getLocalizedMessage('unknown') || 'Unknown') }
        ];

        infoItems.forEach(item => infoList.appendChild(this._createInfoRow(item)));
        return infoList;
    }

    _createInfoRow(item) {
        const row = document.createElement('div');
        row.className = 'd-flex justify-content-between align-items-center py-1 border-bottom gap-2';

        const label = document.createElement('span');
        label.className = 'fw-semibold';
        label.textContent = item.label + ':';

        const valueContainer = document.createElement('div');
        valueContainer.className = 'd-flex align-items-center gap-2';

        const value = document.createElement('code');
        value.className = 'small';
        value.textContent = String(item.value);
        valueContainer.appendChild(value);

        if (item.copyable) {
            const copyBtn = document.createElement('button');
            copyBtn.type = 'button';
            copyBtn.className = 'btn btn-outline-secondary btn-sm';
            copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
            copyBtn.title = window.getLocalizedMessage('copyToClipboard') || 'Copy to clipboard';
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
}
