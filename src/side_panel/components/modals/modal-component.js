/**
 * ModalComponent - Base modal component
 */
import { Component } from '../base/component.js';

export class ModalComponent extends Component {
    constructor(options = {}) {
        super({
            className: 'modal',
            hidden: true, // Initially hidden
            ...options
        });

        this.modalContent = null;
        this.closeButton = null;

        // Callbacks
        this.onClose = options.onClose || null;
        this.onShow = options.onShow || null;

        // Whether to close on the backdrop click
        this.closeOnBackdropClick = options.closeOnBackdropClick !== false;

        // Whether to close on the Escape key
        this.closeOnEscape = options.closeOnEscape !== false;
    }

    createElement() {
        const modal = super.createElement();
        modal.setAttribute('hidden', '');

        // Skip if the content is already created
        if (modal.children.length > 0) {
            return modal;
        }

        // Modal content
        this.modalContent = document.createElement('div');
        this.modalContent.className = 'modal-content';

        // Close button
        this.closeButton = document.createElement('span');
        this.closeButton.className = 'close';
        this.closeButton.innerHTML = '&times;';

        this.modalContent.appendChild(this.closeButton);

        // Create the custom content
        const customContent = this.createContent();
        if (customContent) {
            this.modalContent.appendChild(customContent);
        }

        modal.appendChild(this.modalContent);

        // Setup the event listeners
        this._setupEventListeners();

        return modal;
    }

    /**
     * Create custom content (override in subclasses)
     * @returns {HTMLElement|null} The content element
     */
    createContent() {
        return null;
    }

    /**
     * Setup event listeners
     * @private
     */
    _setupEventListeners() {
        // Close button
        this.addEventListener(this.closeButton, 'click', () => {
            this.hide();
        });

        // Backdrop click
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
     * Show modal
     */
    show() {
        if (this.element) {
            this.element.removeAttribute('hidden');
            this.element.style.display = 'block';

            // Execute callback
            if (this.onShow) {
                this.onShow();
            }

            // Focus management
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

            // Execute callback
            if (this.onClose) {
                this.onClose();
            }
        }
    }

    /**
     * Check if modal is visible
     * @returns {boolean} The visibility state
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
     * @param {string} title Title
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
     * @param {string} key Localization key
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