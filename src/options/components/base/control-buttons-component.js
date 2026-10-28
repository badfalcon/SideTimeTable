/**
 * ControlButtonsComponent - Replay the tutorial, open the changelog, reset
 * all settings: quiet rows under the section list (at the bottom of the page
 * in a narrow window). Reset is set apart and red.
 */
import { StorageHelper } from '../../../lib/storage-helper.js';
import { sendMessage } from '../../../lib/chrome-messaging.js';
import { createIcon, createNotice, msg, setText } from './settings-dom.js';

export class ControlButtonsComponent {
    constructor(onReset) {
        this.onReset = onReset;
        this.element = null;
        this.resetButton = null;
        this.replayTutorialButton = null;
    }

    createElement() {
        const container = document.createElement('div');
        container.className = 'settings-extras-list';

        // Replay Tutorial
        this.replayTutorialButton = document.createElement('button');
        this.replayTutorialButton.type = 'button';
        this.replayTutorialButton.id = 'replayTutorialButton';
        this.replayTutorialButton.className = 'settings-nav-item';
        this.replayTutorialButton.appendChild(createIcon('fas fa-graduation-cap'));
        this.replayTutorialButton.appendChild(setText(document.createElement('span'), 'replayTutorial', 'Replay tutorial'));
        container.appendChild(this.replayTutorialButton);

        // Changelog (opens in a new tab)
        const changelogLink = document.createElement('a');
        changelogLink.href = '../changelog/changelog.html';
        changelogLink.target = '_blank';
        changelogLink.className = 'settings-nav-item';
        changelogLink.appendChild(createIcon('fas fa-list-ul'));
        changelogLink.appendChild(setText(document.createElement('span'), 'changelogTitle', 'Changelog'));
        const external = createIcon('fas fa-arrow-up-right-from-square settings-nav-item-trailing');
        changelogLink.appendChild(external);
        container.appendChild(changelogLink);

        const divider = document.createElement('div');
        divider.className = 'settings-nav-divider';
        container.appendChild(divider);

        // Reset all settings
        this.resetButton = document.createElement('button');
        this.resetButton.type = 'button';
        this.resetButton.id = 'resetButton';
        this.resetButton.className = 'settings-nav-item is-danger';
        this._renderResetLabel();
        container.appendChild(this.resetButton);

        this.element = container;
        this._setupEventListeners();

        return container;
    }

    _setupEventListeners() {
        this.resetButton?.addEventListener('click', async () => {
            await this._handleReset();
        });

        this.replayTutorialButton?.addEventListener('click', async () => {
            await this._handleReplayTutorial();
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
            this._showSuccess(window.getLocalizedMessage('settingsReset'));
        } catch (error) {
            console.error('Reset error:', error);
            this._showError(window.getLocalizedMessage('resetFailed'));
        } finally {
            this.setResetState('idle');
        }
    }


    async _handleReplayTutorial() {
        try {
            // Reset tutorial and initial setup flags
            await StorageHelper.remove(['tutorialCompleted', 'initialSetupCompleted']);

            this._showSuccess(window.getLocalizedMessage('replayTutorialSuccess') || 'Tutorial will show on next open.');

            // Reload side panel so it picks up the reset state
            try {
                sendMessage({ action: 'reloadSideTimeTable' });
            } catch {
                // Non-blocking
            }
        } catch (error) {
            console.error('Replay tutorial error:', error);
            this._showError(window.getLocalizedMessage('replayTutorialFailed') || 'Failed to reset tutorial.');
        }
    }

    setResetState(state) {
        if (!this.resetButton) return;

        switch (state) {
            case 'resetting':
                this.resetButton.disabled = true;
                this.resetButton.replaceChildren(
                    createIcon('fas fa-rotate-left fa-spin'),
                    setText(document.createElement('span'), 'resetting', 'Resetting...')
                );
                break;
            case 'idle':
            default:
                this.resetButton.disabled = false;
                this._renderResetLabel();
                break;
        }
    }

    /**
     * Icon and label of the reset row.
     * @private
     */
    _renderResetLabel() {
        this.resetButton.replaceChildren(
            createIcon('fas fa-rotate-left'),
            setText(document.createElement('span'), 'resetToDefault', 'Reset all settings')
        );
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

        const notification = createNotice({
            content: message || msg(type === 'success' ? 'settingsReset' : 'resetFailed', ''),
            tone: type === 'success' ? 'success' : 'danger',
            duration: 3000,
            className: 'control-notification'
        });

        if (this.element?.parentElement) {
            this.element.parentElement.insertBefore(notification, this.element.nextSibling);
        }
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
        this.replayTutorialButton = null;
    }

    /**
     * Get localized message considering user's language setting
     * @private
     */
    _getLocalizedMessage(key) {
        return window.getLocalizedMessage(key);
    }
}