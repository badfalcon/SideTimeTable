/**
 * DeveloperSettingsCard - Developer settings card component
 */
import { CardComponent } from '../base/card-component.js';
import { isDemoMode, setDemoMode } from '../../../lib/demo-data.js';

export class DeveloperSettingsCard extends CardComponent {
    constructor(onSettingsChange) {
        super({
            id: 'developer-settings-card',
            title: 'Developer Settings',
            subtitle: 'Settings for development and testing. Normally no changes are required.',
            icon: 'fas fa-code',
            iconColor: 'text-danger',
            classes: '',
            hidden: true // Hidden by default
        });

        this.onSettingsChange = onSettingsChange;

        // The form elements
        this.demoModeToggle = null;

        // The current settings values
        this.settings = {
            demoMode: false
        };
    }

    createElement() {
        const card = super.createElement();

        // Create the developer settings form
        const form = this._createForm();
        this.addContent(form);

        // Load the current settings
        this._loadCurrentSettings();

        // Setup the event listeners
        this._setupEventListeners();

        return card;
    }

    /**
     * Create form
     * @private
     */
    _createForm() {
        const form = document.createElement('form');

        // The demo mode settings
        const demoModeSection = this._createDemoModeSection();
        form.appendChild(demoModeSection);

        // The additional developer information
        const infoSection = this._createInfoSection();
        form.appendChild(infoSection);

        return form;
    }

    /**
     * Create demo mode section
     * @private
     */
    _createDemoModeSection() {
        const section = document.createElement('div');
        section.className = 'form-check mb-3';

        // The checkbox
        this.demoModeToggle = document.createElement('input');
        this.demoModeToggle.type = 'checkbox';
        this.demoModeToggle.className = 'form-check-input';
        this.demoModeToggle.id = 'demo-mode-toggle';

        // The label
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

    /**
     * Create info section
     * @private
     */
    _createInfoSection() {
        const section = document.createElement('div');
        section.className = 'mt-4 p-3 bg-light rounded';

        // The title
        const title = document.createElement('h6');
        title.className = 'mb-3';
        title.innerHTML = `
            <i class="fas fa-info-circle me-1"></i>
            Developer Information
        `;

        // The info list
        const infoList = document.createElement('div');
        infoList.className = 'small';

        const infoItems = [
            {
                label: 'Extension ID',
                value: chrome.runtime?.id || 'Cannot retrieve',
                copyable: true
            },
            {
                label: 'Manifest Version',
                value: chrome.runtime?.getManifest?.()?.manifest_version || 'Unknown',
                copyable: false
            },
            {
                label: 'Version',
                value: chrome.runtime?.getManifest?.()?.version || 'Unknown',
                copyable: false
            },
            {
                label: 'Demo Mode Status',
                value: () => this.settings.demoMode ? 'Enabled' : 'Disabled',
                copyable: false,
                dynamic: true
            }
        ];

        infoItems.forEach(item => {
            const row = this._createInfoRow(item);
            infoList.appendChild(row);
        });

        section.appendChild(title);
        section.appendChild(infoList);

        return section;
    }

    /**
     * Create info row
     * @private
     */
    _createInfoRow(item) {
        const row = document.createElement('div');
        row.className = 'd-flex justify-content-between align-items-center py-1 border-bottom';

        // The label
        const label = document.createElement('span');
        label.className = 'fw-semibold';
        label.textContent = item.label + ':';

        // The container for value and buttons
        const valueContainer = document.createElement('div');
        valueContainer.className = 'd-flex align-items-center gap-2';

        // The value
        const value = document.createElement('code');
        value.className = 'small';

        if (item.dynamic) {
            value.textContent = item.value();
            // Save reference for updating dynamic values
            if (!this.dynamicElements) this.dynamicElements = [];
            this.dynamicElements.push({ element: value, getValue: item.value });
        } else {
            value.textContent = item.value;
        }

        valueContainer.appendChild(value);

        // Copy button (if needed)
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

    /**
     * Load current settings
     * @private
     */
    _loadCurrentSettings() {
        this.settings.demoMode = isDemoMode();
        this._updateUI();
    }

    /**
     * Update UI
     * @private
     */
    _updateUI() {
        if (this.demoModeToggle) {
            this.demoModeToggle.checked = this.settings.demoMode;
        }

        // Update dynamic elements
        if (this.dynamicElements) {
            this.dynamicElements.forEach(({ element, getValue }) => {
                element.textContent = getValue();
            });
        }
    }

    /**
     * Setup event listeners
     * @private
     */
    _setupEventListeners() {
        // Demo mode toggle
        this.demoModeToggle?.addEventListener('change', (e) => {
            this._handleDemoModeChange(e.target.checked);
        });
    }

    /**
     * Handle demo mode change
     * @private
     */
    _handleDemoModeChange(enabled) {
        this.settings.demoMode = enabled;
        setDemoMode(enabled);

        // Update UI
        this._updateUI();

        // Callback with changes
        if (this.onSettingsChange) {
            this.onSettingsChange({
                demoMode: enabled
            });
        }

        // Show change notification
        this._showModeChangeNotification(enabled);
    }

    /**
     * Show mode change notification
     * @private
     */
    _showModeChangeNotification(enabled) {
        const notification = document.createElement('div');
        notification.className = 'alert alert-info alert-dismissible fade show mt-3';
        notification.innerHTML = `
            <i class="fas fa-${enabled ? 'flask' : 'globe'} me-1"></i>
            <strong>Demo mode ${enabled ? 'enabled' : 'disabled'}</strong><br>
            <small>Please reload the side panel to apply the changes.</small>
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        this.bodyElement.appendChild(notification);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }

    /**
     * Copy to clipboard
     * @private
     */
    async _copyToClipboard(text) {
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
            } else {
                // Fallback
                const textArea = document.createElement('textarea');
                textArea.value = text;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
            }
        } catch (error) {
            console.error('Clipboard copy error:', error);
        }
    }

    /**
     * Show copy notification
     * @private
     */
    _showCopyNotification(button) {
        const originalHTML = button.innerHTML;
        button.innerHTML = '<i class="fas fa-check text-success"></i>';
        button.disabled = true;

        setTimeout(() => {
            button.innerHTML = originalHTML;
            button.disabled = false;
        }, 1000);
    }

    /**
     * Toggle developer settings visibility
     */
    toggleVisibility() {
        const isHidden = this.element.style.display === 'none';
        this.setVisible(isHidden);
        return !isHidden;
    }

    /**
     * Get current settings
     */
    getSettings() {
        return {
            demoMode: this.settings.demoMode
        };
    }

    /**
     * Update settings
     */
    updateSettings(settings) {
        this.settings = { ...this.settings, ...settings };
        this._updateUI();
    }

    /**
     * Add debug information
     */
    addDebugInfo() {
        const debugSection = document.createElement('div');
        debugSection.className = 'mt-3 p-2 bg-warning bg-opacity-10 border rounded';

        debugSection.innerHTML = `
            <h6 class="text-warning">
                <i class="fas fa-bug me-1"></i>
                Debug Information
            </h6>
            <div class="small">
                <div>Page load time: ${new Date().toLocaleString()}</div>
                <div>User agent: ${navigator.userAgent.substring(0, 50)}...</div>
                <div>Local storage available: ${typeof(Storage) !== "undefined" ? 'Yes' : 'No'}</div>
                <div>Chrome extension API available: ${typeof chrome !== 'undefined' && chrome.runtime ? 'Yes' : 'No'}</div>
            </div>
        `;

        this.bodyElement.appendChild(debugSection);
    }
}