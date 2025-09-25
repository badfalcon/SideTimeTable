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

        // Create Google integration card
        this.googleIntegrationCard = new GoogleIntegrationCard(
            this.handleGoogleIntegrationChange.bind(this)
        );
        this.componentManager.register('googleIntegration', this.googleIntegrationCard);

        // Create calendar management card
        this.calendarManagementCard = new CalendarManagementCard();
        this.componentManager.register('calendarManagement', this.calendarManagementCard);

        // Create time settings card
        this.timeSettingsCard = new TimeSettingsCard(this.handleTimeSettingsChange.bind(this));
        this.componentManager.register('timeSettings', this.timeSettingsCard);

        // Create color settings card
        this.colorSettingsCard = new ColorSettingsCard(this.handleColorSettingsChange.bind(this));
        this.componentManager.register('colorSettings', this.colorSettingsCard);

        // Create language settings card
        this.languageSettingsCard = new LanguageSettingsCard(this.handleLanguageSettingsChange.bind(this));
        this.componentManager.register('languageSettings', this.languageSettingsCard);

        // Create shortcut settings card
        this.shortcutSettingsCard = new ShortcutSettingsCard();
        this.componentManager.register('shortcutSettings', this.shortcutSettingsCard);

        // Create control buttons
        this.controlButtons = new ControlButtonsComponent(
            this.handleSaveSettings.bind(this),
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
                if (typeof localizeHtmlPage === 'function') {
                    localizeHtmlPage();
                }
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
            // Save language settings (using same keys as existing localize.js)
            await new Promise((resolve) => {
                chrome.storage.sync.set({ 'language': languageSettings.language }, resolve);
            });


            // Reload side panel
            this._reloadSidePanel();
        } catch (error) {
            logError('Language settings save', error);
        }
    }

    async handleSaveSettings() {
        // Settings are automatically saved by each component,
        // so only display confirmation message here
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

        // Create notification message
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

/**
 * LegacyCalendarManager - Legacy calendar management class (scheduled for removal)
 */
class LegacyCalendarManager {
    constructor() {
        this.availableCalendars = {};
        this.selectedCalendarIds = [];
        this.hasAutoFetched = false; // Track if we've auto-fetched calendars
        
        this.elements = {
            card: document.getElementById('calendar-management-card'),
            refreshBtn: document.getElementById('refresh-calendars-btn'),
            loading: document.getElementById('calendar-loading-indicator'),
            list: document.getElementById('calendar-list'),
            noMsg: document.getElementById('no-calendars-msg'),
            searchInput: document.getElementById('calendar-search'),
            clearSearchBtn: document.getElementById('clear-search-btn')
        };
        
        this._setupEventListeners();
    }
    
    _setupEventListeners() {
        if (this.elements.refreshBtn) {
            this.elements.refreshBtn.addEventListener('click', () => this.refreshCalendars());
        }
        
        // Search functionality
        if (this.elements.searchInput) {
            this.elements.searchInput.addEventListener('input', (e) => this._handleSearch(e.target.value));
            this.elements.searchInput.addEventListener('keyup', (e) => {
                if (e.key === 'Escape') {
                    this._clearSearch();
                }
            });
        }
        
        if (this.elements.clearSearchBtn) {
            this.elements.clearSearchBtn.addEventListener('click', () => this._clearSearch());
        }
        
        // Improve performance with event delegation
        if (this.elements.list) {
            this.elements.list.addEventListener('change', (e) => {
                if (e.target.type === 'checkbox') {
                    this._handleCalendarToggle(e);
                }
            });
        }
    }
    
    async loadData() {
        try {
            // Load only selected calendar IDs
            this.selectedCalendarIds = this._validateSelectedIds(await loadSelectedCalendars());
            
            this.render();
        } catch (error) {
            logError('Calendar data load', error);
            this._showError('Failed to load calendar data');
        }
    }
    
    show() {
        if (this.elements.card) {
            this.elements.card.style.display = 'block';
            
            // Auto-fetch calendars on first show for Google-integrated accounts
            if (!this.hasAutoFetched && (!this.allCalendars || this.allCalendars.length === 0)) {
                this.hasAutoFetched = true;
                this.refreshCalendars();
            }
        }
    }
    
    hide() {
        if (this.elements.card) {
            this.elements.card.style.display = 'none';
        }
    }
    
    async refreshCalendars() {
        this._setLoading(true);
        
        try {
            const response = await new Promise((resolve) => {
                const requestId = `req-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
                chrome.runtime.sendMessage({action: 'getCalendarList', requestId}, resolve);
            });
            
            if (response.error) {
                const detail = response.errorType ? `${response.error} (${response.errorType})` : response.error;
                const rid = response.requestId ? ` [Request ID: ${response.requestId}]` : '';
                throw new Error(detail + rid);
            }
            
            if (response.calendars) {
                // Keep calendar information only in memory (do not save)
                this.allCalendars = response.calendars;
                
                // Automatically select only primary calendar (if not selected)
                if (this.selectedCalendarIds.length === 0) {
                    const primaryCalendar = response.calendars.find(cal => cal.primary);
                    if (primaryCalendar) {
                        this.selectedCalendarIds = [primaryCalendar.id];
                    }
                }
                
                // Add primary calendar if not included in selection
                const primaryCalendar = response.calendars.find(cal => cal.primary);
                if (primaryCalendar && !this.selectedCalendarIds.includes(primaryCalendar.id)) {
                    this.selectedCalendarIds.unshift(primaryCalendar.id); // Add to beginning
                }
                
                // Save only selectedCalendars
                await saveSelectedCalendars(this.selectedCalendarIds);
                this.render();
            }
        } catch (error) {
            logError('Calendar list update', error);
            this._showError(`Failed to update calendars: ${error.message || 'Unknown error'}`);
        } finally {
            this._setLoading(false);
        }
    }
    
    render() {
        if (!this.allCalendars || this.allCalendars.length === 0) {
            this._showEmptyState();
            return;
        }
        
        // Apply search filter
        const searchTerm = this.elements.searchInput ? this.elements.searchInput.value.toLowerCase().trim() : '';
        const filteredCalendars = searchTerm 
            ? this.allCalendars.filter(calendar => 
                calendar.summary.toLowerCase().includes(searchTerm))
            : this.allCalendars;
        
        // Sort calendars (primary first)
        const sortedCalendars = [...filteredCalendars].sort((a, b) => {
            // Display primary calendar first
            if (a.primary && !b.primary) return -1;
            if (!a.primary && b.primary) return 1;
            
            // Then alphabetical order by name (Japanese compatible)
            return a.summary.localeCompare(b.summary, 'ja');
        });
        
        if (sortedCalendars.length === 0 && searchTerm) {
            this._showNoSearchResults();
            return;
        }
        
        this._hideEmptyState();
        this.elements.list.innerHTML = '';
        
        sortedCalendars.forEach(calendar => {
            const isSelected = this.selectedCalendarIds.includes(calendar.id);
            const item = this._createCalendarItem(calendar, isSelected);
            this.elements.list.appendChild(item);
        });
        
        // Update clear search button visibility
        this._updateSearchUI(searchTerm);
    }
    
    _createCalendarItem(calendar, isSelected) {
        const item = document.createElement('div');
        item.className = 'list-group-item d-flex align-items-center py-2';
        item.dataset.calendarId = calendar.id; // Enable event delegation with data attribute
        
        // Checkbox
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'form-check-input me-3';
        checkbox.checked = isSelected;
        
        // Prevent deselecting primary calendar
        if (calendar.primary) {
            checkbox.disabled = true;
            checkbox.checked = true; // Force checked state
        }
        
        // Remove event listener - handled by delegation
        
        // Calendar info
        const info = document.createElement('div');
        info.className = 'flex-grow-1';
        
        const name = document.createElement('div');
        name.className = 'fw-bold';
        name.textContent = calendar.summary;
        if (calendar.primary) {
            name.classList.add('text-primary');
        }
        
        info.appendChild(name);
        
        
        // Original Google color indicator
        const googleColor = document.createElement('div');
        googleColor.className = 'me-2';
        googleColor.style.width = '12px';
        googleColor.style.height = '12px';
        googleColor.style.backgroundColor = calendar.backgroundColor || '#ccc';
        googleColor.style.borderRadius = '50%';
        googleColor.style.border = '1px solid #ddd';
        googleColor.title = 'Google Color';
        
        item.appendChild(checkbox);
        item.appendChild(info);
        item.appendChild(googleColor);
        
        return item;
    }
    
    
    // Performance-optimized event handler
    _handleCalendarToggle(event) {
        const calendarId = this._findCalendarId(event.target);
        if (calendarId) {
            this._toggleCalendarSelection(calendarId, event.target.checked);
        }
    }
    
    
    _findCalendarId(element) {
        // Search upward from element for calendar ID
        let current = element;
        while (current && current !== this.elements.list) {
            if (current.dataset?.calendarId) {
                return current.dataset.calendarId;
            }
            current = current.parentElement;
        }
        return null;
    }
    
    async _toggleCalendarSelection(calendarId, isSelected) {
        try {
            // Input validation
            if (!calendarId || typeof calendarId !== 'string') {
                throw new Error('Invalid calendar ID');
            }
            
            if (typeof isSelected !== 'boolean') {
                throw new Error('Invalid selection state');
            }
            
            // Prevent deselecting primary calendar
            const calendar = this.allCalendars?.find(cal => cal.id === calendarId);
            if (!isSelected && calendar && calendar.primary) {
                console.log('Primary calendar selection cannot be deselected');
                return; // Abort processing
            }
            
            if (isSelected && !this.selectedCalendarIds.includes(calendarId)) {
                this.selectedCalendarIds.push(calendarId);
            } else if (!isSelected) {
                this.selectedCalendarIds = this.selectedCalendarIds.filter(id => id !== calendarId);
            }
            
            await saveSelectedCalendars(this.selectedCalendarIds);
            this.render();
            this._notifyUpdate();
        } catch (error) {
            logError('Calendar selection update', error);
            this._showError(`Failed to update calendar selection: ${error.message}`);
        }
    }
    
    
    
    async _saveData() {
        await saveSelectedCalendars(this.selectedCalendarIds);
    }
    
    _setLoading(loading) {
        if (this.elements.loading) {
            this.elements.loading.style.display = loading ? 'block' : 'none';
        }
        if (this.elements.refreshBtn) {
            this.elements.refreshBtn.disabled = loading;
        }
    }
    
    _showEmptyState() {
        if (this.elements.list) this.elements.list.style.display = 'none';
        if (this.elements.noMsg) this.elements.noMsg.style.display = 'block';
    }
    
    _hideEmptyState() {
        if (this.elements.list) this.elements.list.style.display = 'block';
        if (this.elements.noMsg) this.elements.noMsg.style.display = 'none';
    }
    
    _notifyUpdate() {
        // Reload side panel to update event display
        reloadSidePanel().catch(error => logError('Side panel reload', error));
    }
    
    // Data validation method
    _validateCalendarsData(data) {
        if (!data || typeof data !== 'object') {
            logError('Calendar data validation', 'Invalid calendar data format');
            return {};
        }
        
        // Validate each calendar object
        const validatedData = {};
        for (const [id, calendar] of Object.entries(data)) {
            if (this._isValidCalendar(calendar)) {
                validatedData[id] = calendar;
            } else {
                logError('Calendar data validation', `Invalid calendar: ${id}`);
            }
        }
        
        return validatedData;
    }
    
    _validateSelectedIds(data) {
        if (!Array.isArray(data)) {
            logError('Selected calendar data validation', 'Not an array');
            return [];
        }
        
        return data.filter(id => typeof id === 'string' && id.trim() !== '');
    }
    
    
    _isValidCalendar(calendar) {
        return calendar &&
               typeof calendar === 'object' &&
               typeof calendar.id === 'string' &&
               typeof calendar.summary === 'string' &&
               calendar.id.trim() !== '' &&
               calendar.summary.trim() !== '';
    }
    
    _showError(message) {
        // Simple UI to display error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'alert alert-danger alert-dismissible fade show';
        errorDiv.innerHTML = `
            <strong>Error:</strong> ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        // Display above calendar list
        if (this.elements.list && this.elements.list.parentElement) {
            this.elements.list.parentElement.insertBefore(errorDiv, this.elements.list);
            
            // Auto-remove after 5 seconds
            setTimeout(() => {
                if (errorDiv.parentElement) {
                    errorDiv.remove();
                }
            }, 5000);
        }
    }
    
    // Search functionality methods
    _handleSearch(searchTerm) {
        this.render();
    }
    
    _clearSearch() {
        if (this.elements.searchInput) {
            this.elements.searchInput.value = '';
            this.render();
        }
    }
    
    _updateSearchUI(searchTerm) {
        if (this.elements.clearSearchBtn) {
            this.elements.clearSearchBtn.style.display = searchTerm ? 'block' : 'none';
        }
    }
    
    _showNoSearchResults() {
        if (this.elements.list) this.elements.list.style.display = 'none';
        if (this.elements.noMsg) {
            this.elements.noMsg.style.display = 'block';
            this.elements.noMsg.textContent = chrome.i18n.getMessage('noSearchResults') || 'No search results found.';
        }
    }
}

/**
 * SettingsManager - Settings management class
 */
class SettingsManager {
    constructor() {
        this.elements = {
            googleIntegrationButton: document.getElementById('google-integration-button'),
            googleIntegrationStatus: document.getElementById('google-integration-status'),
            calendarManagementCard: document.getElementById('calendar-management-card'),
            refreshCalendarsBtn: document.getElementById('refresh-calendars-btn'),
            calendarLoadingIndicator: document.getElementById('calendar-loading-indicator'),
            calendarList: document.getElementById('calendar-list'),
            noCalendarsMsg: document.getElementById('no-calendars-msg'),
            openTimeInput: document.getElementById('open-time'),
            closeTimeInput: document.getElementById('close-time'),
            breakTimeFixedInput: document.getElementById('break-time-fixed'),
            breakTimeStartInput: document.getElementById('break-time-start'),
            breakTimeEndInput: document.getElementById('break-time-end'),
            workTimeColorInput: document.getElementById('work-time-color'),
            localEventColorInput: document.getElementById('local-event-color'),
            googleEventColorInput: document.getElementById('google-event-color'),
            saveButton: document.getElementById('saveButton'),
            resetButton: document.getElementById('resetButton'),
            developerSettingsCard: document.getElementById('developer-settings-card'),
            demoModeToggle: document.getElementById('demo-mode-toggle'),
            languageSelect: document.getElementById('language-select'),
            currentLanguageDisplay: document.getElementById('current-language-display'),
            timeList: document.getElementById('time-list'),
            shortcutKeyInput: document.getElementById('shortcut-key'),
            configureShortcutsBtn: document.getElementById('configure-shortcuts-btn')
        };
        this.settings = { ...DEFAULT_SETTINGS };
        this.calendarManager = new CalendarManager();
    }

    /**
     * Initialize
     */
    initialize() {
        this._setupEventListeners();
        this._generateTimeList();
        this._checkDeveloperMode();
        this._loadCurrentLanguage();
        this._loadSettings();
        this._loadCalendarData();
        this._loadCurrentShortcuts();
    }

    /**
     * Set up event listeners
     * @private
     */
    _setupEventListeners() {
        // Google Calendar integration button
        this.elements.googleIntegrationButton.addEventListener('click', () => this._handleGoogleIntegration());
        
        // Note: Calendar refresh is handled by CalendarManager
        
        // Toggle break time settings display
        this.elements.breakTimeFixedInput.addEventListener('change', () => this._toggleBreakTimeFields());
        
        // Settings save button
        this.elements.saveButton.addEventListener('click', () => this._saveSettings());
        
        // Default settings reset button
        this.elements.resetButton.addEventListener('click', () => this._resetToDefaults());
        
        // Shortcut settings button
        this.elements.configureShortcutsBtn.addEventListener('click', () => this._openShortcutSettings());
        
        // Demo mode toggle
        this.elements.demoModeToggle.addEventListener('change', () => this._handleDemoModeToggle());
        
        // Language selection
        this.elements.languageSelect.addEventListener('change', () => this._handleLanguageChange());
    }

    /**
     * Determine display of developer mode
     * @private
     */
    _checkDeveloperMode() {
        // Show developer settings only if not installed from Chrome Web Store (development version)
        const manifest = chrome.runtime.getManifest();
        const isFromStore = manifest.update_url !== undefined;
        
        if (!isFromStore) {
            // Show developer settings in development version
            this.elements.developerSettingsCard.style.display = 'block';
        }
    }

    /**
     * Load and display current language
     * @private
     */
    _loadCurrentLanguage() {
        // Get Chrome browser language
        const browserLanguage = chrome.i18n.getUILanguage();
        let displayText = '';
        
        switch (browserLanguage.toLowerCase().split('-')[0]) {
            case 'ja':
                displayText = 'Japanese (日本語)';
                break;
            case 'en':
                displayText = 'English';
                break;
            default:
                displayText = `${browserLanguage} (${chrome.i18n.getMessage('languageDetected') || 'Detected language'})`;
                break;
        }
        
        this.elements.currentLanguageDisplay.textContent = displayText;
    }

    /**
     * Generate time selection list
     * @private
     */
    _generateTimeList() {
        generateTimeList(this.elements.timeList);
    }

    /**
     * Load settings
     * @private
     */
    _loadSettings() {
        loadSettings()
            .then(async settings => {
                this.settings = settings;
                await this._updateUI();
            })
            .catch(error => {
                logError('Settings load', error);
                alert(chrome.i18n.getMessage('errorLoadingSettings') || 'An error occurred while loading settings');
            });
    }

    /**
     * Update UI
     * @private
     */
    async _updateUI() {
        const { elements, settings } = this;
        
        // Google integration status (display in language based on settings)
        const userLanguage = await this._getCurrentLanguageCode();
        const integratedText = await this._getMessageInLanguage('integrated', userLanguage) || 'Integrated';
        const notIntegratedText = await this._getMessageInLanguage('notIntegrated', userLanguage) || 'Not integrated';
        
        elements.googleIntegrationStatus.textContent = settings.googleIntegrated 
            ? integratedText
            : notIntegratedText;
        
        // Show/hide calendar management card
        if (settings.googleIntegrated) {
            this.calendarManager.show();
        } else {
            this.calendarManager.hide();
        }
        
        // Time settings
        elements.openTimeInput.value = settings.openTime;
        elements.closeTimeInput.value = settings.closeTime;
        
        // Break time settings
        elements.breakTimeFixedInput.checked = settings.breakTimeFixed;
        elements.breakTimeStartInput.value = settings.breakTimeStart;
        elements.breakTimeEndInput.value = settings.breakTimeEnd;
        
        // Color settings
        elements.workTimeColorInput.value = settings.workTimeColor;
        elements.localEventColorInput.value = settings.localEventColor;
        elements.googleEventColorInput.value = settings.googleEventColor;
        
        // Demo mode settings
        elements.demoModeToggle.checked = isDemoMode();
        
        // Language settings
        elements.languageSelect.value = settings.language || 'auto';
        
        // Toggle enable/disable of break time fields
        this._toggleBreakTimeFields();
    }

    /**
     * Toggle enable/disable break time fields
     * @private
     */
    _toggleBreakTimeFields() {
        const isFixed = this.elements.breakTimeFixedInput.checked;
        this.elements.breakTimeStartInput.disabled = !isFixed;
        this.elements.breakTimeEndInput.disabled = !isFixed;
    }

    /**
     * Google integration processing
     * @private
     */
    _handleGoogleIntegration() {
        const { googleIntegrationButton } = this.elements;
        
        // Disable button
        googleIntegrationButton.disabled = true;
        

        // Set timeout for waiting response (15 seconds)
        let responded = false;
        const timeoutId = setTimeout(() => {
            if (!responded) {
                console.warn('Google integration response timed out');
                alert('The request to integrate with Google Calendar has timed out. Please check your network status and login state, then try again.');
                googleIntegrationButton.disabled = false;
            }
        }, 15000);
        
        // First lightly check authentication state to ensure Service Worker is awakened
        chrome.runtime.sendMessage({ action: 'checkAuth' }, (authResp) => {
            // Treat checkAuth results as reference information (continue even if failed)
            if (chrome.runtime.lastError) {
                console.warn('Authentication pre-check failed:', chrome.runtime.lastError);
            } else {
            }
            
            // Actual event retrieval (= start authorization flow)
            const requestId = `req-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
            chrome.runtime.sendMessage({ action: 'getEvents', requestId }, (response) => {
                responded = true;
                clearTimeout(timeoutId);
                
                if (chrome.runtime.lastError) {
                    logError('Google integration', chrome.runtime.lastError);
                    alert('Failed to integrate with Google Calendar: ' + chrome.runtime.lastError.message);
                    googleIntegrationButton.disabled = false;
                    return;
                }
                
                // Consider cases where response is invalid/undefined
                if (!response) {
                    logError('Google integration', 'No response');
                    alert('An unknown error occurred with Google Calendar integration (no response)');
                    googleIntegrationButton.disabled = false;
                    return;
                }
                
                // Display reason on failure
                if (response.error) {
                    const reason = response.errorType ? `${response.error} (${response.errorType})` : response.error;
                    let hint = '';
                    const msg = (response.error || '').toLowerCase();
                    if (msg.includes('auth') || msg.includes('token')) {
                        hint = '\nHint: Please check if you are logged into Chrome and if the extension is allowed to use your Google account.';
                    } else if (msg.includes('403') || msg.includes('insufficient') || msg.includes('forbidden')) {
                        hint = '\nHint: Please check if calendar permissions (read only) are granted and not blocked by organizational policy.';
                    } else if (msg.includes('failed to fetch') || msg.includes('network')) {
                        hint = '\nHint: Please check your network connection and VPN/proxy settings.';
                    }
                    const rid = response.requestId ? `\nRequest ID: ${response.requestId}` : '';
                    alert(`Failed to integrate with Google Calendar: ${reason}${hint}${rid}`);
                }
                // Update integration state
                this.settings.googleIntegrated = !response.error;
                
                // Save settings
                saveSettings({ googleIntegrated: this.settings.googleIntegrated })
                    .then(async () => {
                        
                        // Update UI
                        await this._updateUI();
                        
                        // If integration successful, get calendar list
                        if (this.settings.googleIntegrated) {
                            this.calendarManager.refreshCalendars();
                        }
                        
                        // Notify result
                        alert(this.settings.googleIntegrated
                            ? 'Successfully integrated with Google Calendar'
                            : (response.error || 'Failed to integrate with Google Calendar'));
                        
                        // Reload side panel
                        return reloadSidePanel();
                    })
                    .catch(error => {
                        logError('Google integration settings save', error);
                        alert('An error occurred while saving settings');
                    })
                    .finally(() => {
                        // Re-enable button
                        googleIntegrationButton.disabled = false;
                    });
            });
        });
    }

    /**
     * Save settings
     * @private
     */
    _saveSettings() {
        const { elements } = this;
        
        // Get setting values from form
        const settings = {
            googleIntegrated: this.settings.googleIntegrated, // Maintain existing value
            openTime: elements.openTimeInput.value,
            closeTime: elements.closeTimeInput.value,
            workTimeColor: elements.workTimeColorInput.value,
            breakTimeFixed: elements.breakTimeFixedInput.checked,
            breakTimeStart: elements.breakTimeStartInput.value,
            breakTimeEnd: elements.breakTimeEndInput.value,
            localEventColor: elements.localEventColorInput.value,
            googleEventColor: elements.googleEventColorInput.value,
            language: elements.languageSelect.value
        };
        
        // Save settings
        saveSettings(settings)
            .then(() => {
                alert(chrome.i18n.getMessage('settingsSaved') || 'Settings saved');
                
                // Update settings
                this.settings = settings;
                
                // Reload side panel (with slight delay to ensure save completion)
                setTimeout(() => {
                    reloadSidePanel()
                        .then(() => {})
                        .catch(error => logError('Side panel reload', error));
                }, 500);
            })
            .catch(error => {
                logError('Settings save', error);
                alert('An error occurred while saving settings');
            });
    }


    /**
     * Load calendar data
     * @private
     */
    _loadCalendarData() {
        this.calendarManager.loadData();
    }

    /**
     * Reset settings to default
     * @private
     */
    _resetToDefaults() {
        if (confirm(chrome.i18n.getMessage('confirmResetSettings') || 'Do you want to reset settings to default?')) {
            // Preserve Google integration status
            const defaultSettings = {
                ...DEFAULT_SETTINGS,
                googleIntegrated: this.settings.googleIntegrated
            };
            
            // Reset demo mode too
            setDemoMode(false);
            
            // Save settings
            saveSettings(defaultSettings)
                .then(async () => {
                    alert(chrome.i18n.getMessage('settingsReset') || 'Settings have been reset to default');
                    
                    // Update settings
                    this.settings = defaultSettings;
                    
                    // Update UI
                    await this._updateUI();
                    
                    // Reload side panel
                    setTimeout(() => {
                        reloadSidePanel()
                            .then(() => {})
                            .catch(error => logError('Side panel reload', error));
                    }, 500);
                })
                .catch(error => {
                    logError('Settings reset', error);
                    alert('An error occurred while resetting settings');
                });
        }
    }






    /**
     * Load current shortcut settings
     * @private
     */
    _loadCurrentShortcuts() {
        if (chrome.commands && chrome.commands.getAll) {
            chrome.commands.getAll((commands) => {
                const openCommand = commands.find(cmd => cmd.name === 'open-side-panel');
                if (openCommand && openCommand.shortcut) {
                    this.elements.shortcutKeyInput.textContent = openCommand.shortcut;
                    this.elements.shortcutKeyInput.classList.remove('text-muted');
                    this.elements.shortcutKeyInput.classList.add('fw-bold');
                } else {
                    this.elements.shortcutKeyInput.textContent = chrome.i18n.getMessage('noShortcutSet') || 'Not set';
                    this.elements.shortcutKeyInput.classList.add('text-muted');
                    this.elements.shortcutKeyInput.classList.remove('fw-bold');
                }
            });
        }
    }

    /**
     * Handle demo mode toggle
     * @private
     */
    _handleDemoModeToggle() {
        const isEnabled = this.elements.demoModeToggle.checked;
        setDemoMode(isEnabled);
        
        // Reload side panel to reflect changes
        reloadSidePanel().catch(error => logError('Side panel reload', error));
    }

    /**
     * Handle language change
     * @private
     */
    async _handleLanguageChange() {
        const selectedLanguage = this.elements.languageSelect.value;
        
        try {
            // Save settings immediately
            const currentSettings = { ...this.settings };
            currentSettings.language = selectedLanguage;
            
            await saveSettings(currentSettings);
            
            // Update settings
            this.settings = currentSettings;
            
            // Get message in new language
            const newLanguageCode = window.resolveLanguageCode ? 
                window.resolveLanguageCode(selectedLanguage) : 
                (selectedLanguage === 'auto' ? chrome.i18n.getUILanguage().startsWith('ja') ? 'ja' : 'en' : selectedLanguage);
            
            const confirmMessage = await this._getMessageInLanguage('languageChangeConfirm', newLanguageCode);
            
            // Notify user that reload is needed in new language
            if (confirm(confirmMessage)) {
                chrome.runtime.reload();
            }
        } catch (error) {
            logError('Language settings save', error);
            alert('Failed to save language settings');
        }
    }

    /**
     * Get current language code
     * @private
     */
    async _getCurrentLanguageCode() {
        try {
            const userLanguageSetting = window.getCurrentLanguageSetting ?
                await window.getCurrentLanguageSetting() :
                (await StorageHelper.get(['language'], { language: 'auto' })).language;
            
            return window.resolveLanguageCode ? 
                window.resolveLanguageCode(userLanguageSetting) :
                (userLanguageSetting === 'auto' ? 
                    (chrome.i18n.getUILanguage().startsWith('ja') ? 'ja' : 'en') : 
                    userLanguageSetting);
        } catch (error) {
            console.warn('Language code retrieval error:', error);
            return chrome.i18n.getUILanguage().startsWith('ja') ? 'ja' : 'en';
        }
    }

    /**
     * Get message in specified language
     * @private
     */
    async _getMessageInLanguage(messageKey, languageCode) {
        try {
            const messageFiles = {
                'en': '/_locales/en/messages.json',
                'ja': '/_locales/ja/messages.json'
            };
            
            const messagesUrl = chrome.runtime.getURL(messageFiles[languageCode] || messageFiles['en']);
            const response = await fetch(messagesUrl);
            const messages = await response.json();
            
            return messages[messageKey]?.message || chrome.i18n.getMessage(messageKey);
        } catch (error) {
            console.warn('Language-specific message retrieval error:', error);
            // Fallback
            return chrome.i18n.getMessage(messageKey);
        }
    }

    /**
     * Open shortcut settings screen
     * @private
     */
    _openShortcutSettings() {
        // Open Chrome's extension management page shortcut settings
        chrome.tabs.create({
            url: 'chrome://extensions/shortcuts'
        });
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
            // Execute standard localization as fallback
            if (typeof localizeHtmlPage === 'function') {
                localizeHtmlPage();
            }
        }
    } else if (typeof localizeHtmlPage === 'function') {
        localizeHtmlPage();
    }

    // Initialize new component-based options page manager
    const optionsPageManager = new OptionsPageManager();
    await optionsPageManager.initialize();
});
