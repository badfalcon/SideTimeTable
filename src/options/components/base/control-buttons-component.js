/**
 * ControlButtonsComponent - The reset button component
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

        // The reset button
        this.resetButton = document.createElement('button');
        this.resetButton.id = 'resetButton';
        this.resetButton.className = 'btn btn-outline-secondary';
        this.resetButton.setAttribute('data-localize', '__MSG_resetToDefault__');
        this.resetButton.textContent = 'Reset to Default';

        container.appendChild(this.resetButton);

        // What's New link
        const whatsNewLink = document.createElement('a');
        whatsNewLink.href = '../whats-new/whats-new.html';
        whatsNewLink.target = '_blank';
        whatsNewLink.className = 'btn btn-outline-info';
        whatsNewLink.innerHTML = `<i class="fas fa-bullhorn me-1"></i><span data-localize="__MSG_whatsNewTitle__">What's New</span>`;
        container.appendChild(whatsNewLink);

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
        // The confirmation dialog with localized message
        const message = await this._getLocalizedMessage('confirmResetSettings');
        const confirmed = confirm(message);
        if (!confirmed) return;

        this.setResetState('resetting');

        try {
            if (this.onReset) {
                await this.onReset();
            }
            this._showSuccess(chrome.i18n.getMessage('settingsReset'));
        } catch (error) {
            console.error('Reset error:', error);
            this._showError(chrome.i18n.getMessage('resetFailed'));
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
                    ${chrome.i18n.getMessage('resetting')}
                `;
                break;
            case 'idle':
            default:
                this.resetButton.disabled = false;
                this.resetButton.innerHTML = chrome.i18n.getMessage('resetToDefault');
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
        // Remove the existing notifications
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

    /**
     * Get localized message considering user's language setting
     * @private
     */
    async _getLocalizedMessage(key) {
        try {
            // Try to use the language-aware localization if available
            if (window.getCurrentLanguageSetting && window.resolveLanguageCode) {
                const userLanguageSetting = await window.getCurrentLanguageSetting();
                const targetLanguage = window.resolveLanguageCode(userLanguageSetting);

                // Load the appropriate messages file
                const messagesUrl = chrome.runtime.getURL(`/_locales/${targetLanguage}/messages.json`);
                const response = await fetch(messagesUrl);
                const messages = await response.json();

                if (messages[key] && messages[key].message) {
                    return messages[key].message;
                }
            }
        } catch (error) {
            console.warn('Failed to load localized message:', error);
        }

        // Fallback to default chrome.i18n.getMessage
        return chrome.i18n.getMessage(key);
    }
}