/**
 * CardComponent - Bootstrap カード基底クラス
 *
 * 再利用可能なカードUIコンポーネントの基底クラス
 */
export class CardComponent {
    constructor(options = {}) {
        this.options = {
            id: options.id || '',
            title: options.title || '',
            subtitle: options.subtitle || '',
            icon: options.icon || '',
            iconColor: options.iconColor || 'text-primary',
            classes: options.classes || '',
            hidden: options.hidden || false,
            ...options
        };

        this.element = null;
        this.bodyElement = null;
        this.titleElement = null;
        this.subtitleElement = null;
    }

    /**
     * カードHTML要素を作成
     * @returns {HTMLElement} 作成されたカード要素
     */
    createElement() {
        const card = document.createElement('div');
        card.className = `card mb-4 ${this.options.classes}`;
        if (this.options.id) {
            card.id = this.options.id;
        }
        if (this.options.hidden) {
            card.style.display = 'none';
        }

        const cardBody = document.createElement('div');
        cardBody.className = 'card-body';

        // タイトル要素の作成
        if (this.options.title) {
            if (this.options.icon) {
                // アイコン付きタイトル
                const titleContainer = document.createElement('div');
                titleContainer.className = 'd-flex align-items-center mb-3';

                const iconElement = document.createElement('i');
                iconElement.className = `${this.options.icon} me-2 ${this.options.iconColor}`;
                iconElement.style.fontSize = '1.5rem';

                this.titleElement = document.createElement('h2');
                this.titleElement.className = 'card-title mb-0';
                this.titleElement.textContent = this.options.title;
                if (this.options.titleLocalize) {
                    this.titleElement.setAttribute('data-localize', this.options.titleLocalize);
                }

                titleContainer.appendChild(iconElement);
                titleContainer.appendChild(this.titleElement);
                cardBody.appendChild(titleContainer);
            } else {
                // 通常のタイトル
                this.titleElement = document.createElement('h2');
                this.titleElement.className = 'card-title';
                this.titleElement.textContent = this.options.title;
                if (this.options.titleLocalize) {
                    this.titleElement.setAttribute('data-localize', this.options.titleLocalize);
                }
                cardBody.appendChild(this.titleElement);
            }
        }

        // サブタイトル要素の作成
        if (this.options.subtitle) {
            this.subtitleElement = document.createElement('p');
            this.subtitleElement.className = 'card-text';
            this.subtitleElement.textContent = this.options.subtitle;
            if (this.options.subtitleLocalize) {
                this.subtitleElement.setAttribute('data-localize', this.options.subtitleLocalize);
            }
            cardBody.appendChild(this.subtitleElement);
        }

        card.appendChild(cardBody);

        this.element = card;
        this.bodyElement = cardBody;

        return card;
    }

    /**
     * カード本体にコンテンツを追加
     * @param {HTMLElement|string} content 追加するコンテンツ
     */
    addContent(content) {
        if (!this.bodyElement) {
            throw new Error('Card element must be created first');
        }

        if (typeof content === 'string') {
            const div = document.createElement('div');
            div.innerHTML = content;
            this.bodyElement.appendChild(div);
        } else {
            this.bodyElement.appendChild(content);
        }
    }

    /**
     * カードの表示/非表示を切り替え
     * @param {boolean} visible 表示するかどうか
     */
    setVisible(visible) {
        if (this.element) {
            this.element.style.display = visible ? '' : 'none';
        }
    }

    /**
     * カードタイトルを更新
     * @param {string} title 新しいタイトル
     */
    setTitle(title) {
        if (this.titleElement) {
            this.titleElement.textContent = title;
        }
    }

    /**
     * カードサブタイトルを更新
     * @param {string} subtitle 新しいサブタイトル
     */
    setSubtitle(subtitle) {
        if (this.subtitleElement) {
            this.subtitleElement.textContent = subtitle;
        }
    }

    /**
     * DOM要素を取得
     * @returns {HTMLElement} カード要素
     */
    getElement() {
        return this.element;
    }

    /**
     * カード本体要素を取得
     * @returns {HTMLElement} カード本体要素
     */
    getBodyElement() {
        return this.bodyElement;
    }

    /**
     * 指定したコンテナにカードを追加
     * @param {HTMLElement} container 追加先のコンテナ
     */
    appendTo(container) {
        if (!this.element) {
            this.createElement();
        }
        container.appendChild(this.element);
    }

    /**
     * カードを破棄
     */
    destroy() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
        this.element = null;
        this.bodyElement = null;
        this.titleElement = null;
        this.subtitleElement = null;
    }
}