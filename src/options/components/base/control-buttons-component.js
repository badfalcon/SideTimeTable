/**
 * ControlButtonsComponent - Reset button component
 */
export class ControlButtonsComponent {
    constructor(onReset) {
        this.onReset = onReset;
        this.element = null;
        this.resetButton = null;
    }

    createElement() {
        const container = document.createElement('div');
        container.className = 'd-flex gap-2 mt-4';

        // Reset button
        this.resetButton = document.createElement('button');
        this.resetButton.id = 'resetButton';
        this.resetButton.className = 'btn btn-outline-secondary';
        this.resetButton.setAttribute('data-localize', '__MSG_resetToDefault__');
        this.resetButton.textContent = 'Reset to Default';

        container.appendChild(this.resetButton);

        this.element = container;
        this._setupEventListeners();

        return container;
    }

    _setupEventListeners() {
        this.resetButton?.addEventListener('click', async () => {
            await this._handleReset();
        });
    }


    async _handleReset() {
        // Confirmation dialog
        const confirmed = confirm('Reset all settings to default? This action cannot be undone.');
        if (!confirmed) return;

        this.setResetState('resetting');

        try {
            if (this.onReset) {
                await this.onReset();
            }
            this._showSuccess('Settings reset to default');
        } catch (error) {
            console.error('Reset error:', error);
            this._showError('Failed to reset settings');
        } finally {
            this.setResetState('idle');
        }
    }


    setResetState(state) {
        if (!this.resetButton) return;

        switch (state) {
            case 'resetting':
                this.resetButton.disabled = true;
                this.resetButton.innerHTML = `
                    <span class="spinner-border spinner-border-sm me-1" role="status"></span>
                    Resetting...
                `;
                break;
            case 'idle':
            default:
                this.resetButton.disabled = false;
                this.resetButton.innerHTML = 'Reset to Default';
                break;
        }
    }

    _showSuccess(message) {
        this._showNotification(message, 'success');
    }

    _showError(message) {
        this._showNotification(message, 'danger');
    }

    _showNotification(message, type) {
        // Remove existing notifications
        const existing = this.element?.parentElement?.querySelector('.control-notification');
        if (existing) {
            existing.remove();
        }

        const notification = document.createElement('div');
        notification.className = `alert alert-${type} alert-dismissible fade show mt-2 control-notification`;
        notification.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        if (this.element?.parentElement) {
            this.element.parentElement.insertBefore(notification, this.element.nextSibling);
        }

        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 3000);
    }

    appendTo(container) {
        if (!this.element) {
            this.createElement();
        }
        container.appendChild(this.element);
    }

    getElement() {
        return this.element;
    }

    destroy() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
        this.element = null;
        this.resetButton = null;
    }
}