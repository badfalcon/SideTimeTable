/**
 * DeveloperSettingsCard - 開発者設定カードコンポーネント
 */
import { CardComponent } from '../base/card-component.js';
import { isDemoMode, setDemoMode } from '../../../lib/demo-data.js';

export class DeveloperSettingsCard extends CardComponent {
    constructor(onSettingsChange) {
        super({
            id: 'developer-settings-card',
            title: '開発者設定',
            subtitle: '開発・テスト用の設定です。通常は変更する必要がありません。',
            icon: 'fas fa-code',
            iconColor: 'text-danger',
            classes: '',
            hidden: true // デフォルトで非表示
        });

        this.onSettingsChange = onSettingsChange;

        // フォーム要素
        this.demoModeToggle = null;

        // 現在の設定値
        this.settings = {
            demoMode: false
        };
    }

    createElement() {
        const card = super.createElement();

        // 開発者設定フォームを作成
        const form = this._createForm();
        this.addContent(form);

        // 現在の設定を読み込み
        this._loadCurrentSettings();

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

        // デモモード設定
        const demoModeSection = this._createDemoModeSection();
        form.appendChild(demoModeSection);

        // 追加の開発者向け情報
        const infoSection = this._createInfoSection();
        form.appendChild(infoSection);

        return form;
    }

    /**
     * デモモードセクションを作成
     * @private
     */
    _createDemoModeSection() {
        const section = document.createElement('div');
        section.className = 'form-check mb-3';

        // チェックボックス
        this.demoModeToggle = document.createElement('input');
        this.demoModeToggle.type = 'checkbox';
        this.demoModeToggle.className = 'form-check-input';
        this.demoModeToggle.id = 'demo-mode-toggle';

        // ラベル
        const label = document.createElement('label');
        label.className = 'form-check-label';
        label.htmlFor = 'demo-mode-toggle';

        const labelText = document.createElement('span');
        labelText.textContent = 'デモモード';

        const helpText = document.createElement('small');
        helpText.className = 'text-muted d-block';
        helpText.textContent = 'サンプルデータを表示します（APIへのアクセスは行いません）';

        label.appendChild(labelText);
        label.appendChild(helpText);

        section.appendChild(this.demoModeToggle);
        section.appendChild(label);

        return section;
    }

    /**
     * 情報セクションを作成
     * @private
     */
    _createInfoSection() {
        const section = document.createElement('div');
        section.className = 'mt-4 p-3 bg-light rounded';

        // タイトル
        const title = document.createElement('h6');
        title.className = 'mb-3';
        title.innerHTML = `
            <i class="fas fa-info-circle me-1"></i>
            開発者向け情報
        `;

        // 情報リスト
        const infoList = document.createElement('div');
        infoList.className = 'small';

        const infoItems = [
            {
                label: '拡張機能ID',
                value: chrome.runtime?.id || '取得できません',
                copyable: true
            },
            {
                label: 'マニフェストバージョン',
                value: chrome.runtime?.getManifest?.()?.manifest_version || '不明',
                copyable: false
            },
            {
                label: 'バージョン',
                value: chrome.runtime?.getManifest?.()?.version || '不明',
                copyable: false
            },
            {
                label: 'デモモード状態',
                value: () => this.settings.demoMode ? '有効' : '無効',
                copyable: false,
                dynamic: true
            }
        ];

        infoItems.forEach(item => {
            const row = this._createInfoRow(item);
            infoList.appendChild(row);
        });

        section.appendChild(title);
        section.appendChild(infoList);

        return section;
    }

    /**
     * 情報行を作成
     * @private
     */
    _createInfoRow(item) {
        const row = document.createElement('div');
        row.className = 'd-flex justify-content-between align-items-center py-1 border-bottom';

        // ラベル
        const label = document.createElement('span');
        label.className = 'fw-semibold';
        label.textContent = item.label + ':';

        // 値とボタンのコンテナ
        const valueContainer = document.createElement('div');
        valueContainer.className = 'd-flex align-items-center gap-2';

        // 値
        const value = document.createElement('code');
        value.className = 'small';

        if (item.dynamic) {
            value.textContent = item.value();
            // 動的値の場合は更新用の参照を保存
            if (!this.dynamicElements) this.dynamicElements = [];
            this.dynamicElements.push({ element: value, getValue: item.value });
        } else {
            value.textContent = item.value;
        }

        valueContainer.appendChild(value);

        // コピーボタン（必要な場合）
        if (item.copyable) {
            const copyBtn = document.createElement('button');
            copyBtn.type = 'button';
            copyBtn.className = 'btn btn-outline-secondary btn-sm';
            copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
            copyBtn.title = 'クリップボードにコピー';

            copyBtn.addEventListener('click', () => {
                this._copyToClipboard(item.value);
                this._showCopyNotification(copyBtn);
            });

            valueContainer.appendChild(copyBtn);
        }

        row.appendChild(label);
        row.appendChild(valueContainer);

        return row;
    }

    /**
     * 現在の設定を読み込み
     * @private
     */
    _loadCurrentSettings() {
        this.settings.demoMode = isDemoMode();
        this._updateUI();
    }

    /**
     * UIを更新
     * @private
     */
    _updateUI() {
        if (this.demoModeToggle) {
            this.demoModeToggle.checked = this.settings.demoMode;
        }

        // 動的要素を更新
        if (this.dynamicElements) {
            this.dynamicElements.forEach(({ element, getValue }) => {
                element.textContent = getValue();
            });
        }
    }

    /**
     * イベントリスナーを設定
     * @private
     */
    _setupEventListeners() {
        // デモモード切り替え
        this.demoModeToggle?.addEventListener('change', (e) => {
            this._handleDemoModeChange(e.target.checked);
        });
    }

    /**
     * デモモード変更を処理
     * @private
     */
    _handleDemoModeChange(enabled) {
        this.settings.demoMode = enabled;
        setDemoMode(enabled);

        // UIを更新
        this._updateUI();

        // 変更をコールバック
        if (this.onSettingsChange) {
            this.onSettingsChange({
                demoMode: enabled
            });
        }

        // 変更通知を表示
        this._showModeChangeNotification(enabled);
    }

    /**
     * モード変更通知を表示
     * @private
     */
    _showModeChangeNotification(enabled) {
        const notification = document.createElement('div');
        notification.className = 'alert alert-info alert-dismissible fade show mt-3';
        notification.innerHTML = `
            <i class="fas fa-${enabled ? 'flask' : 'globe'} me-1"></i>
            <strong>デモモードを${enabled ? '有効' : '無効'}にしました</strong><br>
            <small>変更を反映するには、サイドパネルを再読み込みしてください。</small>
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
    _showCopyNotification(button) {
        const originalHTML = button.innerHTML;
        button.innerHTML = '<i class="fas fa-check text-success"></i>';
        button.disabled = true;

        setTimeout(() => {
            button.innerHTML = originalHTML;
            button.disabled = false;
        }, 1000);
    }

    /**
     * 開発者設定の表示/非表示を切り替え
     */
    toggleVisibility() {
        const isHidden = this.element.style.display === 'none';
        this.setVisible(isHidden);
        return !isHidden;
    }

    /**
     * 現在の設定を取得
     */
    getSettings() {
        return {
            demoMode: this.settings.demoMode
        };
    }

    /**
     * 設定を更新
     */
    updateSettings(settings) {
        this.settings = { ...this.settings, ...settings };
        this._updateUI();
    }

    /**
     * デバッグ情報を追加
     */
    addDebugInfo() {
        const debugSection = document.createElement('div');
        debugSection.className = 'mt-3 p-2 bg-warning bg-opacity-10 border rounded';

        debugSection.innerHTML = `
            <h6 class="text-warning">
                <i class="fas fa-bug me-1"></i>
                デバッグ情報
            </h6>
            <div class="small">
                <div>ページ読み込み時刻: ${new Date().toLocaleString()}</div>
                <div>ユーザーエージェント: ${navigator.userAgent.substring(0, 50)}...</div>
                <div>ローカルストレージ利用可能: ${typeof(Storage) !== "undefined" ? 'はい' : 'いいえ'}</div>
                <div>Chrome拡張API利用可能: ${typeof chrome !== 'undefined' && chrome.runtime ? 'はい' : 'いいえ'}</div>
            </div>
        `;

        this.bodyElement.appendChild(debugSection);
    }
}