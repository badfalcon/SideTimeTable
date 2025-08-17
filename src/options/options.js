/**
 * SideTimeTable - オプションページ管理
 * 
 * このファイルはChrome拡張機能のオプションページを管理するためのJavaScriptコードです。
 */

import { 
    DEFAULT_SETTINGS, 
    generateTimeList, 
    loadSettings, 
    saveSettings, 
    reloadSidePanel, 
    logError,
    loadSelectedCalendars,
    saveSelectedCalendars,
} from '../lib/utils.js';

/**
 * CalendarManager - カレンダー管理クラス
 */
class CalendarManager {
    constructor() {
        this.availableCalendars = {};
        this.selectedCalendarIds = [];
        
        this.elements = {
            card: document.getElementById('calendar-management-card'),
            refreshBtn: document.getElementById('refresh-calendars-btn'),
            loading: document.getElementById('calendar-loading-indicator'),
            list: document.getElementById('calendar-list'),
            noMsg: document.getElementById('no-calendars-msg')
        };
        
        this._setupEventListeners();
    }
    
    _setupEventListeners() {
        if (this.elements.refreshBtn) {
            this.elements.refreshBtn.addEventListener('click', () => this.refreshCalendars());
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
                chrome.runtime.sendMessage({action: 'getCalendarList'}, resolve);
            });
            
            if (response.error) {
                throw new Error(response.error);
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
        
        // カレンダーをソート（プライマリを最初に）
        const sortedCalendars = [...this.allCalendars].sort((a, b) => {
            // プライマリカレンダーを最初に表示
            if (a.primary && !b.primary) return -1;
            if (!a.primary && b.primary) return 1;
            
            // その後は名前でアルファベット順（日本語対応）
            return a.summary.localeCompare(b.summary, 'ja');
        });
        
        this._hideEmptyState();
        this.elements.list.innerHTML = '';
        
        sortedCalendars.forEach(calendar => {
            const isSelected = this.selectedCalendarIds.includes(calendar.id);
            const item = this._createCalendarItem(calendar, isSelected);
            this.elements.list.appendChild(item);
        });
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
            timeList: document.getElementById('time-list')
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
        this._loadSettings();
        this._loadCalendarData();
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
            .then(settings => {
                this.settings = settings;
                this._updateUI();
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
    _updateUI() {
        const { elements, settings } = this;
        
        // Google連携状態
        elements.googleIntegrationStatus.textContent = settings.googleIntegrated 
            ? chrome.i18n.getMessage('integrated') || '連携済み'
            : chrome.i18n.getMessage('notIntegrated') || '未連携';
        
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
        const { googleIntegrationButton, googleIntegrationStatus } = this.elements;
        
        // ボタンを無効化
        googleIntegrationButton.disabled = true;
        
        console.log('Googleカレンダーとの連携を試みます');
        
        chrome.runtime.sendMessage({action: 'getEvents'}, (response) => {
            console.log('Googleカレンダーとの連携結果:', response);
            
            if (chrome.runtime.lastError) {
                logError('Google連携', chrome.runtime.lastError);
                alert('Googleカレンダーとの連携に失敗しました: ' + chrome.runtime.lastError.message);
                googleIntegrationButton.disabled = false;
                return;
            }
            
            // 連携状態を更新
            this.settings.googleIntegrated = !response.error;
            
            // 設定を保存
            saveSettings({ googleIntegrated: this.settings.googleIntegrated })
                .then(() => {
                    console.log('Googleカレンダーとの連携情報を保存しました');
                    
                    // UI更新
                    this._updateUI();
                    
                    // 連携が成功した場合、カレンダー一覧を取得
                    if (this.settings.googleIntegrated) {
                        this.calendarManager.refreshCalendars();
                    }
                    
                    // 結果を通知
                    alert(this.settings.googleIntegrated 
                        ? 'Googleカレンダーとの連携に成功しました'
                        : 'Googleカレンダーとの連携に失敗しました');
                    
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
            googleEventColor: elements.googleEventColorInput.value
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
                        .then(() => console.log('サイドパネルのリロードに成功しました'))
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
            
            // 設定を保存
            saveSettings(defaultSettings)
                .then(() => {
                    alert(chrome.i18n.getMessage('settingsReset') || '設定をデフォルトに戻しました');
                    
                    // 設定を更新
                    this.settings = defaultSettings;
                    
                    // UIを更新
                    this._updateUI();
                    
                    // サイドパネルをリロード
                    setTimeout(() => {
                        reloadSidePanel()
                            .then(() => console.log('サイドパネルのリロードに成功しました'))
                            .catch(error => logError('サイドパネルリロード', error));
                    }, 500);
                })
                .catch(error => {
                    logError('設定リセット', error);
                    alert('設定のリセット中にエラーが発生しました');
                });
        }
    }






}

// DOMが読み込まれたときに実行
document.addEventListener('DOMContentLoaded', () => {
    // 多言語化 (localize.js provides this function)
    if (typeof localizeHtmlPage === 'function') {
        localizeHtmlPage();
    }
    
    // 設定マネージャーの初期化と実行
    const settingsManager = new SettingsManager();
    settingsManager.initialize();
});
