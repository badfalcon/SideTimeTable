/**
 * AlertModal - The alert display modal
 */
import { ModalComponent } from './modal-component.js';

export class AlertModal extends ModalComponent {
    constructor(options = {}) {
        super({
            id: 'alertModal',
            closeOnBackdropClick: false, // Alerts must be closed explicitly
            ...options
        });

        // The display elements
        this.messageElement = null;
        this.confirmButton = null;

        // The callback
        this.onConfirm = options.onConfirm || null;

        // The alert type (info, warning, error, success)
        this.alertType = 'info';
    }

    createContent() {
        const content = document.createElement('div');

        // The message element
        this.messageElement = document.createElement('p');
        this.messageElement.id = 'alertMessage';
        content.appendChild(this.messageElement);

        // The confirmation button
        this.confirmButton = document.createElement('button');
        this.confirmButton.id = 'closeAlertButton';
        this.confirmButton.className = 'btn btn-primary';
        this.confirmButton.textContent = 'Close';
        content.appendChild(this.confirmButton);

        // Set up the event listeners
        this._setupAlertEventListeners();

        return content;
    }

    /**
     * Set up alert event listeners
     * @private
     */
    _setupAlertEventListeners() {
        // The confirmation button
        this.addEventListener(this.confirmButton, 'click', () => {
            this._handleConfirm();
        });

        // Confirm with the Enter key
        this.addEventListener(document, 'keydown', (e) => {
            if (e.key === 'Enter' && this.isVisible()) {
                this._handleConfirm();
            }
        });
    }

    /**
     * Confirmation processing
     * @private
     */
    _handleConfirm() {
        if (this.onConfirm) {
            this.onConfirm();
        }
        this.hide();
    }

    /**
     * Display information alert
     * @param {string} message The message
     * @param {Function} onConfirm The callback on confirmation
     */
    showInfo(message, onConfirm = null) {
        this._showAlert(message, 'info', onConfirm);
    }

    /**
     * Display warning alert
     * @param {string} message The message
     * @param {Function} onConfirm The callback on confirmation
     */
    showWarning(message, onConfirm = null) {
        this._showAlert(message, 'warning', onConfirm);
    }

    /**
     * Display error alert
     * @param {string} message The message
     * @param {Function} onConfirm The callback on confirmation
     */
    showError(message, onConfirm = null) {
        this._showAlert(message, 'error', onConfirm);
    }

    /**
     * Display success alert
     * @param {string} message The message
     * @param {Function} onConfirm The callback on confirmation
     */
    showSuccess(message, onConfirm = null) {
        this._showAlert(message, 'success', onConfirm);
    }

    /**
     * Display alert
     * @private
     */
    _showAlert(message, type, onConfirm) {
        this.alertType = type;
        this.onConfirm = onConfirm;

        // Set the message
        this.messageElement.textContent = message;

        // Adjust the style according to the alert type
        this._updateAlertStyle();

        this.show();
    }

    /**
     * Update style according to alert type
     * @private
     */
    _updateAlertStyle() {
        // Update the button class
        this.confirmButton.className = this._getButtonClass();

        // Add the alert type class to the modal content
        if (this.modalContent) {
            // Remove existing alert type classes
            this.modalContent.classList.remove('alert-info', 'alert-warning', 'alert-error', 'alert-success');

            // Add new alert type class
            this.modalContent.classList.add(`alert-${this.alertType}`);
        }

        // Add icon (if it doesn't exist)
        this._updateAlertIcon();
    }

    /**
     * Get button class according to alert type
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
     * Update alert icon
     * @private
     */
    _updateAlertIcon() {
        // Remove existing icon
        const existingIcon = this.messageElement?.previousElementSibling?.querySelector('i');
        if (existingIcon) {
            existingIcon.parentElement.remove();
        }

        // Create icon container
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

        // Insert before message
        this.messageElement.parentNode.insertBefore(iconContainer, this.messageElement);
    }

    /**
     * Set confirmation button text
     * @param {string} text Button text
     */
    setConfirmButtonText(text) {
        if (this.confirmButton) {
            this.confirmButton.textContent = text;
        }
    }

    /**
     * Set localization key for confirmation button
     * @param {string} key Localization key
     */
    setConfirmButtonLocalize(key) {
        if (this.confirmButton) {
            this.confirmButton.setAttribute('data-localize', key);
        }
    }

    /**
     * Cleanup when closing the modal
     */
    hide() {
        super.hide();
        this.onConfirm = null;
        this.alertType = 'info';

        // Remove icon
        const iconContainer = this.modalContent?.querySelector('.alert-icon-container');
        if (iconContainer) {
            iconContainer.remove();
        }

        // Remove alert type classes
        if (this.modalContent) {
            this.modalContent.classList.remove('alert-info', 'alert-warning', 'alert-error', 'alert-success');
        }
    }
}