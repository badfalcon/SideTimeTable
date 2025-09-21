/**
 * GoogleIntegrationCard - Google連携設定カードコンポーネント
 */
import { CardComponent } from '../base/card-component.js';

export class GoogleIntegrationCard extends CardComponent {
    constructor(onIntegrationChange) {
        super({
            title: 'Google カレンダー連携',
            titleLocalize: '__MSG_integration__',
            subtitle: 'Google カレンダーと連携して予定を表示します。',
            subtitleLocalize: '__MSG_googleIntegration__',
            icon: 'fab fa-google',
            iconColor: 'text-primary'
        });

        this.onIntegrationChange = onIntegrationChange;
        this.isIntegrated = false;
        this.integrationButton = null;
        this.statusElement = null;
    }

    createElement() {
        const card = super.createElement();

        // Google連携ボタンとステータスの作成
        const controlsDiv = document.createElement('div');
        controlsDiv.className = 'd-flex align-items-center';

        // Google連携ボタン
        this.integrationButton = this._createGoogleButton();
        controlsDiv.appendChild(this.integrationButton);

        // ステータス表示
        this.statusElement = document.createElement('span');
        this.statusElement.id = 'google-integration-status';
        this.statusElement.className = 'ms-2';
        this.statusElement.setAttribute('data-localize', '__MSG_notIntegrated__');
        this.statusElement.textContent = '未連携';
        controlsDiv.appendChild(this.statusElement);

        this.addContent(controlsDiv);
        this._setupEventListeners();

        return card;
    }

    /**
     * Google連携ボタンを作成
     * @private
     * @returns {HTMLElement} Googleボタン要素
     */
    _createGoogleButton() {
        const button = document.createElement('button');
        button.className = 'gsi-material-button';
        button.id = 'google-integration-button';

        const state = document.createElement('div');
        state.className = 'gsi-material-button-state';

        const wrapper = document.createElement('div');
        wrapper.className = 'gsi-material-button-content-wrapper';

        // Googleアイコン
        const iconDiv = document.createElement('div');
        iconDiv.className = 'gsi-material-button-icon';
        iconDiv.innerHTML = `
            <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"
                 xmlns:xlink="http://www.w3.org/1999/xlink" style="display: block;">
                <path fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                <path fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                <path fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                <path fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                <path fill="none" d="M0 0h48v48H0z"></path>
            </svg>
        `;

        // ボタンテキスト
        const textSpan = document.createElement('span');
        textSpan.className = 'gsi-material-button-contents';
        textSpan.textContent = 'Sign in with Google';

        // 隠しテキスト
        const hiddenSpan = document.createElement('span');
        hiddenSpan.style.display = 'none';
        hiddenSpan.textContent = 'Sign in with Google';

        wrapper.appendChild(iconDiv);
        wrapper.appendChild(textSpan);
        wrapper.appendChild(hiddenSpan);

        button.appendChild(state);
        button.appendChild(wrapper);

        return button;
    }

    /**
     * イベントリスナーを設定
     * @private
     */
    _setupEventListeners() {
        if (this.integrationButton && this.onIntegrationChange) {
            this.integrationButton.addEventListener('click', () => {
                this.onIntegrationChange(!this.isIntegrated);
            });
        }
    }

    /**
     * 連携状態を更新
     * @param {boolean} integrated 連携状態
     * @param {string} statusText ステータステキスト（オプション）
     */
    updateIntegrationStatus(integrated, statusText = null) {
        this.isIntegrated = integrated;

        if (this.statusElement) {
            if (statusText) {
                this.statusElement.textContent = statusText;
                this.statusElement.removeAttribute('data-localize');
            } else if (integrated) {
                this.statusElement.setAttribute('data-localize', '__MSG_integrated__');
                this.statusElement.textContent = '連携済み';
            } else {
                this.statusElement.setAttribute('data-localize', '__MSG_notIntegrated__');
                this.statusElement.textContent = '未連携';
            }
        }

        // ボタンテキストの更新
        if (this.integrationButton) {
            const textSpan = this.integrationButton.querySelector('.gsi-material-button-contents');
            if (textSpan) {
                textSpan.textContent = integrated ? 'Disconnect Google' : 'Sign in with Google';
            }
        }
    }

    /**
     * ボタンの有効/無効を切り替え
     * @param {boolean} enabled ボタンを有効にするかどうか
     */
    setButtonEnabled(enabled) {
        if (this.integrationButton) {
            this.integrationButton.disabled = !enabled;
            this.integrationButton.style.opacity = enabled ? '1' : '0.6';
        }
    }

    /**
     * 連携状態を取得
     * @returns {boolean} 現在の連携状態
     */
    getIntegrationStatus() {
        return this.isIntegrated;
    }
}