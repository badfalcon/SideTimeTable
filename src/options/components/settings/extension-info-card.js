/**
 * ExtensionInfoCard - Extension information card component
 */
import { CardComponent } from '../base/card-component.js';
import { createIconButton, createSettingRow, msg } from '../base/settings-dom.js';

export class ExtensionInfoCard extends CardComponent {
    constructor() {
        super({
            id: 'extension-info-card',
            title: msg('extensionInfoCardTitle', 'Extension Info'),
            titleLocalize: '__MSG_extensionInfoCardTitle__',
            subtitle: msg('extensionInfoCardSubtitle', 'Information about this extension.'),
            subtitleLocalize: '__MSG_extensionInfoCardSubtitle__',
            icon: 'fas fa-circle-info',
            hidden: true
        });
    }

    createElement() {
        const card = super.createElement();

        const manifest = chrome.runtime?.getManifest?.() || {};
        const unknown = msg('unknown', 'Unknown');
        [
            { key: 'extensionIdLabel', fallback: 'Extension ID', value: chrome.runtime?.id || msg('cannotRetrieve', 'Cannot retrieve'), copyable: !!chrome.runtime?.id },
            { key: 'manifestVersionLabel', fallback: 'Manifest Version', value: manifest.manifest_version || unknown },
            { key: 'versionLabel', fallback: 'Version', value: manifest.version || unknown }
        ].forEach(item => this.addContent(this._createInfoRow(item)));

        return card;
    }

    /**
     * One fact: its name on the left, the value (and a copy button) on the right
     * @private
     */
    _createInfoRow({ key, fallback, value, copyable }) {
        const valueEl = document.createElement('span');
        valueEl.className = 'settings-mono';
        valueEl.textContent = String(value);

        const control = [valueEl];
        if (copyable) {
            const copyBtn = createIconButton({
                icon: 'fas fa-copy',
                labelKey: 'copyToClipboard',
                labelFallback: 'Copy to clipboard'
            });
            copyBtn.addEventListener('click', () => {
                this._copyToClipboard(String(value));
                this._showCopyNotification(copyBtn);
            });
            control.push(copyBtn);
        }

        return createSettingRow({ labelKey: key, labelFallback: fallback, control }).row;
    }
}
