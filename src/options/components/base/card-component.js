/**
 * CardComponent - The settings card base class
 *
 * A card is a titled group of settings in the side panel's design language:
 * a heading (single-colour icon, title, optional description) and a body of
 * setting rows (see settings-dom.js).
 */
import { createNotice } from './settings-dom.js';

export class CardComponent {
    constructor(options = {}) {
        this.options = {
            id: options.id || '',
            title: options.title || '',
            subtitle: options.subtitle || '',
            icon: options.icon || '',
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
        const card = document.createElement('section');
        card.className = `settings-card ${this.options.classes}`.trim();
        if (this.options.id) {
            card.id = this.options.id;
        }
        if (this.options.hidden) {
            card.style.display = 'none';
        }

        if (this.options.title) {
            const head = document.createElement('div');
            head.className = 'settings-card-head';

            if (this.options.icon) {
                const iconElement = document.createElement('i');
                iconElement.className = `${this.options.icon} settings-card-icon`;
                iconElement.setAttribute('aria-hidden', 'true');
                head.appendChild(iconElement);
            }

            const heading = document.createElement('div');
            heading.className = 'settings-card-heading';

            this.titleElement = document.createElement('h2');
            this.titleElement.className = 'settings-card-title';
            this.titleElement.textContent = this.options.title;
            if (this.options.titleLocalize) {
                this.titleElement.setAttribute('data-localize', this.options.titleLocalize);
            }
            heading.appendChild(this.titleElement);

            if (this.options.subtitle) {
                this.subtitleElement = document.createElement('p');
                this.subtitleElement.className = 'settings-card-desc';
                this.subtitleElement.textContent = this.options.subtitle;
                if (this.options.subtitleLocalize) {
                    this.subtitleElement.setAttribute('data-localize', this.options.subtitleLocalize);
                }
                heading.appendChild(this.subtitleElement);
            }

            head.appendChild(heading);
            card.appendChild(head);
        }

        const cardBody = document.createElement('div');
        cardBody.className = 'settings-card-body';
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
     * Show a notice at the bottom of the card body
     * @param {string} text - Plain text (error messages included, so never HTML)
     * @param {string} type - 'info', 'success', 'warning' or 'danger'
     * @param {number} duration - Auto-dismiss delay in ms (0 = no auto-dismiss)
     */
    _showAlert(text, type = 'info', duration = 4000) {
        const tone = type === 'success' ? 'success' : type === 'danger' || type === 'warning' ? 'danger' : 'info';
        this.bodyElement.appendChild(createNotice({ content: text, tone, duration }));
    }

    /**
     * Show copy success feedback on a button
     * @param {HTMLElement} button
     */
    _showCopyNotification(button) {
        const originalHTML = button.innerHTML;
        button.innerHTML = '<i class="fas fa-check settings-copied-icon"></i>';
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