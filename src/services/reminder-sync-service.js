/**
 * ReminderSyncService - Manages syncing of event reminders
 *
 * Handles synchronisation of both local and Google Calendar event
 * reminders using the AlarmManager infrastructure.
 */
import { StorageHelper } from '../lib/storage-helper.js';
import { AlarmManager } from '../lib/alarm-manager.js';

export class ReminderSyncService {

    /**
     * @param {import('./google-calendar-client.js').GoogleCalendarClient} calendarClient
     */
    constructor(calendarClient) {
        this._calendarClient = calendarClient;
    }

    /**
     * Sync all event reminders (local and Google)
     */
    async syncAll() {
        await Promise.all([
            this.syncLocalEventReminders(),
            this.syncGoogleEventReminders()
        ]);
    }

    /**
     * Sync local event reminders for today
     */
    async syncLocalEventReminders() {
        try {
            const today = new Date();
            const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            await AlarmManager.setDateReminders(dateStr);
        } catch (error) {
            console.error('[Reminder Sync] Failed to sync local event reminders:', error);
        }
    }

    /**
     * Sync Google event reminders for today
     */
    async syncGoogleEventReminders() {
        try {
            const settings = await StorageHelper.get(['googleEventReminder', 'googleIntegrated', 'reminderMinutes'], {
                googleEventReminder: false,
                googleIntegrated: false,
                reminderMinutes: 5
            });

            if (!settings.googleEventReminder) return;
            if (!settings.googleIntegrated) return;

            const today = new Date();
            const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

            // Clear old reminders from previous dates
            const allAlarms = await chrome.alarms.getAll();
            const oldReminders = allAlarms.filter(alarm =>
                alarm.name.startsWith(AlarmManager.GOOGLE_ALARM_PREFIX) &&
                !alarm.name.includes(`${AlarmManager.GOOGLE_ALARM_PREFIX}${dateStr}_`)
            );

            for (const alarm of oldReminders) {
                await chrome.alarms.clear(alarm.name);
                // Also clear stored event data
                const storageKey = `googleEventData_${alarm.name}`;
                await chrome.storage.local.remove(storageKey);
            }

            const events = await this._calendarClient.getPrimaryCalendarEvents(today);
            if (events && events.length > 0) {
                await AlarmManager.setGoogleEventReminders(events, dateStr);
            }

            // Record sync timestamp
            await StorageHelper.setLocal({ lastReminderSyncTime: Date.now() });
        } catch (error) {
            console.error('[Reminder Sync] ERROR:', error);
            console.error('[Reminder Sync] Stack trace:', error.stack);
        }
    }

    /**
     * Set up daily alarm for Google event reminder sync
     */
    async setupDailySync() {
        try {
            // Clear existing daily sync alarm
            await chrome.alarms.clear('daily_reminder_sync');

            // Calculate next midnight
            const now = new Date();
            const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);

            // Create alarm for midnight (00:00) every day
            await chrome.alarms.create('daily_reminder_sync', {
                when: tomorrow.getTime(),
                periodInMinutes: 24 * 60 // Repeat every 24 hours
            });
        } catch (error) {
            console.error('Failed to setup daily reminder sync:', error);
        }
    }
}
