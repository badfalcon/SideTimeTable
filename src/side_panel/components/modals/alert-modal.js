/**
 * AlertModal - A short message the user has to acknowledge
 *
 * Laid out like the event dialogs: a compact card with the message beside a
 * tone icon (error, warning, success, info), an optional line of technical
 * detail, and a single button in the footer.
 */
import { ModalComponent } from './modal-component.js';
import { createButton, createFooterSpacer, createIcon } from './event-dialog-dom.js';

const TONE_ICONS = {
    error: 'fas fa-exclamation-circle',
    warning: 'fas fa-exclamation-triangle',
    success: 'fas fa-check-circle',
    info: 'fas fa-info-circle'
};

export class AlertModal extends ModalComponent {
    constructor(options = {}) {
        super({
            id: 'alertModal',
            closeOnBackdropClick: false, // Alerts must be closed explicitly
            ...options
        });

        // The display elements
        this.iconElement = null;
        this.messageElement = null;
        this.detailElement = null;
        this.confirmButton = null;

        // The callback
        this.onConfirm = options.onConfirm || null;

        // The alert type (info, warning, error, success)
        this.alertType = 'info';
    }

    createContent() {
        const content = document.createElement('div');
        content.className = 'alert-dialog';

        const body = document.createElement('div');
        body.className = 'alert-body';

        this.iconElement = createIcon(`${TONE_ICONS.info} alert-tone-icon`);
        body.appendChild(this.iconElement);

        const text = document.createElement('div');
        text.className = 'alert-text';

        this.messageElement = document.createElement('p');
        this.messageElement.id = 'alertMessage';
        this.messageElement.className = 'alert-message';
        text.appendChild(this.messageElement);

        // Technical detail (an API error message, …) under the plain message
        this.detailElement = document.createElement('p');
        this.detailElement.id = 'alertDetail';
        this.detailElement.className = 'alert-detail';
        this.detailElement.hidden = true;
        text.appendChild(this.detailElement);

        body.appendChild(text);
        content.appendChild(body);

        const footer = document.createElement('footer');
        footer.className = 'event-form-footer';
        footer.appendChild(createFooterSpacer());
        this.confirmButton = createButton(this, {
            id: 'closeAlertButton',
            variant: 'primary',
            msgKey: 'close',
            fallback: 'Close',
            onClick: () => this._handleConfirm()
        });
        footer.appendChild(this.confirmButton);
        content.appendChild(footer);

        // Confirm with the Enter key
        this.addEventListener(document, 'keydown', (e) => {
            if (e.key === 'Enter' && this.isVisible()) {
                e.preventDefault();
                this._handleConfirm();
            }
        });

        return content;
    }

    createElement() {
        const element = super.createElement();
        element.setAttribute('role', 'alertdialog');
        element.setAttribute('aria-modal', 'true');
        element.setAttribute('aria-labelledby', 'alertMessage');
        element.setAttribute('aria-describedby', 'alertDetail');
        return element;
    }

    /**
     * Confirmation processing
     * @private
     */
    _handleConfirm() {
        const onConfirm = this.onConfirm;
        this.hide();
        if (onConfirm) {
            onConfirm();
        }
    }

    /**
     * Display information alert
     * @param {string} message The message
     * @param {Function} onConfirm The callback on confirmation
     * @param {{detail?: string}} [options]
     */
    showInfo(message, onConfirm = null, options = {}) {
        this._showAlert(message, 'info', onConfirm, options);
    }

    /**
     * Display warning alert
     * @param {string} message The message
     * @param {Function} onConfirm The callback on confirmation
     * @param {{detail?: string}} [options]
     */
    showWarning(message, onConfirm = null, options = {}) {
        this._showAlert(message, 'warning', onConfirm, options);
    }

    /**
     * Display error alert
     * @param {string} message The message
     * @param {Function} onConfirm The callback on confirmation
     * @param {{detail?: string}} [options] - detail: technical cause, shown smaller
     */
    showError(message, onConfirm = null, options = {}) {
        this._showAlert(message, 'error', onConfirm, options);
    }

    /**
     * Display success alert
     * @param {string} message The message
     * @param {Function} onConfirm The callback on confirmation
     * @param {{detail?: string}} [options]
     */
    showSuccess(message, onConfirm = null, options = {}) {
        this._showAlert(message, 'success', onConfirm, options);
    }

    /**
     * Display alert
     * @private
     */
    _showAlert(message, type, onConfirm, { detail } = {}) {
        if (!this.element) {
            this.createElement();
        }
        this.alertType = TONE_ICONS[type] ? type : 'info';
        this.onConfirm = onConfirm;

        this.messageElement.textContent = message;
        this.detailElement.textContent = detail || '';
        this.detailElement.hidden = !detail;

        this.iconElement.className = `${TONE_ICONS[this.alertType]} alert-tone-icon is-${this.alertType}`;

        this.show();
    }

    /**
     * Focus the button: the alert has no input, and Enter/Space should close it.
     * @private
     */
    _focusFirstInput() {
        setTimeout(() => this.confirmButton?.focus(), 100);
    }

    /**
     * Set confirmation button text
     * @param {string} text Button text
     */
    setConfirmButtonText(text) {
        const label = this.confirmButton?.querySelector('span');
        if (label) {
            label.textContent = text;
        }
    }

    /**
     * Set localization key for confirmation button
     * @param {string} key Localization key
     */
    setConfirmButtonLocalize(key) {
        const label = this.confirmButton?.querySelector('span');
        if (label) {
            label.setAttribute('data-localize', key);
        }
    }

    /**
     * Cleanup when closing the modal
     */
    hide() {
        super.hide();
        this.onConfirm = null;
        this.alertType = 'info';
    }
}
