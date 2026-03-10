/**
 * CardComponent - The Bootstrap card base class
 *
 * The base class for the reusable card UI components
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
     * Create the card HTML element
     * @returns {HTMLElement} The created card element
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

        // Create the title element
        if (this.options.title) {
            if (this.options.icon) {
                // The title with the icon
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
                // The regular title
                this.titleElement = document.createElement('h2');
                this.titleElement.className = 'card-title';
                this.titleElement.textContent = this.options.title;
                if (this.options.titleLocalize) {
                    this.titleElement.setAttribute('data-localize', this.options.titleLocalize);
                }
                cardBody.appendChild(this.titleElement);
            }
        }

        // Create the subtitle element
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
     * Add the content to the card body
     * @param {HTMLElement|string} content The content to add
     */
    addContent(content) {
        if (!this.bodyElement) {
            throw new Error('The card element must be created first');
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
     * Toggle the card visibility
     * @param {boolean} visible Whether to show the card
     */
    setVisible(visible) {
        if (this.element) {
            this.element.style.display = visible ? '' : 'none';
        }
    }

    /**
     * Update the card title
     * @param {string} title The new title
     */
    setTitle(title) {
        if (this.titleElement) {
            this.titleElement.textContent = title;
        }
    }

    /**
     * Update the card subtitle
     * @param {string} subtitle The new subtitle
     */
    setSubtitle(subtitle) {
        if (this.subtitleElement) {
            this.subtitleElement.textContent = subtitle;
        }
    }

    /**
     * Get the DOM element
     * @returns {HTMLElement} The card element
     */
    getElement() {
        return this.element;
    }

    /**
     * Get the card body element
     * @returns {HTMLElement} The card body element
     */
    getBodyElement() {
        return this.bodyElement;
    }

    /**
     * Append the card to the specified container
     * @param {HTMLElement} container The target container
     */
    appendTo(container) {
        if (!this.element) {
            this.createElement();
        }
        container.appendChild(this.element);
    }

    /**
     * Copy text to clipboard with textarea fallback
     * @param {string} text
     */
    async _copyToClipboard(text) {
        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(text);
            } else {
                const ta = document.createElement('textarea');
                ta.value = text;
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
            }
        } catch (error) {
            console.error('Clipboard copy error:', error);
        }
    }

    /**
     * Show an alert notification in the card body
     * @param {string} html - Inner HTML content
     * @param {string} type - Bootstrap alert variant (info, success, warning, danger)
     * @param {number} duration - Auto-dismiss delay in ms (0 = no auto-dismiss)
     */
    _showAlert(html, type = 'info', duration = 4000) {
        const notification = document.createElement('div');
        notification.className = `alert alert-${type} alert-dismissible fade show mt-3`;
        notification.innerHTML = `${html}<button type="button" class="btn-close" data-bs-dismiss="alert"></button>`;
        this.bodyElement.appendChild(notification);
        if (duration > 0) {
            const timer = setTimeout(() => { if (notification.parentNode) notification.remove(); }, duration);
            notification.addEventListener('closed.bs.alert', () => clearTimeout(timer), { once: true });
        }
    }

    /**
     * Show copy success feedback on a button
     * @param {HTMLElement} button
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
     * Destroy the card
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