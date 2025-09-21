/**
 * LanguageSettingsCard - 言語設定カードコンポーネント
 */
import { CardComponent } from '../base/card-component.js';

export class LanguageSettingsCard extends CardComponent {
    constructor(onSettingsChange) {
        super({
            title: '言語設定',
            titleLocalize: '__MSG_languageSettings__',
            subtitle: '拡張機能の表示言語を選択できます。',
            subtitleLocalize: '__MSG_languageDescription__',
            icon: 'fas fa-language',
            iconColor: 'text-primary'
        });

        this.onSettingsChange = onSettingsChange;

        // フォーム要素
        this.languageSelect = null;
        this.currentLanguageDisplay = null;

        // 現在の設定値
        this.settings = {
            language: 'auto'
        };

        // 利用可能な言語
        this.availableLanguages = [
            { value: 'auto', key: '__MSG_languageAuto__', text: '自動（ブラウザーの言語）' },
            { value: 'en', key: '__MSG_languageEnglish__', text: 'English（英語）' },
            { value: 'ja', key: '__MSG_languageJapanese__', text: '日本語' }
        ];
    }

    createElement() {
        const card = super.createElement();

        // フォーム要素を作成
        const form = this._createForm();
        this.addContent(form);

        // 現在のブラウザー言語を表示
        this._updateCurrentLanguageDisplay();

        // イベントリスナーを設定
        this._setupEventListeners();

        return card;
    }


    /**
     * フォームを作成
     * @private
     */
    _createForm() {
        const form = document.createElement('form');

        // グリッドレイアウト
        const row = document.createElement('div');
        row.className = 'row';

        // 言語選択カラム
        const selectCol = this._createLanguageSelectColumn();
        row.appendChild(selectCol);

        // 現在の言語表示カラム
        const displayCol = this._createCurrentLanguageColumn();
        row.appendChild(displayCol);

        form.appendChild(row);

        return form;
    }

    /**
     * 言語選択カラムを作成
     * @private
     */
    _createLanguageSelectColumn() {
        const col = document.createElement('div');
        col.className = 'col-md-6 mb-3';

        // ラベル
        const label = document.createElement('label');
        label.htmlFor = 'language-settings-select';
        label.className = 'form-label fw-semibold';
        label.setAttribute('data-localize', '__MSG_selectLanguage__');
        label.textContent = '言語選択:';

        // セレクトボックス
        this.languageSelect = document.createElement('select');
        this.languageSelect.className = 'form-select';
        this.languageSelect.id = 'language-settings-select';

        // オプションを追加
        this.availableLanguages.forEach(lang => {
            const option = document.createElement('option');
            option.value = lang.value;
            option.setAttribute('data-localize', lang.key);
            option.textContent = lang.text;

            if (lang.value === this.settings.language) {
                option.selected = true;
            }

            this.languageSelect.appendChild(option);
        });

        // ヘルプテキスト
        const helpText = document.createElement('small');
        helpText.className = 'form-text text-muted mt-1';
        helpText.setAttribute('data-localize', '__MSG_languageHelp__');
        helpText.textContent = '言語を変更した場合、変更を適用するために拡張機能を再読み込みする必要があります。';

        col.appendChild(label);
        col.appendChild(this.languageSelect);
        col.appendChild(helpText);

        return col;
    }

    /**
     * 現在の言語表示カラムを作成
     * @private
     */
    _createCurrentLanguageColumn() {
        const col = document.createElement('div');
        col.className = 'col-md-6 mb-3';

        // ラベル
        const label = document.createElement('label');
        label.className = 'form-label fw-semibold';
        label.setAttribute('data-localize', '__MSG_currentLanguage__');
        label.textContent = '現在のブラウザー言語:';

        // 表示領域
        const display = document.createElement('div');
        display.className = 'p-2 bg-light rounded';

        // アイコンと表示テキスト
        const icon = document.createElement('i');
        icon.className = 'fas fa-info-circle text-info me-1';

        this.currentLanguageDisplay = document.createElement('span');
        this.currentLanguageDisplay.id = 'current-language-display';
        this.currentLanguageDisplay.className = 'text-dark';
        this.currentLanguageDisplay.textContent = '検出中...';

        display.appendChild(icon);
        display.appendChild(this.currentLanguageDisplay);

        col.appendChild(label);
        col.appendChild(display);

        return col;
    }

    /**
     * 現在のブラウザー言語表示を更新
     * @private
     */
    _updateCurrentLanguageDisplay() {
        if (this.currentLanguageDisplay) {
            const browserLang = navigator.language || navigator.userLanguage || 'unknown';
            const displayText = this._formatLanguageDisplay(browserLang);
            this.currentLanguageDisplay.textContent = displayText;
        }
    }

    /**
     * 言語表示をフォーマット
     * @private
     */
    _formatLanguageDisplay(langCode) {
        const languageNames = {
            'en': 'English',
            'en-US': 'English (United States)',
            'en-GB': 'English (United Kingdom)',
            'ja': '日本語',
            'ja-JP': '日本語 (日本)',
            'zh': '中文',
            'zh-CN': '中文 (简体)',
            'zh-TW': '中文 (繁體)',
            'ko': '한국어',
            'fr': 'Français',
            'de': 'Deutsch',
            'es': 'Español',
            'it': 'Italiano',
            'pt': 'Português',
            'ru': 'Русский'
        };

        const displayName = languageNames[langCode] || languageNames[langCode.split('-')[0]];
        return displayName ? `${displayName} (${langCode})` : langCode;
    }

    /**
     * イベントリスナーを設定
     * @private
     */
    _setupEventListeners() {
        // 言語選択の変更
        this.languageSelect?.addEventListener('change', () => {
            this._handleLanguageChange();
        });
    }

    /**
     * 言語設定変更を処理
     * @private
     */
    _handleLanguageChange() {
        const newSettings = this.getSettings();
        const previousLanguage = this.settings.language;

        this.settings = newSettings;

        // 変更をコールバック
        if (this.onSettingsChange) {
            this.onSettingsChange(newSettings);
        }

        // 言語が変更された場合は再読み込みの確認を表示
        if (newSettings.language !== previousLanguage) {
            this._showReloadConfirmation();
        }
    }

    /**
     * 再読み込み確認を表示
     * @private
     */
    _showReloadConfirmation() {
        // 既存の確認メッセージを削除
        const existingNotice = this.element.querySelector('.language-reload-notice');
        if (existingNotice) {
            existingNotice.remove();
        }

        // 確認メッセージを作成
        const notice = document.createElement('div');
        notice.className = 'alert alert-info alert-dismissible fade show language-reload-notice mt-3';
        notice.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="fas fa-sync-alt me-2"></i>
                <div class="flex-grow-1">
                    <strong>言語設定を変更しました</strong><br>
                    <small>変更を反映するにはページの再読み込みが必要です。</small>
                </div>
                <button type="button" class="btn btn-sm btn-primary ms-2" id="reload-page-btn">
                    ページ再読み込み
                </button>
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;

        this.bodyElement.appendChild(notice);

        // 再読み込みボタンのイベント
        const reloadBtn = notice.querySelector('#reload-page-btn');
        if (reloadBtn) {
            reloadBtn.addEventListener('click', () => {
                window.location.reload();
            });
        }
    }

    /**
     * 拡張機能を再読み込み
     * @private
     */
    _reloadExtension() {
        if (chrome.runtime && chrome.runtime.reload) {
            chrome.runtime.reload();
        } else {
            // フォールバック: ページを再読み込み
            window.location.reload();
        }
    }


    /**
     * 現在の設定を取得
     */
    getSettings() {
        return {
            language: this.languageSelect?.value || this.settings.language
        };
    }

    /**
     * 設定を更新
     */
    updateSettings(settings) {
        this.settings = { ...this.settings, ...settings };

        if (this.languageSelect) {
            this.languageSelect.value = this.settings.language;
        }
    }

    /**
     * デフォルト設定にリセット
     */
    resetToDefaults() {
        const defaultSettings = {
            language: 'auto'
        };

        this.updateSettings(defaultSettings);
        this._handleLanguageChange();
    }

    /**
     * サポートされている言語一覧を取得
     */
    getSupportedLanguages() {
        return this.availableLanguages.map(lang => ({
            value: lang.value,
            text: lang.text
        }));
    }
}