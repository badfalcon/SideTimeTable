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
    logError,
    Settings
} from '../lib/utils';
import { localizeHtmlPage } from '../lib/localize';

/**
 * SettingsUIElements - 設定ページのUI要素インターフェース
 */
interface SettingsUIElements {
    googleIntegrationButton: HTMLButtonElement | null;
    googleIntegrationStatus: HTMLElement | null;
    openTimeInput: HTMLInputElement | null;
    closeTimeInput: HTMLInputElement | null;
    breakTimeFixedInput: HTMLInputElement | null;
    breakTimeStartInput: HTMLInputElement | null;
    breakTimeEndInput: HTMLInputElement | null;
    workTimeColorInput: HTMLInputElement | null;
    localEventColorInput: HTMLInputElement | null;
    googleEventColorInput: HTMLInputElement | null;
    saveButton: HTMLButtonElement | null;
    timeList: HTMLElement | null;
}

/**
 * SettingsManager - 設定管理クラス
 */
class SettingsManager {
    private elements: SettingsUIElements;
    private settings: Settings;

    constructor() {
        this.elements = {
            googleIntegrationButton: document.getElementById('google-integration-button') as HTMLButtonElement,
            googleIntegrationStatus: document.getElementById('google-integration-status'),
            openTimeInput: document.getElementById('open-time') as HTMLInputElement,
            closeTimeInput: document.getElementById('close-time') as HTMLInputElement,
            breakTimeFixedInput: document.getElementById('break-time-fixed') as HTMLInputElement,
            breakTimeStartInput: document.getElementById('break-time-start') as HTMLInputElement,
            breakTimeEndInput: document.getElementById('break-time-end') as HTMLInputElement,
            workTimeColorInput: document.getElementById('work-time-color') as HTMLInputElement,
            localEventColorInput: document.getElementById('local-event-color') as HTMLInputElement,
            googleEventColorInput: document.getElementById('google-event-color') as HTMLInputElement,
            saveButton: document.getElementById('saveButton') as HTMLButtonElement,
            timeList: document.getElementById('time-list')
        };
        
        this.settings = { ...DEFAULT_SETTINGS };
    }

    /**
     * 初期化
     */
    initialize(): void {
        this._setupEventListeners();
        this._generateTimeList();
        this._loadSettings();
    }

    /**
     * イベントリスナーを設定
     * @private
     */
    private _setupEventListeners(): void {
        // Googleカレンダー連携ボタン
        if (this.elements.googleIntegrationButton) {
            this.elements.googleIntegrationButton.addEventListener('click', () => this._handleGoogleIntegration());
        }
        
        // 休憩時間設定の表示切り替え
        if (this.elements.breakTimeFixedInput) {
            this.elements.breakTimeFixedInput.addEventListener('change', () => this._toggleBreakTimeFields());
        }
        
        // 設定保存ボタン
        if (this.elements.saveButton) {
            this.elements.saveButton.addEventListener('click', () => this._saveSettings());
        }
    }

    /**
     * 時間選択リストを生成
     * @private
     */
    private _generateTimeList(): void {
        if (this.elements.timeList) {
            generateTimeList(this.elements.timeList);
        }
    }

    /**
     * 設定を読み込む
     * @private
     */
    private _loadSettings(): void {
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
    private _updateUI(): void {
        const { elements, settings } = this;
        
        // Google連携状態
        if (elements.googleIntegrationStatus) {
            elements.googleIntegrationStatus.textContent = settings.googleIntegrated 
                ? chrome.i18n.getMessage('integrated') || '連携済み'
                : chrome.i18n.getMessage('notIntegrated') || '未連携';
        }
        
        // 時間設定
        if (elements.openTimeInput) {
            elements.openTimeInput.value = settings.openTime;
        }
        if (elements.closeTimeInput) {
            elements.closeTimeInput.value = settings.closeTime;
        }
        
        // 休憩時間設定
        if (elements.breakTimeFixedInput) {
            elements.breakTimeFixedInput.checked = settings.breakTimeFixed;
        }
        if (elements.breakTimeStartInput) {
            elements.breakTimeStartInput.value = settings.breakTimeStart;
        }
        if (elements.breakTimeEndInput) {
            elements.breakTimeEndInput.value = settings.breakTimeEnd;
        }
        
        // 色設定
        if (elements.workTimeColorInput) {
            elements.workTimeColorInput.value = settings.workTimeColor;
        }
        if (elements.localEventColorInput) {
            elements.localEventColorInput.value = settings.localEventColor;
        }
        if (elements.googleEventColorInput) {
            elements.googleEventColorInput.value = settings.googleEventColor;
        }
        
        // 休憩時間フィールドの有効/無効を切り替え
        this._toggleBreakTimeFields();
    }

    /**
     * 休憩時間フィールドの有効/無効を切り替え
     * @private
     */
    private _toggleBreakTimeFields(): void {
        const { breakTimeFixedInput, breakTimeStartInput, breakTimeEndInput } = this.elements;
        
        if (!breakTimeFixedInput || !breakTimeStartInput || !breakTimeEndInput) {
            return;
        }
        
        const isFixed = breakTimeFixedInput.checked;
        breakTimeStartInput.disabled = !isFixed;
        breakTimeEndInput.disabled = !isFixed;
    }

    /**
     * Google連携処理
     * @private
     */
    private _handleGoogleIntegration(): void {
        const { googleIntegrationButton, googleIntegrationStatus } = this.elements;
        
        if (!googleIntegrationButton || !googleIntegrationStatus) {
            return;
        }
        
        // ボタンを無効化
        googleIntegrationButton.disabled = true;
        
        console.log('Googleカレンダーとの連携を試みます');
        
        chrome.runtime.sendMessage({action: 'getEvents'}, (response: { error?: string, events?: any[] }) => {
            console.log('Googleカレンダーとの連携結果:', response);
            
            if (chrome.runtime.lastError) {
                const errorMessage = chrome.runtime.lastError.message || 'Unknown error';
                logError('Google連携', errorMessage);
                alert('Googleカレンダーとの連携に失敗しました: ' + errorMessage);
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
    private _saveSettings(): void {
        const { elements } = this;
        
        if (!elements.openTimeInput || !elements.closeTimeInput || 
            !elements.workTimeColorInput || !elements.breakTimeFixedInput || 
            !elements.breakTimeStartInput || !elements.breakTimeEndInput || 
            !elements.localEventColorInput || !elements.googleEventColorInput) {
            alert('必要な入力フィールドが見つかりません');
            return;
        }
        
        // フォームから設定値を取得
        const settings: Settings = {
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