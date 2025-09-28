/**
 * SideTimeTable - Options Page Management (Component-Based)
 *
 * Options page using new component-based architecture
 */

import {
    DEFAULT_SETTINGS,
    generateTimeList,
    loadSettings,
    saveSettings,
    reloadSidePanel,
    logError
} from '../lib/utils.js';
import { StorageHelper } from '../lib/storage-helper.js';
import { isDemoMode, setDemoMode } from '../lib/demo-data.js';
import {
    ComponentManager,
    GoogleIntegrationCard,
    CalendarManagementCard,
    TimeSettingsCard,
    ColorSettingsCard,
    LanguageSettingsCard,
    ShortcutSettingsCard,
    ControlButtonsComponent
} from './components/index.js';

/**
 * OptionsPageManager - Overall options page management class
 */
class OptionsPageManager {
    constructor() {
        this.componentManager = new ComponentManager();
        this.googleIntegrationCard = null;
        this.calendarManagementCard = null;
        this.timeSettingsCard = null;
        this.colorSettingsCard = null;
        this.languageSettingsCard = null;
        this.shortcutSettingsCard = null;
        this.controlButtons = null;
    }

    async initialize() {
        const container = document.querySelector('.container');
        this.componentManager.setContainer(container);

        // Create the Google integration card
        this.googleIntegrationCard = new GoogleIntegrationCard(
            this.handleGoogleIntegrationChange.bind(this)
        );
        this.componentManager.register('googleIntegration', this.googleIntegrationCard);

        // Create the calendar management card
        this.calendarManagementCard = new CalendarManagementCard();
        this.componentManager.register('calendarManagement', this.calendarManagementCard);

        // Create the time settings card
        this.timeSettingsCard = new TimeSettingsCard(this.handleTimeSettingsChange.bind(this));
        this.componentManager.register('timeSettings', this.timeSettingsCard);

        // Create the color settings card
        this.colorSettingsCard = new ColorSettingsCard(this.handleColorSettingsChange.bind(this));
        this.componentManager.register('colorSettings', this.colorSettingsCard);

        // Create the language settings card
        this.languageSettingsCard = new LanguageSettingsCard(this.handleLanguageSettingsChange.bind(this));
        this.componentManager.register('languageSettings', this.languageSettingsCard);

        // Create the shortcut settings card
        this.shortcutSettingsCard = new ShortcutSettingsCard();
        this.componentManager.register('shortcutSettings', this.shortcutSettingsCard);

        // Create control buttons
        this.controlButtons = new ControlButtonsComponent(
            this.handleResetSettings.bind(this)
        );
        this.componentManager.register('controlButtons', this.controlButtons);

        // Load existing settings and apply to components
        await this._loadAndApplySettings();

        // Initialize components
        await this.componentManager.initializeAll();

        // Re-execute localization after component generation
        if (window.localizeHtmlPageWithLang) {
            try {
                await window.localizeHtmlPageWithLang();
            } catch (error) {
                console.warn('Post-component localization error:', error);
            }
        }

    }

    async _loadAndApplySettings() {
        try {
            // Load existing settings
            const settings = await loadSettings();

            // Apply settings to each component
            this.timeSettingsCard.updateSettings({
                openTime: settings.openTime,
                closeTime: settings.closeTime,
                breakTimeFixed: settings.breakTimeFixed,
                breakTimeStart: settings.breakTimeStart,
                breakTimeEnd: settings.breakTimeEnd
            });

            this.colorSettingsCard.updateSettings({
                workTimeColor: settings.workTimeColor,
                localEventColor: settings.localEventColor,
                googleEventColor: settings.googleEventColor
            });

            // Load language settings
            const languageSettings = await new Promise((resolve) => {
                chrome.storage.sync.get(['language'], (result) => {
                    resolve({ language: result.language || 'auto' });
                });
            });

            this.languageSettingsCard.updateSettings(languageSettings);

            // Check Google integration status
            const response = await new Promise((resolve) => {
                chrome.runtime.sendMessage({action: 'checkGoogleAuth'}, resolve);
            });

            if (response.authenticated) {
                this.googleIntegrationCard.updateIntegrationStatus(true);
                this.calendarManagementCard.show();
            }

        } catch (error) {
            console.error('Settings loading error:', error);
        }
    }

    async handleGoogleIntegrationChange(shouldIntegrate) {
        try {
            if (shouldIntegrate) {
                this.googleIntegrationCard.setButtonEnabled(false);
                this.googleIntegrationCard.updateIntegrationStatus(false, 'Connecting...');

                const response = await new Promise((resolve) => {
                    chrome.runtime.sendMessage({action: 'authenticateGoogle'}, resolve);
                });

                if (response.success) {
                    this.googleIntegrationCard.updateIntegrationStatus(true);
                    this.calendarManagementCard.show();
                    // Enable Google integration
                    const settings = await loadSettings();
                    await saveSettings({ ...settings, googleIntegrated: true });
                    this._reloadSidePanel();
                } else {
                    throw new Error(response.error || 'Authentication failed');
                }
            } else {
                // Disable Google integration
                this.googleIntegrationCard.setButtonEnabled(false);
                this.googleIntegrationCard.updateIntegrationStatus(false, 'Disconnecting...');

                const response = await new Promise((resolve) => {
                    chrome.runtime.sendMessage({action: 'disconnectGoogle'}, resolve);
                });

                if (response.success) {
                    const settings = await loadSettings();
                    await saveSettings({ ...settings, googleIntegrated: false });
                    this.googleIntegrationCard.updateIntegrationStatus(false);
                    this.calendarManagementCard.hide();
                    this._reloadSidePanel();

                    // Show notification if manual authentication deletion is required
                    if (response.requiresManualRevoke) {
                        this._showManualRevokeNotification(response.revokeUrl);
                    }
                } else {
                    throw new Error(response.error || 'Disconnection failed');
                }
            }
        } catch (error) {
            logError('Google integration change', error);
            this.googleIntegrationCard.updateIntegrationStatus(false, `Error: ${error.message}`);
        } finally {
            this.googleIntegrationCard.setButtonEnabled(true);
        }
    }

    async handleTimeSettingsChange(timeSettings) {
        try {
            // Load existing settings, update only time settings
            const currentSettings = await loadSettings();
            const updatedSettings = {
                ...currentSettings,
                openTime: timeSettings.openTime,
                closeTime: timeSettings.closeTime,
                breakTimeFixed: timeSettings.breakTimeFixed,
                breakTimeStart: timeSettings.breakTimeStart,
                breakTimeEnd: timeSettings.breakTimeEnd
            };

            await saveSettings(updatedSettings);

            // Reload side panel
            this._reloadSidePanel();
        } catch (error) {
            logError('Time settings save', error);
        }
    }

    async handleColorSettingsChange(colorSettings) {
        try {
            // Load existing settings and update only color settings
            const currentSettings = await loadSettings();
            const updatedSettings = {
                ...currentSettings,
                workTimeColor: colorSettings.workTimeColor,
                localEventColor: colorSettings.localEventColor,
                googleEventColor: colorSettings.googleEventColor
            };

            await saveSettings(updatedSettings);

            // Update CSS variables immediately
            document.documentElement.style.setProperty('--side-calendar-work-time-color', colorSettings.workTimeColor);
            document.documentElement.style.setProperty('--side-calendar-local-event-color', colorSettings.localEventColor);
            document.documentElement.style.setProperty('--side-calendar-google-event-color', colorSettings.googleEventColor);

            // Reload side panel
            this._reloadSidePanel();
        } catch (error) {
            logError('Color settings save', error);
        }
    }

    async handleLanguageSettingsChange(languageSettings) {
        try {
            // Save language settings (using the same keys as existing localize.js)
            await new Promise((resolve) => {
                chrome.storage.sync.set({ 'language': languageSettings.language }, resolve);
            });


            // Reload side panel
            this._reloadSidePanel();
        } catch (error) {
            logError('Language settings save', error);
        }
    }


    async handleResetSettings() {
        try {
            // Reset to default settings
            await saveSettings(DEFAULT_SETTINGS);

            // Update each component with default settings
            this.timeSettingsCard.resetToDefaults();
            this.colorSettingsCard.resetToDefaults();
            this.languageSettingsCard.resetToDefaults();

            // Reset CSS variables too
            document.documentElement.style.setProperty('--side-calendar-work-time-color', DEFAULT_SETTINGS.workTimeColor);
            document.documentElement.style.setProperty('--side-calendar-local-event-color', DEFAULT_SETTINGS.localEventColor);
            document.documentElement.style.setProperty('--side-calendar-google-event-color', DEFAULT_SETTINGS.googleEventColor);

            // Reload side panel
            this._reloadSidePanel();

        } catch (error) {
            logError('Settings reset', error);
            throw error;
        }
    }

    /**
     * Reload side panel
     * @private
     */
    _reloadSidePanel() {
        try {
            chrome.runtime.sendMessage({
                action: 'reloadSideTimeTable'
            });
        } catch (error) {
            console.warn('Failed to notify side panel reload:', error);
        }
    }

    /**
     * Show manual authentication removal notification
     * @private
     */
    _showManualRevokeNotification(revokeUrl) {
        // Remove existing notifications
        const existingNotice = document.querySelector('.manual-revoke-notice');
        if (existingNotice) {
            existingNotice.remove();
        }

        // Create a notification message
        const notice = document.createElement('div');
        notice.className = 'alert alert-warning alert-dismissible fade show manual-revoke-notice mt-3';
        notice.innerHTML = `
            <div class="d-flex align-items-start">
                <i class="fas fa-exclamation-triangle me-2 mt-1"></i>
                <div class="flex-grow-1">
                    <strong>Additional steps are required for complete disconnection</strong><br>
                    <small class="text-muted">
                        We have removed the token from the extension, but to completely disconnect, please manually revoke permission in your Google account settings.
                    </small>
                    <div class="mt-2">
                        <a href="${revokeUrl}" target="_blank" class="btn btn-sm btn-outline-primary">
                            <i class="fas fa-external-link-alt me-1"></i>
                            Open Google Account Settings
                        </a>
                    </div>
                </div>
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;

        // Insert after the first card
        const firstCard = document.querySelector('.card');
        if (firstCard && firstCard.parentNode) {
            firstCard.parentNode.insertBefore(notice, firstCard.nextSibling);
        } else {
            document.body.appendChild(notice);
        }

        // Auto-remove after 30 seconds
        setTimeout(() => {
            if (notice.parentNode) {
                notice.remove();
            }
        }, 30000);
    }
}

// Execute when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    // Localization (execute in language based on settings)
    if (window.localizeHtmlPageWithLang) {
        try {
            await window.localizeHtmlPageWithLang();
        } catch (error) {
            console.warn('Error in localization process:', error);
        }
    }

    // Initialize the new component-based options page manager
    const optionsPageManager = new OptionsPageManager();
    await optionsPageManager.initialize();
});