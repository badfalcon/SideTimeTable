/**
 * AlertModal - アラート表示モーダル
 */
import { ModalComponent } from './modal-component.js';

export class AlertModal extends ModalComponent {
    constructor(options = {}) {
        super({
            id: 'alertModal',
            closeOnBackdropClick: false, // アラートは明示的に閉じる
            ...options
        });

        // 表示要素
        this.messageElement = null;
        this.confirmButton = null;

        // コールバック
        this.onConfirm = options.onConfirm || null;

        // アラートタイプ（info, warning, error, success）
        this.alertType = 'info';
    }

    createContent() {
        const content = document.createElement('div');

        // メッセージ要素
        this.messageElement = document.createElement('p');
        this.messageElement.id = 'alertMessage';
        content.appendChild(this.messageElement);

        // 確認ボタン
        this.confirmButton = document.createElement('button');
        this.confirmButton.id = 'closeAlertButton';
        this.confirmButton.className = 'btn btn-primary';
        this.confirmButton.textContent = '閉じる';
        content.appendChild(this.confirmButton);

        // イベントリスナーを設定
        this._setupAlertEventListeners();

        return content;
    }

    /**
     * アラート用イベントリスナーを設定
     * @private
     */
    _setupAlertEventListeners() {
        // 確認ボタン
        this.addEventListener(this.confirmButton, 'click', () => {
            this._handleConfirm();
        });

        // Enterキーで確認
        this.addEventListener(document, 'keydown', (e) => {
            if (e.key === 'Enter' && this.isVisible()) {
                this._handleConfirm();
            }
        });
    }

    /**
     * 確認処理
     * @private
     */
    _handleConfirm() {
        if (this.onConfirm) {
            this.onConfirm();
        }
        this.hide();
    }

    /**
     * 情報アラートを表示
     * @param {string} message メッセージ
     * @param {Function} onConfirm 確認時のコールバック
     */
    showInfo(message, onConfirm = null) {
        this._showAlert(message, 'info', onConfirm);
    }

    /**
     * 警告アラートを表示
     * @param {string} message メッセージ
     * @param {Function} onConfirm 確認時のコールバック
     */
    showWarning(message, onConfirm = null) {
        this._showAlert(message, 'warning', onConfirm);
    }

    /**
     * エラーアラートを表示
     * @param {string} message メッセージ
     * @param {Function} onConfirm 確認時のコールバック
     */
    showError(message, onConfirm = null) {
        this._showAlert(message, 'error', onConfirm);
    }

    /**
     * 成功アラートを表示
     * @param {string} message メッセージ
     * @param {Function} onConfirm 確認時のコールバック
     */
    showSuccess(message, onConfirm = null) {
        this._showAlert(message, 'success', onConfirm);
    }

    /**
     * アラートを表示
     * @private
     */
    _showAlert(message, type, onConfirm) {
        this.alertType = type;
        this.onConfirm = onConfirm;

        // メッセージを設定
        this.messageElement.textContent = message;

        // アラートタイプに応じてスタイルを調整
        this._updateAlertStyle();

        this.show();
    }

    /**
     * アラートタイプに応じてスタイルを更新
     * @private
     */
    _updateAlertStyle() {
        // ボタンのクラスを更新
        this.confirmButton.className = this._getButtonClass();

        // モーダルコンテンツにアラートタイプクラスを追加
        if (this.modalContent) {
            // 既存のアラートタイプクラスを削除
            this.modalContent.classList.remove('alert-info', 'alert-warning', 'alert-error', 'alert-success');

            // 新しいアラートタイプクラスを追加
            this.modalContent.classList.add(`alert-${this.alertType}`);
        }

        // アイコンを追加（存在しない場合）
        this._updateAlertIcon();
    }

    /**
     * アラートタイプに応じたボタンクラスを取得
     * @private
     */
    _getButtonClass() {
        const baseClass = 'btn';

        switch (this.alertType) {
            case 'error':
                return `${baseClass} btn-danger`;
            case 'warning':
                return `${baseClass} btn-warning`;
            case 'success':
                return `${baseClass} btn-success`;
            case 'info':
            default:
                return `${baseClass} btn-primary`;
        }
    }

    /**
     * アラートアイコンを更新
     * @private
     */
    _updateAlertIcon() {
        // 既存のアイコンを削除
        const existingIcon = this.messageElement?.previousElementSibling?.querySelector('i');
        if (existingIcon) {
            existingIcon.parentElement.remove();
        }

        // アイコンコンテナを作成
        const iconContainer = document.createElement('div');
        iconContainer.className = 'alert-icon-container mb-2 text-center';

        const icon = document.createElement('i');

        switch (this.alertType) {
            case 'error':
                icon.className = 'fas fa-exclamation-circle text-danger';
                break;
            case 'warning':
                icon.className = 'fas fa-exclamation-triangle text-warning';
                break;
            case 'success':
                icon.className = 'fas fa-check-circle text-success';
                break;
            case 'info':
            default:
                icon.className = 'fas fa-info-circle text-primary';
                break;
        }

        icon.style.fontSize = '2em';
        iconContainer.appendChild(icon);

        // メッセージの前に挿入
        this.messageElement.parentNode.insertBefore(iconContainer, this.messageElement);
    }

    /**
     * 確認ボタンのテキストを設定
     * @param {string} text ボタンテキスト
     */
    setConfirmButtonText(text) {
        if (this.confirmButton) {
            this.confirmButton.textContent = text;
        }
    }

    /**
     * 確認ボタンにローカライズキーを設定
     * @param {string} key ローカライズキー
     */
    setConfirmButtonLocalize(key) {
        if (this.confirmButton) {
            this.confirmButton.setAttribute('data-localize', key);
        }
    }

    /**
     * モーダルを閉じる際のクリーンアップ
     */
    hide() {
        super.hide();
        this.onConfirm = null;
        this.alertType = 'info';

        // アイコンを削除
        const iconContainer = this.modalContent?.querySelector('.alert-icon-container');
        if (iconContainer) {
            iconContainer.remove();
        }

        // アラートタイプクラスを削除
        if (this.modalContent) {
            this.modalContent.classList.remove('alert-info', 'alert-warning', 'alert-error', 'alert-success');
        }
    }
}