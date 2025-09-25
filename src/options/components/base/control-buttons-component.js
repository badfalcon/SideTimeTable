/**
 * ControlButtonsComponent - Save/Reset buttons component
 */
export class ControlButtonsComponent {
    constructor(onSave, onReset) {
        this.onSave = onSave;
        this.onReset = onReset;
        this.element = null;
        this.saveButton = null;
        this.resetButton = null;
        this.saveState = 'idle'; // idle, saving, saved
    }

    createElement() {
        const container = document.createElement('div');
        container.className = 'd-flex gap-2 mt-4';

        // Save button
        this.saveButton = document.createElement('button');
        this.saveButton.id = 'saveButton';
        this.saveButton.className = 'btn btn-primary';
        this.saveButton.setAttribute('data-localize', '__MSG_save__');
        this.saveButton.textContent = 'Save';

        // Reset button
        this.resetButton = document.createElement('button');
        this.resetButton.id = 'resetButton';
        this.resetButton.className = 'btn btn-outline-secondary';
        this.resetButton.setAttribute('data-localize', '__MSG_resetToDefault__');
        this.resetButton.textContent = 'Reset to Default';

        container.appendChild(this.saveButton);
        container.appendChild(this.resetButton);

        this.element = container;
        this._setupEventListeners();

        return container;
    }

    _setupEventListeners() {
        this.saveButton?.addEventListener('click', async () => {
            await this._handleSave();
        });

        this.resetButton?.addEventListener('click', async () => {
            await this._handleReset();
        });
    }

    async _handleSave() {
        if (this.saveState === 'saving') return;

        this.setSaveState('saving');

        try {
            if (this.onSave) {
                await this.onSave();
            }
            this.setSaveState('saved');

            // Return to normal state after 2 seconds
            setTimeout(() => {
                this.setSaveState('idle');
            }, 2000);
        } catch (error) {
            console.error('Save error:', error);
            this.setSaveState('idle');
            this._showError('Failed to save settings');
        }
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

    setSaveState(state) {
        this.saveState = state;

        if (!this.saveButton) return;

        switch (state) {
            case 'saving':
                this.saveButton.disabled = true;
                this.saveButton.innerHTML = `
                    <span class="spinner-border spinner-border-sm me-1" role="status"></span>
                    Saving...
                `;
                break;
            case 'saved':
                this.saveButton.disabled = false;
                this.saveButton.innerHTML = `
                    <i class="fas fa-check me-1"></i>
                    Saved
                `;
                this.saveButton.className = 'btn btn-success';
                break;
            case 'idle':
            default:
                this.saveButton.disabled = false;
                this.saveButton.innerHTML = 'Save';
                this.saveButton.className = 'btn btn-primary';
                break;
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
        this.saveButton = null;
        this.resetButton = null;
    }
}