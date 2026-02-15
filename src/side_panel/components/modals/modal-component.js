/**
 * ModalComponent - Base modal component
 *
 * Provides shared modal functionality including show/hide, backdrop click,
 * escape key handling, focus management, localization, and error display.
 */
import { Component } from '../base/component.js';

export class ModalComponent extends Component {
    constructor(options = {}) {
        super({
            className: 'modal',
            hidden: true,
            ...options
        });

        this.modalContent = null;
        this.closeButton = null;

        this.onClose = options.onClose || null;
        this.onShow = options.onShow || null;

        this.closeOnBackdropClick = options.closeOnBackdropClick !== false;
        this.closeOnEscape = options.closeOnEscape !== false;
    }

    createElement() {
        const modal = super.createElement();
        modal.setAttribute('hidden', '');

        if (modal.children.length > 0) {
            return modal;
        }

        this.modalContent = document.createElement('div');
        this.modalContent.className = 'modal-content';

        this.closeButton = document.createElement('span');
        this.closeButton.className = 'close';
        this.closeButton.innerHTML = '&times;';

        this.modalContent.appendChild(this.closeButton);

        const customContent = this.createContent();
        if (customContent) {
            this.modalContent.appendChild(customContent);
        }

        modal.appendChild(this.modalContent);

        this._setupEventListeners();

        return modal;
    }

    /**
     * Create custom content (override in subclasses)
     * @returns {HTMLElement|null}
     */
    createContent() {
        return null;
    }

    /**
     * Setup event listeners
     * @private
     */
    _setupEventListeners() {
        this.addEventListener(this.closeButton, 'click', () => {
            this.hide();
        });

        if (this.closeOnBackdropClick) {
            this.addEventListener(this.element, 'click', (e) => {
                if (e.target === this.element) {
                    this.hide();
                }
            });
        }

        if (this.closeOnEscape) {
            this.addEventListener(document, 'keydown', (e) => {
                if (e.key === 'Escape' && this.isVisible()) {
                    this.hide();
                }
            });
        }
    }

    /**
     * Show modal
     */
    show() {
        if (this.element) {
            this.element.removeAttribute('hidden');
            this.element.style.display = 'block';

            if (this.onShow) {
                this.onShow();
            }

            this._focusFirstInput();
        }
    }

    /**
     * Hide modal
     */
    hide() {
        if (this.element) {
            this.element.setAttribute('hidden', '');
            this.element.style.display = 'none';

            if (this.onClose) {
                this.onClose();
            }
        }
    }

    /**
     * Check if modal is visible
     * @returns {boolean}
     */
    isVisible() {
        return this.element && !this.element.hasAttribute('hidden');
    }

    /**
     * Focus first input element
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
     * Set modal title
     * @param {string} title
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
     * Set localize attribute for modal content
     * @param {string} key
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

    /**
     * Apply localization to modal elements.
     * Shared implementation - subclasses no longer need to duplicate this.
     * @protected
     */
    async _localizeModal() {
        if (window.localizeWithLanguage && this.element) {
            const userLanguageSetting = await window.getCurrentLanguageSetting?.() || 'auto';
            const targetLanguage = window.resolveLanguageCode?.(userLanguageSetting) || 'en';
            await window.localizeWithLanguage(targetLanguage);
        } else if (this.element) {
            const elementsToLocalize = this.element.querySelectorAll('[data-localize]');
            elementsToLocalize.forEach(element => {
                const key = element.getAttribute('data-localize');
                if (key && chrome.i18n && chrome.i18n.getMessage) {
                    const message = chrome.i18n.getMessage(key.replace('__MSG_', '').replace('__', ''));
                    if (message) {
                        element.textContent = message;
                    }
                }
            });
        }
    }

    /**
     * Display an inline error message within the modal
     * @param {string} message
     * @protected
     */
    _showError(message) {
        this._clearError();

        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.style.cssText = 'color: red; font-size: 0.9em; margin-top: 5px;';
        errorDiv.textContent = message;

        this.modalContent.appendChild(errorDiv);
    }

    /**
     * Clear inline error messages within the modal
     * @protected
     */
    _clearError() {
        const errorElement = this.modalContent?.querySelector('.error-message');
        if (errorElement) {
            errorElement.remove();
        }
    }
}
