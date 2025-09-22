/**
 * Component - サイドパネル用ベースコンポーネントクラス
 */
export class Component {
    constructor(options = {}) {
        this.options = {
            id: options.id || '',
            className: options.className || '',
            hidden: options.hidden || false,
            ...options
        };

        // DOM要素
        this.element = null;

        // 初期化状態
        this.initialized = false;

        // イベントリスナーの管理
        this.eventListeners = [];
    }

    /**
     * コンポーネントの要素を作成
     * @returns {HTMLElement} 作成された要素
     */
    createElement() {
        // 既に要素が作成済みの場合は再利用
        if (this.element) {
            console.log(`コンポーネント ${this.options.id || 'unknown'} は既に作成済みです`);
            return this.element;
        }

        // 既存のDOMに同じIDの要素が存在する場合は削除
        if (this.options.id) {
            const existingElement = document.getElementById(this.options.id);
            if (existingElement) {
                console.log(`既存要素 ${this.options.id} を削除します`);
                existingElement.remove();
            }
        }

        this.element = document.createElement('div');

        if (this.options.id) {
            this.element.id = this.options.id;
        }

        if (this.options.className) {
            this.element.className = this.options.className;
        }

        if (this.options.hidden) {
            this.element.style.display = 'none';
        }

        console.log(`コンポーネント ${this.options.id || 'div'} を作成しました`);
        return this.element;
    }

    /**
     * 指定された親要素に追加
     * @param {HTMLElement} parent 親要素
     * @returns {HTMLElement} 追加された要素
     */
    appendTo(parent) {
        if (!this.element) {
            this.createElement();
        }

        if (parent && typeof parent.appendChild === 'function') {
            parent.appendChild(this.element);
        }

        return this.element;
    }

    /**
     * 指定された要素の前に挿入
     * @param {HTMLElement} sibling 挿入先の兄弟要素
     * @returns {HTMLElement} 挿入された要素
     */
    insertBefore(sibling) {
        if (!this.element) {
            this.createElement();
        }

        if (sibling && sibling.parentNode) {
            sibling.parentNode.insertBefore(this.element, sibling);
        }

        return this.element;
    }

    /**
     * イベントリスナーを追加（自動管理）
     * @param {HTMLElement|string} target 対象要素またはセレクタ
     * @param {string} event イベント名
     * @param {Function} handler ハンドラ関数
     * @param {Object} options イベントオプション
     */
    addEventListener(target, event, handler, options = {}) {
        let element;

        if (typeof target === 'string') {
            element = this.element?.querySelector(target);
        } else {
            element = target;
        }

        if (element && typeof element.addEventListener === 'function') {
            element.addEventListener(event, handler, options);

            // クリーンアップ用に記録
            this.eventListeners.push({
                element,
                event,
                handler,
                options
            });
        }
    }

    /**
     * 表示/非表示を切り替え
     * @param {boolean} visible 表示するかどうか
     */
    setVisible(visible) {
        if (this.element) {
            this.element.style.display = visible ? '' : 'none';
        }
        this.options.hidden = !visible;
    }

    /**
     * 要素を表示
     */
    show() {
        this.setVisible(true);
    }

    /**
     * 要素を非表示
     */
    hide() {
        this.setVisible(false);
    }

    /**
     * 要素を削除
     */
    remove() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }

    /**
     * リソースをクリーンアップ
     */
    destroy() {
        // イベントリスナーを削除
        this.eventListeners.forEach(({ element, event, handler, options }) => {
            if (element && typeof element.removeEventListener === 'function') {
                element.removeEventListener(event, handler, options);
            }
        });
        this.eventListeners = [];

        // DOM要素を削除
        this.remove();
        this.element = null;
        this.initialized = false;
    }

    /**
     * 要素内の文字列をローカライズ
     */
    localize() {
        if (this.element && window.localizeElementText) {
            window.localizeElementText(this.element);
        }
    }

    /**
     * CSS変数を設定
     * @param {string} name CSS変数名（--なしで指定）
     * @param {string} value 値
     */
    setCSSVariable(name, value) {
        if (this.element) {
            this.element.style.setProperty(`--${name}`, value);
        }
    }

    /**
     * CSS変数を取得
     * @param {string} name CSS変数名（--なしで指定）
     * @returns {string} 値
     */
    getCSSVariable(name) {
        if (this.element) {
            return getComputedStyle(this.element).getPropertyValue(`--${name}`);
        }
        return '';
    }
}