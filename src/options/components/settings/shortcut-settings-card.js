/**
 * ShortcutSettingsCard - Keyboard shortcut settings card component
 */
import { CardComponent } from '../base/card-component.js';

export class ShortcutSettingsCard extends CardComponent {
    constructor() {
        super({
            title: 'Keyboard Shortcuts',
            titleLocalize: '__MSG_shortcutSettings__',
            subtitle: 'Shortcut keys for opening the side panel.',
            subtitleLocalize: '__MSG_shortcutDescription__',
            icon: 'fas fa-keyboard',
            iconColor: 'text-secondary'
        });

        // The UI elements
        this.configureButton = null;
        this.shortcutDisplay = null;

        // The current shortcut information
        this.currentShortcut = null;
    }

    createElement() {
        const card = super.createElement();

        // Create the shortcut settings area
        const settingsArea = this._createShortcutSettings();
        this.addContent(settingsArea);

        // Get and display the current shortcuts
        this._loadCurrentShortcut();

        // Set up the event listeners
        this._setupEventListeners();

        return card;
    }

    /**
     * Create shortcut settings area
     * @private
     */
    _createShortcutSettings() {
        const container = document.createElement('div');
        container.className = 'mb-3';

        // The label
        const label = document.createElement('label');
        label.className = 'form-label';
        label.setAttribute('data-localize', '__MSG_currentShortcut__');
        label.textContent = 'Current Shortcut:';

        // The control area
        const controlsDiv = document.createElement('div');
        controlsDiv.className = 'd-flex align-items-center gap-2';

        // The settings button
        this.configureButton = document.createElement('button');
        this.configureButton.id = 'configure-shortcuts-btn';
        this.configureButton.className = 'btn btn-outline-secondary text-nowrap flex-shrink-0';
        this.configureButton.type = 'button';
        this.configureButton.innerHTML = `
            <i class="fas fa-external-link-alt me-1"></i>
            <span data-localize="__MSG_configureShortcuts__">Configure</span>
        `;

        // The shortcut display
        this.shortcutDisplay = document.createElement('span');
        this.shortcutDisplay.id = 'shortcut-key';
        this.shortcutDisplay.className = 'form-control-plaintext text-muted flex-grow-1';
        this.shortcutDisplay.textContent = 'Loading...';

        controlsDiv.appendChild(this.configureButton);
        controlsDiv.appendChild(this.shortcutDisplay);

        // The help text
        const helpText = document.createElement('small');
        helpText.className = 'form-text text-muted';
        helpText.setAttribute('data-localize', '__MSG_shortcutHelp__');
        helpText.textContent = 'To change settings, please use the Chrome extension management page (chrome://extensions/shortcuts).';

        container.appendChild(label);
        container.appendChild(controlsDiv);
        container.appendChild(helpText);

        return container;
    }


    /**
     * Set up event listeners
     * @private
     */
    _setupEventListeners() {
        // Settings button click
        this.configureButton?.addEventListener('click', () => {
            this._openShortcutsPage();
        });
    }

    /**
     * Load current shortcuts
     * @private
     */
    async _loadCurrentShortcut() {
        try {
            if (chrome.commands && chrome.commands.getAll) {
                const commands = await new Promise((resolve) => {
                    chrome.commands.getAll(resolve);
                });

                // Search for side panel commands
                const sideTimeTableCommand = commands.find(cmd =>
                    cmd.name === 'open-side-panel' ||
                    cmd.name === '_execute_action' ||
                    cmd.description?.toLowerCase().includes('side') ||
                    cmd.description?.toLowerCase().includes('panel')
                );

                if (sideTimeTableCommand && sideTimeTableCommand.shortcut) {
                    this.currentShortcut = sideTimeTableCommand.shortcut;
                    this._updateShortcutDisplay(sideTimeTableCommand.shortcut);
                } else {
                    this._updateShortcutDisplay(null);
                }
            } else {
                this._updateShortcutDisplay(null, 'Cannot access extension API');
            }
        } catch (error) {
            console.error('Shortcut fetch error:', error);
            this._updateShortcutDisplay(null, 'An error occurred');
        }
    }

    /**
     * Update shortcut display
     * @private
     */
    _updateShortcutDisplay(shortcut, errorMessage = null) {
        if (!this.shortcutDisplay) return;

        if (errorMessage) {
            this.shortcutDisplay.textContent = errorMessage;
            this.shortcutDisplay.className = 'form-control-plaintext text-danger flex-grow-1';
        } else if (shortcut) {
            this.shortcutDisplay.textContent = shortcut;
            this.shortcutDisplay.className = 'form-control-plaintext text-dark fw-bold flex-grow-1';
        } else {
            this.shortcutDisplay.setAttribute('data-localize', '__MSG_noShortcutSet__');
            this.shortcutDisplay.textContent = chrome.i18n?.getMessage('noShortcutSet') || 'Not Set';
            this.shortcutDisplay.className = 'form-control-plaintext text-muted flex-grow-1';
        }
    }

    /**
     * Open shortcuts settings page
     * @private
     */
    _openShortcutsPage() {
        const shortcutsUrl = 'chrome://extensions/shortcuts';

        try {
            // Open in new tab
            if (chrome.tabs && chrome.tabs.create) {
                chrome.tabs.create({ url: shortcutsUrl });
            } else {
                // Fallback: open directly
                window.open(shortcutsUrl, '_blank');
            }
        } catch (error) {
            // Final fallback: copy to clipboard
            this._copyToClipboard(shortcutsUrl);
            this._showCopyNotification();
        }
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
    _showCopyNotification() {
        const notification = document.createElement('div');
        notification.className = 'alert alert-info alert-dismissible fade show mt-3';
        notification.innerHTML = `
            <i class="fas fa-copy me-1"></i>
            URL has been copied to clipboard. Please paste it into your browser's address bar to navigate.
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
     * Reload shortcut information
     */
    async refreshShortcuts() {
        this.shortcutDisplay.textContent = 'Loading...';
        await this._loadCurrentShortcut();
    }

    /**
     * Get current shortcut
     */
    getCurrentShortcut() {
        return this.currentShortcut;
    }

    /**
     * Check shortcut availability
     */
    async checkShortcutAvailability() {
        try {
            if (!chrome.commands) return false;

            const commands = await new Promise((resolve) => {
                chrome.commands.getAll(resolve);
            });

            return commands.some(cmd => cmd.shortcut);
        } catch (error) {
            console.error('Shortcut availability check error:', error);
            return false;
        }
    }

}