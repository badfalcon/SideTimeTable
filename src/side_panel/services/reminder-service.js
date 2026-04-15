/**
 * ReminderService - Side panel reminder synchronization.
 *
 * Handles manual sync, auto-sync on panel open, and post-save sync.
 * DOM-free: delegates UI feedback to caller.
 */

import { sendMessage } from '../../lib/chrome-messaging.js';
import { AlarmManager } from '../../lib/alarm-manager.js';

export class ReminderService {

    /**
     * Force sync reminders via background service worker.
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    async forceSyncReminders() {
        try {
            const response = await sendMessage({ action: 'forceSyncReminders' });
            if (response.success) {
                return { success: true };
            }
            return { success: false, error: response.error || 'Unknown error' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Auto-sync reminders with throttle (called when side panel opens).
     * @returns {Promise<void>}
     */
    async autoSyncReminders() {
        try {
            const response = await sendMessage({ action: 'autoSyncReminders' });
            if (!response.success) {
                console.warn('[Auto Sync] Failed to auto-sync reminders:', response.error);
            }
        } catch (error) {
            console.warn('[Auto Sync] Auto-sync error:', error);
        }
    }

    /**
     * Sync reminders for a specific date if it's today or in the future.
     * @param {Date} currentDate - The date being viewed
     * @param {string} dateString - The date in YYYY-MM-DD format
     * @returns {Promise<void>}
     */
    async syncRemindersIfNeeded(currentDate, dateString) {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (currentDate >= today) {
                await AlarmManager.setDateReminders(dateString);
            }
        } catch (error) {
            console.error('Failed to sync reminders:', error);
        }
    }
}
