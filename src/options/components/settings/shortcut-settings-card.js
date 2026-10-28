/**
 * ShortcutSettingsCard - Keyboard shortcut settings card component
 */
import { CardComponent } from '../base/card-component.js';
import { createButton, createSettingRow, msg } from '../base/settings-dom.js';

export class ShortcutSettingsCard extends CardComponent {
    constructor() {
        super({
            title: 'Keyboard Shortcuts',
            titleLocalize: '__MSG_shortcutSettings__',
            icon: 'fas fa-keyboard'
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
     * Create shortcut settings area: the keys as keycaps, and a button to
     * Chrome's shortcut settings (where they are changed)
     * @private
     */
    _createShortcutSettings() {
        this.shortcutDisplay = document.createElement('span');
        this.shortcutDisplay.id = 'shortcut-key';
        this.shortcutDisplay.className = 'shortcut-keys';
        this.shortcutDisplay.textContent = msg('loadingStatus', 'Loading...');

        this.configureButton = createButton({
            id: 'configure-shortcuts-btn',
            labelKey: 'configureShortcuts',
            labelFallback: 'Change',
            icon: 'fas fa-arrow-up-right-from-square'
        });

        const container = document.createElement('div');
        container.className = 'settings-rows';
        container.appendChild(createSettingRow({
            labelKey: 'shortcutOpenPanel',
            labelFallback: 'Open the side panel',
            hintKey: 'shortcutHelp',
            hintFallback: 'Change it in Chrome\'s keyboard shortcuts for extensions.',
            control: [this.shortcutDisplay, this.configureButton]
        }).row);
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

        this.shortcutDisplay.removeAttribute('data-localize');
        this.shortcutDisplay.classList.remove('is-error', 'is-unset');
        if (errorMessage) {
            this.shortcutDisplay.textContent = errorMessage;
            this.shortcutDisplay.classList.add('is-error');
        } else if (shortcut) {
            // "Ctrl+Shift+S" as keycaps
            const keys = shortcut.split('+').filter(Boolean);
            this.shortcutDisplay.replaceChildren();
            keys.forEach((key, i) => {
                if (i > 0) {
                    const plus = document.createElement('span');
                    plus.className = 'shortcut-plus';
                    plus.setAttribute('aria-hidden', 'true');
                    plus.textContent = '+';
                    this.shortcutDisplay.appendChild(plus);
                }
                const kbd = document.createElement('kbd');
                kbd.textContent = key;
                this.shortcutDisplay.appendChild(kbd);
            });
            this.shortcutDisplay.setAttribute('aria-label', shortcut);
        } else {
            this.shortcutDisplay.setAttribute('data-localize', '__MSG_noShortcutSet__');
            this.shortcutDisplay.textContent = msg('noShortcutSet', 'Not set');
            this.shortcutDisplay.classList.add('is-unset');
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
        } catch (_error) {
            // Final fallback: copy to clipboard
            this._copyToClipboard(shortcutsUrl);
            this._showUrlCopiedNotification();
        }
    }

    /**
     * Show URL copied notification
     * @private
     */
    _showUrlCopiedNotification() {
        this._showAlert(
            msg('shortcutUrlCopied', 'URL has been copied to clipboard. Please paste it into your browser\'s address bar to navigate.'),
            'info', 5000
        );
    }

    /**
     * Reload shortcut information
     */
    async refreshShortcuts() {
        this.shortcutDisplay.textContent = window.getLocalizedMessage('loadingStatus') || 'Loading...';
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