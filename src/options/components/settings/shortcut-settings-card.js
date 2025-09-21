/**
 * ShortcutSettingsCard - ショートカット設定カードコンポーネント
 */
import { CardComponent } from '../base/card-component.js';

export class ShortcutSettingsCard extends CardComponent {
    constructor() {
        super({
            title: 'キーボードショートカット',
            titleLocalize: '__MSG_shortcutSettings__',
            subtitle: 'サイドパネルを開くためのショートカットキーです。',
            subtitleLocalize: '__MSG_shortcutDescription__',
            icon: 'fas fa-keyboard',
            iconColor: 'text-secondary'
        });

        // UI要素
        this.configureButton = null;
        this.shortcutDisplay = null;

        // 現在のショートカット情報
        this.currentShortcut = null;
    }

    createElement() {
        const card = super.createElement();

        // ショートカット設定エリアを作成
        const settingsArea = this._createShortcutSettings();
        this.addContent(settingsArea);

        // 現在のショートカットを取得・表示
        this._loadCurrentShortcut();

        // イベントリスナーを設定
        this._setupEventListeners();

        return card;
    }

    /**
     * ショートカット設定エリアを作成
     * @private
     */
    _createShortcutSettings() {
        const container = document.createElement('div');
        container.className = 'mb-3';

        // ラベル
        const label = document.createElement('label');
        label.className = 'form-label';
        label.setAttribute('data-localize', '__MSG_currentShortcut__');
        label.textContent = '現在のショートカット:';

        // コントロールエリア
        const controlsDiv = document.createElement('div');
        controlsDiv.className = 'd-flex align-items-center gap-2';

        // 設定ボタン
        this.configureButton = document.createElement('button');
        this.configureButton.id = 'configure-shortcuts-btn';
        this.configureButton.className = 'btn btn-outline-secondary text-nowrap flex-shrink-0';
        this.configureButton.type = 'button';
        this.configureButton.innerHTML = `
            <i class="fas fa-external-link-alt me-1"></i>
            <span data-localize="__MSG_configureShortcuts__">設定</span>
        `;

        // ショートカット表示
        this.shortcutDisplay = document.createElement('span');
        this.shortcutDisplay.id = 'shortcut-key';
        this.shortcutDisplay.className = 'form-control-plaintext text-muted flex-grow-1';
        this.shortcutDisplay.textContent = '読み込み中...';

        controlsDiv.appendChild(this.configureButton);
        controlsDiv.appendChild(this.shortcutDisplay);

        // ヘルプテキスト
        const helpText = document.createElement('small');
        helpText.className = 'form-text text-muted';
        helpText.setAttribute('data-localize', '__MSG_shortcutHelp__');
        helpText.textContent = '設定を変更する場合は、Chrome の拡張機能管理ページ（chrome://extensions/shortcuts）で行ってください。';

        container.appendChild(label);
        container.appendChild(controlsDiv);
        container.appendChild(helpText);

        return container;
    }


    /**
     * イベントリスナーを設定
     * @private
     */
    _setupEventListeners() {
        // 設定ボタンのクリック
        this.configureButton?.addEventListener('click', () => {
            this._openShortcutsPage();
        });
    }

    /**
     * 現在のショートカットを読み込み
     * @private
     */
    async _loadCurrentShortcut() {
        try {
            if (chrome.commands && chrome.commands.getAll) {
                const commands = await new Promise((resolve) => {
                    chrome.commands.getAll(resolve);
                });

                // サイドパネル用のコマンドを検索
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
                this._updateShortcutDisplay(null, '拡張機能APIにアクセスできません');
            }
        } catch (error) {
            console.error('ショートカット取得エラー:', error);
            this._updateShortcutDisplay(null, 'エラーが発生しました');
        }
    }

    /**
     * ショートカット表示を更新
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
            this.shortcutDisplay.textContent = chrome.i18n?.getMessage('noShortcutSet') || '未設定';
            this.shortcutDisplay.className = 'form-control-plaintext text-muted flex-grow-1';
        }
    }

    /**
     * ショートカット設定ページを開く
     * @private
     */
    _openShortcutsPage() {
        const shortcutsUrl = 'chrome://extensions/shortcuts';

        try {
            // 新しいタブで開く
            if (chrome.tabs && chrome.tabs.create) {
                chrome.tabs.create({ url: shortcutsUrl });
            } else {
                // フォールバック: 直接開く
                window.open(shortcutsUrl, '_blank');
            }
        } catch (error) {
            // 最終フォールバック: クリップボードにコピー
            this._copyToClipboard(shortcutsUrl);
            this._showCopyNotification();
        }
    }

    /**
     * クリップボードにコピー
     * @private
     */
    async _copyToClipboard(text) {
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
            } else {
                // フォールバック
                const textArea = document.createElement('textarea');
                textArea.value = text;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
            }
        } catch (error) {
            console.error('クリップボードコピーエラー:', error);
        }
    }

    /**
     * コピー通知を表示
     * @private
     */
    _showCopyNotification() {
        const notification = document.createElement('div');
        notification.className = 'alert alert-info alert-dismissible fade show mt-3';
        notification.innerHTML = `
            <i class="fas fa-copy me-1"></i>
            URLをクリップボードにコピーしました。ブラウザのアドレスバーに貼り付けて移動してください。
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        this.bodyElement.appendChild(notification);

        // 5秒後に自動削除
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }

    /**
     * ショートカット情報を再読み込み
     */
    async refreshShortcuts() {
        this.shortcutDisplay.textContent = '読み込み中...';
        await this._loadCurrentShortcut();
    }

    /**
     * 現在のショートカットを取得
     */
    getCurrentShortcut() {
        return this.currentShortcut;
    }

    /**
     * ショートカットの有効性をチェック
     */
    async checkShortcutAvailability() {
        try {
            if (!chrome.commands) return false;

            const commands = await new Promise((resolve) => {
                chrome.commands.getAll(resolve);
            });

            return commands.some(cmd => cmd.shortcut);
        } catch (error) {
            console.error('ショートカット有効性チェックエラー:', error);
            return false;
        }
    }

}