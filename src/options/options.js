/**
 * SideTimeTable - Options Page Management (Component-Based)
 *
 * The options page using the new component-based architecture
 */

import { generateTimeList, reloadSidePanel, logError } from '../lib/utils.js';
import { DEFAULT_SETTINGS, COLOR_CSS_VARS } from '../lib/constants.js';
import { loadSettings, saveSettings } from '../lib/settings-storage.js';
import { sendMessage } from '../lib/chrome-messaging.js';
import { getThemeById, resolveThemeColors } from '../lib/color-themes.js';
import { StorageHelper } from '../lib/storage-helper.js';
import { isDemoMode, setDemoMode, getDemoOptionsSettings, getDemoCalendars, DEMO_BUILD } from '../lib/demo-data.js';
import {
    ComponentManager,
    GoogleIntegrationCard,
    CalendarManagementCard,
    TimeSettingsCard,
    ColorSettingsCard,
    LanguageSettingsCard,
    ShortcutSettingsCard,
    ReminderSettingsCard,
    MemoSettingsCard,
    ReminderDebugCard,
    DemoModeCard,
    StorageCard,
    ExtensionInfoCard,
    ControlButtonsComponent
} from './components/index.js';

/**
 * OptionsPageManager - The overall options page management class
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
        this.reminderSettingsCard = null;
        this.memoSettingsCard = null;
        this.reminderDebugCard = null;
        this.demoModeCard = null;
        this.storageCard = null;
        this.extensionInfoCard = null;
        this.controlButtons = null;
    }

    async initialize() {
        // タブパネルとコントロールコンテナを取得
        const tabGoogle = document.getElementById('tab-google');
        const tabDisplay = document.getElementById('tab-display');
        const tabGeneral = document.getElementById('tab-general');
        const tabDeveloper = document.getElementById('tab-developer');
        const controlContainer = document.getElementById('control-buttons-container');

        // --- Google Calendar タブ ---
        this.googleIntegrationCard = new GoogleIntegrationCard(this.handleGoogleIntegrationChange.bind(this));
        this.googleIntegrationCard.createElement();
        this.googleIntegrationCard.appendTo(tabGoogle);
        this.componentManager.components.set('googleIntegration', this.googleIntegrationCard);

        this.calendarManagementCard = new CalendarManagementCard(this.handleCalendarSelectionChange.bind(this));
        this.calendarManagementCard.createElement();
        this.calendarManagementCard.appendTo(tabGoogle);
        this.componentManager.components.set('calendarManagement', this.calendarManagementCard);

        this.reminderSettingsCard = new ReminderSettingsCard(this.handleReminderSettingsChange.bind(this));
        this.reminderSettingsCard.createElement();
        this.reminderSettingsCard.appendTo(tabGoogle);
        this.componentManager.components.set('reminderSettings', this.reminderSettingsCard);

        // --- Display タブ ---
        this.timeSettingsCard = new TimeSettingsCard(this.handleTimeSettingsChange.bind(this));
        this.timeSettingsCard.createElement();
        this.timeSettingsCard.appendTo(tabDisplay);
        this.componentManager.components.set('timeSettings', this.timeSettingsCard);

        this.colorSettingsCard = new ColorSettingsCard(this.handleColorSettingsChange.bind(this));
        this.colorSettingsCard.createElement();
        this.colorSettingsCard.appendTo(tabDisplay);
        this.componentManager.components.set('colorSettings', this.colorSettingsCard);

        // --- General タブ ---
        this.languageSettingsCard = new LanguageSettingsCard(this.handleLanguageSettingsChange.bind(this));
        this.languageSettingsCard.createElement();
        this.languageSettingsCard.appendTo(tabGeneral);
        this.componentManager.components.set('languageSettings', this.languageSettingsCard);

        this.shortcutSettingsCard = new ShortcutSettingsCard();
        this.shortcutSettingsCard.createElement();
        this.shortcutSettingsCard.appendTo(tabGeneral);
        this.componentManager.components.set('shortcutSettings', this.shortcutSettingsCard);

        this.memoSettingsCard = new MemoSettingsCard(this.handleMemoSettingsChange.bind(this));
        this.memoSettingsCard.createElement();
        this.memoSettingsCard.appendTo(tabGeneral);
        this.componentManager.components.set('memoSettings', this.memoSettingsCard);

        // --- コントロールボタン (タブ外) ---
        this.controlButtons = new ControlButtonsComponent(this.handleResetSettings.bind(this));
        this.controlButtons.createElement();
        this.controlButtons.appendTo(controlContainer);

        // --- Developer タブ (条件付き) ---
        try {
            const { enableDeveloperFeatures = false, enableReminderDebug = false } = await chrome.storage.local.get(['enableDeveloperFeatures', 'enableReminderDebug']);
            const demoViaUrl = new URLSearchParams(window.location.search).get('demo') === 'true';
            const demoViaLocalStorage = localStorage.getItem('sideTimeTableDemo') === 'true';
            const devEnabled = !demoViaUrl && (!!(enableDeveloperFeatures || enableReminderDebug) || demoViaLocalStorage);
            if (devEnabled) {
                this.extensionInfoCard = new ExtensionInfoCard();
                this.extensionInfoCard.createElement();
                this.extensionInfoCard.setVisible(true);
                this.extensionInfoCard.appendTo(tabDeveloper);
                this.componentManager.components.set('extensionInfo', this.extensionInfoCard);

                if (DEMO_BUILD) {
                    this.demoModeCard = new DemoModeCard(this._reloadSidePanel.bind(this));
                    this.demoModeCard.createElement();
                    this.demoModeCard.setVisible(true);
                    this.demoModeCard.appendTo(tabDeveloper);
                    this.componentManager.components.set('demoMode', this.demoModeCard);
                }

                this.reminderDebugCard = new ReminderDebugCard();
                this.reminderDebugCard.createElement();
                this.reminderDebugCard.setVisible(true);
                this.reminderDebugCard.appendTo(tabDeveloper);
                this.componentManager.components.set('reminderDebug', this.reminderDebugCard);

                this.storageCard = new StorageCard();
                this.storageCard.createElement();
                this.storageCard.setVisible(true);
                this.storageCard.appendTo(tabDeveloper);
                this.componentManager.components.set('storage', this.storageCard);

                // nav-pills の Developer ボタンを表示
                const devBtn = document.getElementById('tab-developer-btn');
                if (devBtn) devBtn.classList.remove('d-none');
            }
        } catch (e) {
            console.warn('Failed to read developer features flags:', e);
        }

        // Load the existing settings and apply them to the components
        await this._loadAndApplySettings();

        // Initialize the components
        await this.componentManager.initializeAll();

        // Check Google auth status after components are initialized
        await this._checkGoogleAuthStatus();

        // Re-execute the localization after the component generation
        if (window.localizeHtmlPageWithLang) {
            try {
                await window.localizeHtmlPageWithLang();
            } catch (error) {
                console.warn('Post-component localization error:', error);
            }
        }

        // Show the page after localization is complete
        document.body.style.opacity = '1';
        document.body.style.transition = 'opacity 0.1s';
    }

    async _loadAndApplySettings() {
        try {
            // Load settings (use demo settings in demo mode)
            const settings = isDemoMode() ? getDemoOptionsSettings() : await loadSettings();

            // Apply the settings to each component
            this.timeSettingsCard.updateSettings({
                openTime: settings.openTime,
                closeTime: settings.closeTime,
                breakTimeFixed: settings.breakTimeFixed,
                breakTimeStart: settings.breakTimeStart,
                breakTimeEnd: settings.breakTimeEnd
            });

            // Migrate: if colorTheme is not set, infer from darkMode flag
            const themeId = settings.colorTheme || (settings.darkMode ? 'dark' : 'default');
            this.colorSettingsCard.updateSettings({
                colorTheme: themeId,
                useGoogleCalendarColors: settings.useGoogleCalendarColors !== false
            });

            // Apply theme to options page preview
            const theme = getThemeById(themeId);
            if (theme.isDark) {
                document.documentElement.setAttribute('data-theme', 'dark');
            } else {
                document.documentElement.removeAttribute('data-theme');
            }

            // Load the language settings
            const languageSettings = isDemoMode()
                ? { language: settings.language }
                : await StorageHelper.get(['language'], { language: 'auto' });

            this.languageSettingsCard.updateSettings(languageSettings);

            // Load the reminder settings
            this.reminderSettingsCard.updateSettings({
                googleEventReminder: settings.googleEventReminder || false,
                reminderMinutes: settings.reminderMinutes || 5
            });

            // Load the memo settings
            this.memoSettingsCard.updateSettings({
                memoMarkdown: settings.memoMarkdown || false
            });

        } catch (error) {
            console.error('Settings loading error:', error);
        }
    }

    async _checkGoogleAuthStatus() {
        // Show demo Google integration state in demo mode
        if (isDemoMode()) {
            this.googleIntegrationCard.updateIntegrationStatus(true);
            this.colorSettingsCard.setGoogleCalendarColorsToggleVisible(true);
            await this._loadDemoCalendars();
            return;
        }

        try {
            // Check the Google integration status
            const response = await sendMessage({action: 'checkGoogleAuth'});

            if (response.authenticated) {
                this.googleIntegrationCard.updateIntegrationStatus(true);
                this.calendarManagementCard.show();
                this.colorSettingsCard.setGoogleCalendarColorsToggleVisible(true);
            }
        } catch (error) {
            console.error('Google auth status check error:', error);
        }
    }

    /**
     * Load demo calendars into the calendar management card
     * @private
     */
    async _loadDemoCalendars() {
        const demoCalendars = await getDemoCalendars();
        const demoSettings = getDemoOptionsSettings();
        this.calendarManagementCard.allCalendars = demoCalendars;
        this.calendarManagementCard.selectedCalendarIds = demoSettings.selectedCalendars;
        this.calendarManagementCard.hasAutoFetched = true;
        this.calendarManagementCard.show();
        this.calendarManagementCard.render();
    }

    async handleGoogleIntegrationChange(shouldIntegrate) {
        try {
            if (shouldIntegrate) {
                this.googleIntegrationCard.setButtonEnabled(false);
                this.googleIntegrationCard.updateIntegrationStatus(false, window.getLocalizedMessage('connectingStatus') || 'Connecting...');

                const response = await sendMessage({action: 'authenticateGoogle'});

                if (response.success) {
                    this.googleIntegrationCard.updateIntegrationStatus(true);
                    this.calendarManagementCard.show();
                    this.colorSettingsCard.setGoogleCalendarColorsToggleVisible(true);
                    // Enable the Google integration
                    const settings = await loadSettings();
                    await saveSettings({ ...settings, googleIntegrated: true });
                    this._reloadSidePanel();
                } else {
                    throw new Error(response.error || 'Authentication failed');
                }
            } else {
                // Disable the Google integration
                this.googleIntegrationCard.setButtonEnabled(false);
                this.googleIntegrationCard.updateIntegrationStatus(false, window.getLocalizedMessage('disconnectingStatus') || 'Disconnecting...');

                const response = await sendMessage({action: 'disconnectGoogle'});

                if (response.success) {
                    const settings = await loadSettings();
                    await saveSettings({ ...settings, googleIntegrated: false });
                    this.googleIntegrationCard.updateIntegrationStatus(false);
                    this.calendarManagementCard.hide();
                    this.colorSettingsCard.setGoogleCalendarColorsToggleVisible(false);
                    this._reloadSidePanel();

                    // Show the notification if the manual authentication deletion is required
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
            // Load the existing settings, update only the time settings
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

            // Reload the side panel
            this._reloadSidePanel();
        } catch (error) {
            logError('Time settings save', error);
        }
    }

    async handleColorSettingsChange(themeSettings) {
        try {
            const { colorTheme: themeId, isDark, useGoogleCalendarColors, ...colorValues } = themeSettings;
            const theme = getThemeById(themeId);
            const { cssVars } = resolveThemeColors(theme);

            // Persist: theme ID + the 7 resolved colour values + darkMode flag + calendar colors toggle
            const currentSettings = await loadSettings();
            const updatedSettings = {
                ...currentSettings,
                ...colorValues,
                colorTheme: themeId,
                darkMode: isDark,
                useGoogleCalendarColors: useGoogleCalendarColors !== undefined ? useGoogleCalendarColors : currentSettings.useGoogleCalendarColors
            };
            await saveSettings(updatedSettings);

            // Apply all CSS variables immediately on the options page
            for (const [varName, value] of Object.entries(cssVars)) {
                document.documentElement.style.setProperty(varName, value);
            }

            // Apply dark mode attribute
            if (isDark) {
                document.documentElement.setAttribute('data-theme', 'dark');
            } else {
                document.documentElement.removeAttribute('data-theme');
            }

            // Reload the side panel
            this._reloadSidePanel();
        } catch (error) {
            logError('Color theme save', error);
        }
    }

    async handleLanguageSettingsChange(languageSettings) {
        try {
            // Save the language settings (using the same keys as the existing localize.js)
            await StorageHelper.set({ language: languageSettings.language });


            // Reload the side panel
            this._reloadSidePanel();
        } catch (error) {
            logError('Language settings save', error);
        }
    }

    async handleCalendarSelectionChange(selectedCalendarIds) {
        try {
            // Reload the side panel to reflect calendar changes
            this._reloadSidePanel();
        } catch (error) {
            logError('Calendar selection change', error);
        }
    }

    async handleReminderSettingsChange(reminderSettings) {
        try {
            // Load the existing settings and update only the reminder settings
            const currentSettings = await loadSettings();
            const updatedSettings = {
                ...currentSettings,
                googleEventReminder: reminderSettings.googleEventReminder,
                reminderMinutes: reminderSettings.reminderMinutes
            };

            await saveSettings(updatedSettings);

            // Notify background script about the change
            chrome.runtime.sendMessage({
                action: 'updateReminderSettings',
                settings: reminderSettings
            });

        } catch (error) {
            logError('Reminder settings save', error);
        }
    }

    async handleMemoSettingsChange(memoSettings) {
        try {
            const currentSettings = await loadSettings();
            const updatedSettings = {
                ...currentSettings,
                memoMarkdown: memoSettings.memoMarkdown
            };

            await saveSettings(updatedSettings);

            this._reloadSidePanel();
        } catch (error) {
            logError('Memo settings save', error);
        }
    }

    async handleResetSettings() {
        try {
            // Reset to the default settings while preserving Google auth state and calendar selections
            const currentSettings = await loadSettings();
            await saveSettings({
                ...DEFAULT_SETTINGS,
                googleIntegrated: currentSettings.googleIntegrated,
                selectedCalendars: currentSettings.selectedCalendars
            });

            // Update each component with the default settings
            this.timeSettingsCard.resetToDefaults();
            this.colorSettingsCard.resetToDefaults();
            this.languageSettingsCard.resetToDefaults();
            this.reminderSettingsCard.resetToDefaults();
            this.memoSettingsCard.resetToDefaults();

            // Reset CSS variables via theme system
            const defaultTheme = getThemeById('default');
            const { cssVars } = resolveThemeColors(defaultTheme);
            for (const [varName, value] of Object.entries(cssVars)) {
                document.documentElement.style.setProperty(varName, value);
            }
            document.documentElement.removeAttribute('data-theme');

            // Reload the side panel
            this._reloadSidePanel();

        } catch (error) {
            logError('Settings reset', error);
            throw error;
        }
    }

    /**
     * Reload the side panel
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
     * Show the manual authentication removal notification
     * @private
     */
    _showManualRevokeNotification(revokeUrl) {
        // Remove the existing notifications
        const existingNotice = document.querySelector('.manual-revoke-notice');
        if (existingNotice) {
            existingNotice.remove();
        }

        // Create a notification message
        const notice = document.createElement('div');
        notice.className = 'alert alert-warning alert-dismissible fade show manual-revoke-notice mt-3';
        const manualRevokeTitle = window.getLocalizedMessage('manualRevokeTitle') || 'Additional steps are required for complete disconnection';
        const manualRevokeDescription = window.getLocalizedMessage('manualRevokeDescription') || 'We have removed the token from the extension, but to completely disconnect, please manually revoke permission in your Google account settings.';
        const openGoogleAccountSettings = window.getLocalizedMessage('openGoogleAccountSettings') || 'Open Google Account Settings';
        notice.innerHTML = `
            <div class="d-flex align-items-start">
                <i class="fas fa-exclamation-triangle me-2 mt-1"></i>
                <div class="flex-grow-1">
                    <strong>${manualRevokeTitle}</strong><br>
                    <small class="text-muted">
                        ${manualRevokeDescription}
                    </small>
                    <div class="mt-2">
                        <a href="" target="_blank" class="btn btn-sm btn-outline-primary revoke-link">
                            <i class="fas fa-external-link-alt me-1"></i>
                            ${openGoogleAccountSettings}
                        </a>
                    </div>
                </div>
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        const link = notice.querySelector('.revoke-link');
        if (link) {
            link.href = revokeUrl;
        }

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
    // The localization (execute in the language based on the settings)
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