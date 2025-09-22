/**
 * SideTimeTable - オプションページ管理（コンポーネントベース）
 *
 * 新しいコンポーネントベースアーキテクチャを使用したオプションページ
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
 * OptionsPageManager - オプションページ全体管理クラス
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

        // Google連携カードを作成
        this.googleIntegrationCard = new GoogleIntegrationCard(
            this.handleGoogleIntegrationChange.bind(this)
        );
        this.componentManager.register('googleIntegration', this.googleIntegrationCard);

        // カレンダー管理カードを作成
        this.calendarManagementCard = new CalendarManagementCard();
        this.componentManager.register('calendarManagement', this.calendarManagementCard);

        // 時間設定カードを作成
        this.timeSettingsCard = new TimeSettingsCard(this.handleTimeSettingsChange.bind(this));
        this.componentManager.register('timeSettings', this.timeSettingsCard);

        // 色設定カードを作成
        this.colorSettingsCard = new ColorSettingsCard(this.handleColorSettingsChange.bind(this));
        this.componentManager.register('colorSettings', this.colorSettingsCard);

        // 言語設定カードを作成
        this.languageSettingsCard = new LanguageSettingsCard(this.handleLanguageSettingsChange.bind(this));
        this.componentManager.register('languageSettings', this.languageSettingsCard);

        // ショートカット設定カードを作成
        this.shortcutSettingsCard = new ShortcutSettingsCard();
        this.componentManager.register('shortcutSettings', this.shortcutSettingsCard);

        // コントロールボタンを作成
        this.controlButtons = new ControlButtonsComponent(
            this.handleSaveSettings.bind(this),
            this.handleResetSettings.bind(this)
        );
        this.componentManager.register('controlButtons', this.controlButtons);

        // 既存の設定を読み込んでコンポーネントに適用
        await this._loadAndApplySettings();

        // コンポーネントの初期化
        await this.componentManager.initializeAll();

        // コンポーネント生成後に再度多言語化を実行
        if (window.localizeHtmlPageWithLang) {
            try {
                await window.localizeHtmlPageWithLang();
            } catch (error) {
                console.warn('コンポーネント後の多言語化エラー:', error);
                if (typeof localizeHtmlPage === 'function') {
                    localizeHtmlPage();
                }
            }
        }

    }

    async _loadAndApplySettings() {
        try {
            // 既存の設定を読み込み
            const settings = await loadSettings();

            // 各コンポーネントに設定を適用
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

            // 言語設定を読み込み
            const languageSettings = await new Promise((resolve) => {
                chrome.storage.sync.get(['language'], (result) => {
                    resolve({ language: result.language || 'auto' });
                });
            });

            this.languageSettingsCard.updateSettings(languageSettings);

            // Google連携状態をチェック
            const response = await new Promise((resolve) => {
                chrome.runtime.sendMessage({action: 'checkGoogleAuth'}, resolve);
            });

            if (response.authenticated) {
                this.googleIntegrationCard.updateIntegrationStatus(true);
                this.calendarManagementCard.show();
            }

        } catch (error) {
            console.error('設定読み込みエラー:', error);
        }
    }

    async handleGoogleIntegrationChange(shouldIntegrate) {
        try {
            if (shouldIntegrate) {
                this.googleIntegrationCard.setButtonEnabled(false);
                this.googleIntegrationCard.updateIntegrationStatus(false, '接続中...');

                const response = await new Promise((resolve) => {
                    chrome.runtime.sendMessage({action: 'authenticateGoogle'}, resolve);
                });

                if (response.success) {
                    this.googleIntegrationCard.updateIntegrationStatus(true);
                    this.calendarManagementCard.show();
                    // Google連携を有効化
                    const settings = await loadSettings();
                    await saveSettings({ ...settings, googleIntegrated: true });
                    this._reloadSidePanel();
                } else {
                    throw new Error(response.error || '認証に失敗しました');
                }
            } else {
                // Google連携を無効化
                this.googleIntegrationCard.setButtonEnabled(false);
                this.googleIntegrationCard.updateIntegrationStatus(false, '切断中...');

                const response = await new Promise((resolve) => {
                    chrome.runtime.sendMessage({action: 'disconnectGoogle'}, resolve);
                });

                if (response.success) {
                    const settings = await loadSettings();
                    await saveSettings({ ...settings, googleIntegrated: false });
                    this.googleIntegrationCard.updateIntegrationStatus(false);
                    this.calendarManagementCard.hide();
                    this._reloadSidePanel();

                    // 手動での認証削除が必要な場合は通知を表示
                    if (response.requiresManualRevoke) {
                        this._showManualRevokeNotification(response.revokeUrl);
                    }
                } else {
                    throw new Error(response.error || '切断に失敗しました');
                }
            }
        } catch (error) {
            logError('Google連携変更', error);
            this.googleIntegrationCard.updateIntegrationStatus(false, `エラー: ${error.message}`);
        } finally {
            this.googleIntegrationCard.setButtonEnabled(true);
        }
    }

    async handleTimeSettingsChange(timeSettings) {
        try {
            // 既存の設定を読み込み、時間設定のみ更新
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

            // サイドパネルを再読み込み
            this._reloadSidePanel();
        } catch (error) {
            logError('時間設定保存', error);
        }
    }

    async handleColorSettingsChange(colorSettings) {
        try {
            // 既存の設定を読み込み、色設定のみ更新
            const currentSettings = await loadSettings();
            const updatedSettings = {
                ...currentSettings,
                workTimeColor: colorSettings.workTimeColor,
                localEventColor: colorSettings.localEventColor,
                googleEventColor: colorSettings.googleEventColor
            };

            await saveSettings(updatedSettings);

            // CSS変数を即座に更新
            document.documentElement.style.setProperty('--side-calendar-work-time-color', colorSettings.workTimeColor);
            document.documentElement.style.setProperty('--side-calendar-local-event-color', colorSettings.localEventColor);
            document.documentElement.style.setProperty('--side-calendar-google-event-color', colorSettings.googleEventColor);

            // サイドパネルを再読み込み
            this._reloadSidePanel();
        } catch (error) {
            logError('色設定保存', error);
        }
    }

    async handleLanguageSettingsChange(languageSettings) {
        try {
            // 言語設定を保存（既存のlocalize.jsと同じキーを使用）
            await new Promise((resolve) => {
                chrome.storage.sync.set({ 'language': languageSettings.language }, resolve);
            });


            // サイドパネルを再読み込み
            this._reloadSidePanel();
        } catch (error) {
            logError('言語設定保存', error);
        }
    }

    async handleSaveSettings() {
        // 設定は各コンポーネントで自動保存されているので、
        // ここでは確認メッセージのみ表示
    }

    async handleResetSettings() {
        try {
            // デフォルト設定に戻す
            await saveSettings(DEFAULT_SETTINGS);

            // 各コンポーネントをデフォルト設定で更新
            this.timeSettingsCard.resetToDefaults();
            this.colorSettingsCard.resetToDefaults();
            this.languageSettingsCard.resetToDefaults();

            // CSS変数もリセット
            document.documentElement.style.setProperty('--side-calendar-work-time-color', DEFAULT_SETTINGS.workTimeColor);
            document.documentElement.style.setProperty('--side-calendar-local-event-color', DEFAULT_SETTINGS.localEventColor);
            document.documentElement.style.setProperty('--side-calendar-google-event-color', DEFAULT_SETTINGS.googleEventColor);

            // サイドパネルを再読み込み
            this._reloadSidePanel();

        } catch (error) {
            logError('設定リセット', error);
            throw error;
        }
    }

    /**
     * サイドパネルを再読み込み
     * @private
     */
    _reloadSidePanel() {
        try {
            chrome.runtime.sendMessage({
                action: 'reloadSideTimeTable'
            });
        } catch (error) {
            console.warn('サイドパネル再読み込み通知に失敗:', error);
        }
    }

    /**
     * 手動での認証削除通知を表示
     * @private
     */
    _showManualRevokeNotification(revokeUrl) {
        // 既存の通知を削除
        const existingNotice = document.querySelector('.manual-revoke-notice');
        if (existingNotice) {
            existingNotice.remove();
        }

        // 通知メッセージを作成
        const notice = document.createElement('div');
        notice.className = 'alert alert-warning alert-dismissible fade show manual-revoke-notice mt-3';
        notice.innerHTML = `
            <div class="d-flex align-items-start">
                <i class="fas fa-exclamation-triangle me-2 mt-1"></i>
                <div class="flex-grow-1">
                    <strong>完全な切断のために追加の手順が必要です</strong><br>
                    <small class="text-muted">
                        拡張機能からトークンを削除しましたが、完全に切断するにはGoogleアカウントの設定で手動で許可を取り消してください。
                    </small>
                    <div class="mt-2">
                        <a href="${revokeUrl}" target="_blank" class="btn btn-sm btn-outline-primary">
                            <i class="fas fa-external-link-alt me-1"></i>
                            Googleアカウント設定を開く
                        </a>
                    </div>
                </div>
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;

        // 最初のカードの後に挿入
        const firstCard = document.querySelector('.card');
        if (firstCard && firstCard.parentNode) {
            firstCard.parentNode.insertBefore(notice, firstCard.nextSibling);
        } else {
            document.body.appendChild(notice);
        }

        // 30秒後に自動削除
        setTimeout(() => {
            if (notice.parentNode) {
                notice.remove();
            }
        }, 30000);
    }
}

/**
 * LegacyCalendarManager - 旧カレンダー管理クラス（削除予定）
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
        
        // イベント委譲でパフォーマンスを改善
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
            // 選択されたカレンダーIDのみをロード
            this.selectedCalendarIds = this._validateSelectedIds(await loadSelectedCalendars());
            
            this.render();
        } catch (error) {
            logError('カレンダーデータ読み込み', error);
            this._showError('カレンダーデータの読み込みに失敗しました');
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
                // メモリ上でのみカレンダー情報を保持（保存はしない）
                this.allCalendars = response.calendars;
                
                // プライマリカレンダーのみを自動選択（選択されていない場合）
                if (this.selectedCalendarIds.length === 0) {
                    const primaryCalendar = response.calendars.find(cal => cal.primary);
                    if (primaryCalendar) {
                        this.selectedCalendarIds = [primaryCalendar.id];
                    }
                }
                
                // プライマリカレンダーが選択に含まれていない場合は追加
                const primaryCalendar = response.calendars.find(cal => cal.primary);
                if (primaryCalendar && !this.selectedCalendarIds.includes(primaryCalendar.id)) {
                    this.selectedCalendarIds.unshift(primaryCalendar.id); // 先頭に追加
                }
                
                // selectedCalendarsのみを保存
                await saveSelectedCalendars(this.selectedCalendarIds);
                this.render();
            }
        } catch (error) {
            logError('カレンダー一覧更新', error);
            this._showError(`カレンダーの更新に失敗しました: ${error.message || '不明なエラー'}`);
        } finally {
            this._setLoading(false);
        }
    }
    
    render() {
        if (!this.allCalendars || this.allCalendars.length === 0) {
            this._showEmptyState();
            return;
        }
        
        // 検索フィルターを適用
        const searchTerm = this.elements.searchInput ? this.elements.searchInput.value.toLowerCase().trim() : '';
        const filteredCalendars = searchTerm 
            ? this.allCalendars.filter(calendar => 
                calendar.summary.toLowerCase().includes(searchTerm))
            : this.allCalendars;
        
        // カレンダーをソート（プライマリを最初に）
        const sortedCalendars = [...filteredCalendars].sort((a, b) => {
            // プライマリカレンダーを最初に表示
            if (a.primary && !b.primary) return -1;
            if (!a.primary && b.primary) return 1;
            
            // その後は名前でアルファベット順（日本語対応）
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
        item.dataset.calendarId = calendar.id; // データ属性でイベント委譲を可能に
        
        // Checkbox
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'form-check-input me-3';
        checkbox.checked = isSelected;
        
        // プライマリカレンダーは選択を外せないようにする
        if (calendar.primary) {
            checkbox.disabled = true;
            checkbox.checked = true; // 強制的にチェック状態にする
        }
        
        // イベントリスナーは削除 - 委譲で処理
        
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
        googleColor.title = 'Google色';
        
        item.appendChild(checkbox);
        item.appendChild(info);
        item.appendChild(googleColor);
        
        return item;
    }
    
    
    // パフォーマンス最適化されたイベントハンドラー
    _handleCalendarToggle(event) {
        const calendarId = this._findCalendarId(event.target);
        if (calendarId) {
            this._toggleCalendarSelection(calendarId, event.target.checked);
        }
    }
    
    
    _findCalendarId(element) {
        // 要素から上に向かってcalendar IDを探す
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
            // 入力検証
            if (!calendarId || typeof calendarId !== 'string') {
                throw new Error('無効なカレンダーID');
            }
            
            if (typeof isSelected !== 'boolean') {
                throw new Error('無効な選択状態');
            }
            
            // プライマリカレンダーの選択解除を防ぐ
            const calendar = this.allCalendars?.find(cal => cal.id === calendarId);
            if (!isSelected && calendar && calendar.primary) {
                console.log('プライマリカレンダーの選択は解除できません');
                return; // 処理を中断
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
            logError('カレンダー選択更新', error);
            this._showError(`カレンダー選択の更新に失敗しました: ${error.message}`);
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
        reloadSidePanel().catch(error => logError('サイドパネルリロード', error));
    }
    
    // データ検証メソッド
    _validateCalendarsData(data) {
        if (!data || typeof data !== 'object') {
            logError('カレンダーデータ検証', '無効なカレンダーデータ形式');
            return {};
        }
        
        // 各カレンダーオブジェクトを検証
        const validatedData = {};
        for (const [id, calendar] of Object.entries(data)) {
            if (this._isValidCalendar(calendar)) {
                validatedData[id] = calendar;
            } else {
                logError('カレンダーデータ検証', `無効なカレンダー: ${id}`);
            }
        }
        
        return validatedData;
    }
    
    _validateSelectedIds(data) {
        if (!Array.isArray(data)) {
            logError('選択カレンダーデータ検証', '配列ではありません');
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
        // エラーメッセージを表示する簡単なUI
        const errorDiv = document.createElement('div');
        errorDiv.className = 'alert alert-danger alert-dismissible fade show';
        errorDiv.innerHTML = `
            <strong>エラー:</strong> ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        // カレンダーリストの上に表示
        if (this.elements.list && this.elements.list.parentElement) {
            this.elements.list.parentElement.insertBefore(errorDiv, this.elements.list);
            
            // 5秒後に自動で削除
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
            this.elements.noMsg.textContent = chrome.i18n.getMessage('noSearchResults') || '検索結果が見つかりませんでした。';
        }
    }
}

/**
 * SettingsManager - 設定管理クラス
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
     * 初期化
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
     * イベントリスナーを設定
     * @private
     */
    _setupEventListeners() {
        // Googleカレンダー連携ボタン
        this.elements.googleIntegrationButton.addEventListener('click', () => this._handleGoogleIntegration());
        
        // Note: Calendar refresh is handled by CalendarManager
        
        // 休憩時間設定の表示切り替え
        this.elements.breakTimeFixedInput.addEventListener('change', () => this._toggleBreakTimeFields());
        
        // 設定保存ボタン
        this.elements.saveButton.addEventListener('click', () => this._saveSettings());
        
        // デフォルト設定リセットボタン
        this.elements.resetButton.addEventListener('click', () => this._resetToDefaults());
        
        // ショートカット設定ボタン
        this.elements.configureShortcutsBtn.addEventListener('click', () => this._openShortcutSettings());
        
        // デモモードトグル
        this.elements.demoModeToggle.addEventListener('change', () => this._handleDemoModeToggle());
        
        // 言語選択
        this.elements.languageSelect.addEventListener('change', () => this._handleLanguageChange());
    }

    /**
     * 開発者モードの表示判定
     * @private
     */
    _checkDeveloperMode() {
        // Chrome Web Storeからインストールされていない場合（開発版）のみ開発者設定を表示
        const manifest = chrome.runtime.getManifest();
        const isFromStore = manifest.update_url !== undefined;
        
        if (!isFromStore) {
            // 開発版の場合は開発者設定を表示
            this.elements.developerSettingsCard.style.display = 'block';
        }
    }

    /**
     * 現在の言語を読み込み・表示
     * @private
     */
    _loadCurrentLanguage() {
        // Chromeブラウザーの言語を取得
        const browserLanguage = chrome.i18n.getUILanguage();
        let displayText = '';
        
        switch (browserLanguage.toLowerCase().split('-')[0]) {
            case 'ja':
                displayText = '日本語 (Japanese)';
                break;
            case 'en':
                displayText = 'English';
                break;
            default:
                displayText = `${browserLanguage} (${chrome.i18n.getMessage('languageDetected') || '検出された言語'})`;
                break;
        }
        
        this.elements.currentLanguageDisplay.textContent = displayText;
    }

    /**
     * 時間選択リストを生成
     * @private
     */
    _generateTimeList() {
        generateTimeList(this.elements.timeList);
    }

    /**
     * 設定を読み込む
     * @private
     */
    _loadSettings() {
        loadSettings()
            .then(async settings => {
                this.settings = settings;
                await this._updateUI();
            })
            .catch(error => {
                logError('設定読み込み', error);
                alert(chrome.i18n.getMessage('errorLoadingSettings') || '設定の読み込み中にエラーが発生しました');
            });
    }

    /**
     * UIを更新
     * @private
     */
    async _updateUI() {
        const { elements, settings } = this;
        
        // Google連携状態（設定に基づく言語で表示）
        const userLanguage = await this._getCurrentLanguageCode();
        const integratedText = await this._getMessageInLanguage('integrated', userLanguage) || '連携済み';
        const notIntegratedText = await this._getMessageInLanguage('notIntegrated', userLanguage) || '未連携';
        
        elements.googleIntegrationStatus.textContent = settings.googleIntegrated 
            ? integratedText
            : notIntegratedText;
        
        // カレンダー管理カードの表示/非表示
        if (settings.googleIntegrated) {
            this.calendarManager.show();
        } else {
            this.calendarManager.hide();
        }
        
        // 時間設定
        elements.openTimeInput.value = settings.openTime;
        elements.closeTimeInput.value = settings.closeTime;
        
        // 休憩時間設定
        elements.breakTimeFixedInput.checked = settings.breakTimeFixed;
        elements.breakTimeStartInput.value = settings.breakTimeStart;
        elements.breakTimeEndInput.value = settings.breakTimeEnd;
        
        // 色設定
        elements.workTimeColorInput.value = settings.workTimeColor;
        elements.localEventColorInput.value = settings.localEventColor;
        elements.googleEventColorInput.value = settings.googleEventColor;
        
        // デモモード設定
        elements.demoModeToggle.checked = isDemoMode();
        
        // 言語設定
        elements.languageSelect.value = settings.language || 'auto';
        
        // 休憩時間フィールドの有効/無効を切り替え
        this._toggleBreakTimeFields();
    }

    /**
     * 休憩時間フィールドの有効/無効を切り替え
     * @private
     */
    _toggleBreakTimeFields() {
        const isFixed = this.elements.breakTimeFixedInput.checked;
        this.elements.breakTimeStartInput.disabled = !isFixed;
        this.elements.breakTimeEndInput.disabled = !isFixed;
    }

    /**
     * Google連携処理
     * @private
     */
    _handleGoogleIntegration() {
        const { googleIntegrationButton } = this.elements;
        
        // ボタンを無効化
        googleIntegrationButton.disabled = true;
        

        // 応答待ちのタイムアウトを設定（15秒）
        let responded = false;
        const timeoutId = setTimeout(() => {
            if (!responded) {
                console.warn('Google連携応答がタイムアウトしました');
                alert('Googleカレンダーとの連携要求がタイムアウトしました。ネットワーク状況やログイン状態をご確認のうえ、もう一度お試しください。');
                googleIntegrationButton.disabled = false;
            }
        }, 15000);
        
        // まずは認証状態を軽くチェックして、Service Worker を確実に起こす
        chrome.runtime.sendMessage({ action: 'checkAuth' }, (authResp) => {
            // checkAuth の結果は参考情報として扱う（失敗しても続行）
            if (chrome.runtime.lastError) {
                console.warn('認証事前チェックに失敗:', chrome.runtime.lastError);
            } else {
            }
            
            // 実際のイベント取得（= 認可フロー開始）
            const requestId = `req-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
            chrome.runtime.sendMessage({ action: 'getEvents', requestId }, (response) => {
                responded = true;
                clearTimeout(timeoutId);
                
                if (chrome.runtime.lastError) {
                    logError('Google連携', chrome.runtime.lastError);
                    alert('Googleカレンダーとの連携に失敗しました: ' + chrome.runtime.lastError.message);
                    googleIntegrationButton.disabled = false;
                    return;
                }
                
                // 応答が不正/未定義のケースも考慮
                if (!response) {
                    logError('Google連携', '応答がありません');
                    alert('Googleカレンダーとの連携で不明なエラーが発生しました（応答なし）');
                    googleIntegrationButton.disabled = false;
                    return;
                }
                
                // 失敗時は理由を表示
                if (response.error) {
                    const reason = response.errorType ? `${response.error} (${response.errorType})` : response.error;
                    let hint = '';
                    const msg = (response.error || '').toLowerCase();
                    if (msg.includes('auth') || msg.includes('token')) {
                        hint = '\nヒント: Chromeにログインしているか、拡張機能がGoogleアカウントの使用を許可しているかを確認してください。';
                    } else if (msg.includes('403') || msg.includes('insufficient') || msg.includes('forbidden')) {
                        hint = '\nヒント: カレンダーの権限（read only）が付与されているか、組織ポリシーでブロックされていないか確認してください。';
                    } else if (msg.includes('failed to fetch') || msg.includes('network')) {
                        hint = '\nヒント: ネットワーク接続やVPN/プロキシ設定をご確認ください。';
                    }
                    const rid = response.requestId ? `\nRequest ID: ${response.requestId}` : '';
                    alert(`Googleカレンダーとの連携に失敗しました: ${reason}${hint}${rid}`);
                }
                // 連携状態を更新
                this.settings.googleIntegrated = !response.error;
                
                // 設定を保存
                saveSettings({ googleIntegrated: this.settings.googleIntegrated })
                    .then(async () => {
                        
                        // UI更新
                        await this._updateUI();
                        
                        // 連携が成功した場合、カレンダー一覧を取得
                        if (this.settings.googleIntegrated) {
                            this.calendarManager.refreshCalendars();
                        }
                        
                        // 結果を通知
                        alert(this.settings.googleIntegrated 
                            ? 'Googleカレンダーとの連携に成功しました'
                            : (response.error || 'Googleカレンダーとの連携に失敗しました'));
                        
                        // サイドパネルをリロード
                        return reloadSidePanel();
                    })
                    .catch(error => {
                        logError('Google連携設定保存', error);
                        alert('設定の保存中にエラーが発生しました');
                    })
                    .finally(() => {
                        // ボタンを再度有効化
                        googleIntegrationButton.disabled = false;
                    });
            });
        });
    }

    /**
     * 設定を保存
     * @private
     */
    _saveSettings() {
        const { elements } = this;
        
        // フォームから設定値を取得
        const settings = {
            googleIntegrated: this.settings.googleIntegrated, // 既存の値を維持
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
        
        // 設定を保存
        saveSettings(settings)
            .then(() => {
                alert(chrome.i18n.getMessage('settingsSaved') || '設定を保存しました');
                
                // 設定を更新
                this.settings = settings;
                
                // サイドパネルをリロード（少し遅延を入れて確実に保存が完了するようにする）
                setTimeout(() => {
                    reloadSidePanel()
                        .then(() => {})
                        .catch(error => logError('サイドパネルリロード', error));
                }, 500);
            })
            .catch(error => {
                logError('設定保存', error);
                alert('設定の保存中にエラーが発生しました');
            });
    }


    /**
     * カレンダーデータを読み込む
     * @private
     */
    _loadCalendarData() {
        this.calendarManager.loadData();
    }

    /**
     * 設定をデフォルトに戻す
     * @private
     */
    _resetToDefaults() {
        if (confirm(chrome.i18n.getMessage('confirmResetSettings') || '設定をデフォルトに戻しますか？')) {
            // Google連携状態は保持する
            const defaultSettings = {
                ...DEFAULT_SETTINGS,
                googleIntegrated: this.settings.googleIntegrated
            };
            
            // デモモードもリセット
            setDemoMode(false);
            
            // 設定を保存
            saveSettings(defaultSettings)
                .then(async () => {
                    alert(chrome.i18n.getMessage('settingsReset') || '設定をデフォルトに戻しました');
                    
                    // 設定を更新
                    this.settings = defaultSettings;
                    
                    // UIを更新
                    await this._updateUI();
                    
                    // サイドパネルをリロード
                    setTimeout(() => {
                        reloadSidePanel()
                            .then(() => {})
                            .catch(error => logError('サイドパネルリロード', error));
                    }, 500);
                })
                .catch(error => {
                    logError('設定リセット', error);
                    alert('設定のリセット中にエラーが発生しました');
                });
        }
    }






    /**
     * 現在のショートカット設定を読み込む
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
                    this.elements.shortcutKeyInput.textContent = chrome.i18n.getMessage('noShortcutSet') || '未設定';
                    this.elements.shortcutKeyInput.classList.add('text-muted');
                    this.elements.shortcutKeyInput.classList.remove('fw-bold');
                }
            });
        }
    }

    /**
     * デモモードトグルの処理
     * @private
     */
    _handleDemoModeToggle() {
        const isEnabled = this.elements.demoModeToggle.checked;
        setDemoMode(isEnabled);
        
        // サイドパネルをリロードして変更を反映
        reloadSidePanel().catch(error => logError('サイドパネルリロード', error));
    }

    /**
     * 言語変更の処理
     * @private
     */
    async _handleLanguageChange() {
        const selectedLanguage = this.elements.languageSelect.value;
        
        try {
            // 設定を即座に保存
            const currentSettings = { ...this.settings };
            currentSettings.language = selectedLanguage;
            
            await saveSettings(currentSettings);
            
            // 設定を更新
            this.settings = currentSettings;
            
            // 新しい言語でメッセージを取得
            const newLanguageCode = window.resolveLanguageCode ? 
                window.resolveLanguageCode(selectedLanguage) : 
                (selectedLanguage === 'auto' ? chrome.i18n.getUILanguage().startsWith('ja') ? 'ja' : 'en' : selectedLanguage);
            
            const confirmMessage = await this._getMessageInLanguage('languageChangeConfirm', newLanguageCode);
            
            // ユーザーに新しい言語で再読み込みが必要であることを通知
            if (confirm(confirmMessage)) {
                chrome.runtime.reload();
            }
        } catch (error) {
            logError('言語設定保存', error);
            alert('言語設定の保存に失敗しました');
        }
    }

    /**
     * 現在の言語コードを取得
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
            console.warn('言語コード取得エラー:', error);
            return chrome.i18n.getUILanguage().startsWith('ja') ? 'ja' : 'en';
        }
    }

    /**
     * 指定された言語でメッセージを取得
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
            console.warn('言語別メッセージ取得エラー:', error);
            // フォールバック
            return chrome.i18n.getMessage(messageKey);
        }
    }

    /**
     * ショートカット設定画面を開く
     * @private
     */
    _openShortcutSettings() {
        // Chrome の拡張機能管理画面のショートカット設定ページを開く
        chrome.tabs.create({
            url: 'chrome://extensions/shortcuts'
        });
    }
}

// DOMが読み込まれたときに実行
document.addEventListener('DOMContentLoaded', async () => {
    // 多言語化（設定に基づく言語で実行）
    if (window.localizeHtmlPageWithLang) {
        try {
            await window.localizeHtmlPageWithLang();
        } catch (error) {
            console.warn('多言語化処理でエラー:', error);
            // フォールバックとして標準の多言語化を実行
            if (typeof localizeHtmlPage === 'function') {
                localizeHtmlPage();
            }
        }
    } else if (typeof localizeHtmlPage === 'function') {
        localizeHtmlPage();
    }

    // 新しいコンポーネントベースのオプションページマネージャーを初期化
    const optionsPageManager = new OptionsPageManager();
    await optionsPageManager.initialize();
});
