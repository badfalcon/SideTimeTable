/**
 * ModalComponent - ベースモーダルコンポーネント
 */
import { Component } from '../base/component.js';

export class ModalComponent extends Component {
    constructor(options = {}) {
        super({
            className: 'modal',
            hidden: true, // 初期状態で非表示
            ...options
        });

        this.modalContent = null;
        this.closeButton = null;

        // コールバック
        this.onClose = options.onClose || null;
        this.onShow = options.onShow || null;

        // モーダル外クリックで閉じるかどうか
        this.closeOnBackdropClick = options.closeOnBackdropClick !== false;

        // ESCキーで閉じるかどうか
        this.closeOnEscape = options.closeOnEscape !== false;
    }

    createElement() {
        const modal = super.createElement();
        modal.setAttribute('hidden', '');

        // 既に内容が作成済みの場合はスキップ
        if (modal.children.length > 0) {
            console.log(`モーダルコンポーネント ${this.options.id} の内容は既に作成済みです`);
            return modal;
        }

        // モーダルコンテンツ
        this.modalContent = document.createElement('div');
        this.modalContent.className = 'modal-content';

        // 閉じるボタン
        this.closeButton = document.createElement('span');
        this.closeButton.className = 'close';
        this.closeButton.innerHTML = '&times;';

        this.modalContent.appendChild(this.closeButton);

        // カスタムコンテンツを作成
        const customContent = this.createContent();
        if (customContent) {
            this.modalContent.appendChild(customContent);
        }

        modal.appendChild(this.modalContent);

        // イベントリスナーを設定
        this._setupEventListeners();

        return modal;
    }

    /**
     * カスタムコンテンツを作成（サブクラスでオーバーライド）
     * @returns {HTMLElement|null} コンテンツ要素
     */
    createContent() {
        return null;
    }

    /**
     * イベントリスナーを設定
     * @private
     */
    _setupEventListeners() {
        // 閉じるボタン
        this.addEventListener(this.closeButton, 'click', () => {
            this.hide();
        });

        // バックドロップクリック
        if (this.closeOnBackdropClick) {
            this.addEventListener(this.element, 'click', (e) => {
                if (e.target === this.element) {
                    this.hide();
                }
            });
        }

        // ESCキー
        if (this.closeOnEscape) {
            this.addEventListener(document, 'keydown', (e) => {
                if (e.key === 'Escape' && this.isVisible()) {
                    this.hide();
                }
            });
        }
    }

    /**
     * モーダルを表示
     */
    show() {
        if (this.element) {
            this.element.removeAttribute('hidden');
            this.element.style.display = 'block';

            // コールバック実行
            if (this.onShow) {
                this.onShow();
            }

            // フォーカス管理
            this._focusFirstInput();
        }
    }

    /**
     * モーダルを非表示
     */
    hide() {
        if (this.element) {
            this.element.setAttribute('hidden', '');
            this.element.style.display = 'none';

            // コールバック実行
            if (this.onClose) {
                this.onClose();
            }
        }
    }

    /**
     * モーダルが表示されているかチェック
     * @returns {boolean} 表示状態
     */
    isVisible() {
        return this.element && !this.element.hasAttribute('hidden');
    }

    /**
     * 最初の入力要素にフォーカス
     * @private
     */
    _focusFirstInput() {
        const firstInput = this.modalContent?.querySelector('input, textarea, select');
        if (firstInput) {
            setTimeout(() => {
                firstInput.focus();
            }, 100);
        }
    }

    /**
     * モーダルタイトルを設定
     * @param {string} title タイトル
     */
    setTitle(title) {
        let titleElement = this.modalContent?.querySelector('h2, .modal-title');
        if (!titleElement) {
            titleElement = document.createElement('h2');
            titleElement.className = 'modal-title';
            this.modalContent?.insertBefore(titleElement, this.modalContent.children[1]);
        }
        titleElement.textContent = title;
    }

    /**
     * モーダルコンテンツにローカライズ属性を設定
     * @param {string} key ローカライズキー
     */
    setTitleLocalize(key) {
        let titleElement = this.modalContent?.querySelector('h2, .modal-title');
        if (!titleElement) {
            titleElement = document.createElement('h2');
            titleElement.className = 'modal-title';
            this.modalContent?.insertBefore(titleElement, this.modalContent.children[1]);
        }
        titleElement.setAttribute('data-localize', key);
    }
}