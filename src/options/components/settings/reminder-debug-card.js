/**
 * ReminderDebugCard - Reminder debug & test card for the Developer tab
 */
import { CardComponent } from '../base/card-component.js';

export class ReminderDebugCard extends CardComponent {
    constructor() {
        super({
            title: 'Reminder Debug & Test',
            icon: 'fas fa-bug',
            iconColor: 'text-warning'
        });

        this.debugOutput = null;
    }

    createElement() {
        const card = super.createElement();

        const container = this._createDebugSection();
        this.addContent(container);

        return card;
    }

    /**
     * Create debug/test section
     * @private
     */
    _createDebugSection() {
        const container = document.createElement('div');

        // Test notification button
        const testButton = document.createElement('button');
        testButton.type = 'button';
        testButton.className = 'btn btn-sm btn-outline-primary me-2';
        testButton.textContent = 'Test Notification';
        testButton.onclick = () => this._testNotification();
        container.appendChild(testButton);

        // Force sync button
        const syncButton = document.createElement('button');
        syncButton.type = 'button';
        syncButton.className = 'btn btn-sm btn-outline-secondary me-2';
        syncButton.textContent = 'Force Sync Now';
        syncButton.onclick = () => this._forceSyncReminders();
        container.appendChild(syncButton);

        // Debug info button
        const debugButton = document.createElement('button');
        debugButton.type = 'button';
        debugButton.className = 'btn btn-sm btn-outline-info';
        debugButton.textContent = 'Show Debug Info';
        debugButton.onclick = () => this._showDebugInfo();
        container.appendChild(debugButton);

        // Debug output area
        this.debugOutput = document.createElement('pre');
        this.debugOutput.className = 'mt-2 p-2 bg-white border rounded';
        this.debugOutput.style.cssText = 'font-size: 11px; max-height: 200px; overflow-y: auto; display: none;';
        container.appendChild(this.debugOutput);

        return container;
    }

    /**
     * Test notification
     * @private
     */
    async _testNotification() {
        try {
            const response = await chrome.runtime.sendMessage({ action: 'testReminder' });
            if (response.success) {
                alert('Test notification sent! Check your notifications.');
            } else {
                alert('Failed to send test notification: ' + response.error);
            }
        } catch (error) {
            alert('Error: ' + error.message);
        }
    }

    /**
     * Force sync reminders
     * @private
     */
    async _forceSyncReminders() {
        try {
            const response = await chrome.runtime.sendMessage({ action: 'forceSyncReminders' });
            if (response.success) {
                alert('Reminder sync completed! Check background console for logs.');
            } else {
                alert('Failed to sync reminders: ' + response.error);
            }
        } catch (error) {
            alert('Error: ' + error.message);
        }
    }

    /**
     * Show debug info
     * @private
     */
    async _showDebugInfo() {
        try {
            const response = await chrome.runtime.sendMessage({ action: 'debugAlarms' });
            if (response.success) {
                const info = {
                    settings: response.settings,
                    alarms: response.alarms,
                    timestamp: new Date().toLocaleString()
                };
                this.debugOutput.textContent = JSON.stringify(info, null, 2);
                this.debugOutput.style.display = 'block';
            } else {
                alert('Failed to get debug info: ' + response.error);
            }
        } catch (error) {
            alert('Error: ' + error.message);
        }
    }
}
