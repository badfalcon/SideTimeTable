/**
 * SideTimeTable - オプションページ管理
 * 
 * このファイルはChrome拡張機能のオプションページを管理するためのJavaScriptコードです。
 */

import './options.css';
import './google_button.css';
import { 
    DEFAULT_SETTINGS, 
    generateTimeList, 
    loadSettings, 
    saveSettings, 
    reloadSidePanel, 
    logError 
} from '../lib/utils.js';
import { localizeHtmlPage } from '../lib/localize.js';

/**
 * SettingsManager - 設定管理クラス
 */
class SettingsManager {
    constructor() {
        this.elements = {
            googleIntegrationButton: document.getElementById('google-integration-button'),
            googleIntegrationStatus: document.getElementById('google-integration-status'),
            openTimeInput: document.getElementById('open-time'),
            closeTimeInput: document.getElementById('close-time'),
            breakTimeFixedInput: document.getElementById('break-time-fixed'),
            breakTimeStartInput: document.getElementById('break-time-start'),
            breakTimeEndInput: document.getElementById('break-time-end'),
            workTimeColorInput: document.getElementById('work-time-color'),
            localEventColorInput: document.getElementById('local-event-color'),
            googleEventColorInput: document.getElementById('google-event-color'),
            saveButton: document.getElementById('saveButton'),
            timeList: document.getElementById('time-list')
        };
        
        this.settings = { ...DEFAULT_SETTINGS };
    }

    /**
     * 初期化
     */
    initialize() {
        this._setupEventListeners();
        this._generateTimeList();
        this._loadSettings();
    }

    /**
     * イベントリスナーを設定
     * @private
     */
    _setupEventListeners() {
        // Googleカレンダー連携ボタン
        this.elements.googleIntegrationButton.addEventListener('click', () => this._handleGoogleIntegration());
        
        // 休憩時間設定の表示切り替え
        this.elements.breakTimeFixedInput.addEventListener('change', () => this._toggleBreakTimeFields());
        
        // 設定保存ボタン
        this.elements.saveButton.addEventListener('click', () => this._saveSettings());
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
                    googleIntegrationStatus.textContent = this.settings.googleIntegrated 
                        ? chrome.i18n.getMessage('integrated') || '連携済み'
                        : chrome.i18n.getMessage('notIntegrated') || '未連携';
                    
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
}

// DOMが読み込まれたときに実行
document.addEventListener('DOMContentLoaded', () => {
    // 多言語化
    localizeHtmlPage();
    
    // 設定マネージャーの初期化と実行
    const settingsManager = new SettingsManager();
    settingsManager.initialize();
});
