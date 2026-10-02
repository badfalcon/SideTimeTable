/**
 * ReminderDebugCard - Reminder debug & test card for the Developer tab
 */
import { CardComponent } from '../base/card-component.js';
import { createButton, msg } from '../base/settings-dom.js';
import { sendMessage } from '../../../lib/chrome-messaging.js';

export class ReminderDebugCard extends CardComponent {
    constructor() {
        super({
            title: msg('reminderDebugTitle', 'Reminder Debug & Test'),
            titleLocalize: '__MSG_reminderDebugTitle__',
            icon: 'fas fa-bug',
        });

        this.debugOutput = null;
    }

    createElement() {
        const card = super.createElement();
        this.addContent(this._createDebugSection());
        return card;
    }

    /**
     * The test actions, and the output of "Show debug info"
     * @private
     */
    _createDebugSection() {
        const block = document.createElement('div');
        block.className = 'settings-block';

        const actions = document.createElement('div');
        actions.className = 'settings-button-row';

        const testButton = createButton({ labelKey: 'testNotification', labelFallback: 'Test Notification', icon: 'fas fa-bell' });
        testButton.addEventListener('click', () => this._testNotification());
        actions.appendChild(testButton);

        const syncButton = createButton({ labelKey: 'forceSyncNow', labelFallback: 'Force Sync Now', icon: 'fas fa-arrows-rotate' });
        syncButton.addEventListener('click', () => this._forceSyncReminders());
        actions.appendChild(syncButton);

        const debugButton = createButton({ labelKey: 'showDebugInfo', labelFallback: 'Show Debug Info', icon: 'fas fa-magnifying-glass' });
        debugButton.addEventListener('click', () => this._showDebugInfo());
        actions.appendChild(debugButton);

        block.appendChild(actions);

        this.debugOutput = document.createElement('pre');
        this.debugOutput.className = 'settings-code-block';
        this.debugOutput.hidden = true;
        block.appendChild(this.debugOutput);

        return block;
    }

    /**
     * Test notification
     * @private
     */
    async _testNotification() {
        try {
            const response = await sendMessage({ action: 'testReminder' });
            if (response.success) {
                alert(window.getLocalizedMessage('testNotificationSent') || 'Test notification sent! Check your notifications.');
            } else {
                alert((window.getLocalizedMessage('testNotificationFailed') || 'Failed to send test notification: ') + response.error);
            }
        } catch (error) {
            alert((window.getLocalizedMessage('errorPrefix') || 'Error: ') + error.message);
        }
    }

    /**
     * Force sync reminders
     * @private
     */
    async _forceSyncReminders() {
        try {
            const response = await sendMessage({ action: 'forceSyncReminders' });
            if (response.success) {
                alert(window.getLocalizedMessage('syncCompleted') || 'Reminder sync completed! Check background console for logs.');
            } else {
                alert((window.getLocalizedMessage('syncFailed') || 'Failed to sync reminders: ') + response.error);
            }
        } catch (error) {
            alert((window.getLocalizedMessage('errorPrefix') || 'Error: ') + error.message);
        }
    }

    /**
     * Show debug info
     * @private
     */
    async _showDebugInfo() {
        try {
            const response = await sendMessage({ action: 'debugAlarms' });
            if (response.success) {
                const info = {
                    settings: response.settings,
                    alarms: response.alarms,
                    timestamp: new Date().toLocaleString()
                };
                this.debugOutput.textContent = JSON.stringify(info, null, 2);
                this.debugOutput.hidden = false;
            } else {
                alert((window.getLocalizedMessage('debugInfoFailed') || 'Failed to get debug info: ') + response.error);
            }
        } catch (error) {
            alert((window.getLocalizedMessage('errorPrefix') || 'Error: ') + error.message);
        }
    }
}
