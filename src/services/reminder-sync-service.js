/**
 * ReminderSyncService - Manages syncing of event reminders
 *
 * Handles synchronisation of both local and Google Calendar event
 * reminders using the AlarmManager infrastructure.
 */
import { StorageHelper } from '../lib/storage-helper.js';
import { AlarmManager } from '../lib/alarm-manager.js';
import { AuthenticationError } from './google-calendar-client.js';

export class ReminderSyncService {

    // Intra-day sync interval bounds (minutes). Values below the minimum (e.g.
    // legacy/corrupt data) fall back to the default rather than hammering the
    // service worker.
    static DEFAULT_SYNC_MINUTES = 60;
    static MIN_SYNC_MINUTES = 15;

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

            // Feature disabled (or Google disconnected) → remove any previously
            // scheduled Google reminders across all dates so stale notifications
            // don't keep firing after the user turns the feature off or resets.
            if (!settings.googleEventReminder || !settings.googleIntegrated) {
                const existing = await chrome.alarms.getAll();
                const googleReminders = existing.filter(alarm =>
                    alarm.name.startsWith(AlarmManager.GOOGLE_ALARM_PREFIX)
                );
                for (const alarm of googleReminders) {
                    await chrome.alarms.clear(alarm.name);
                    await chrome.storage.local.remove(`googleEventData_${alarm.name}`);
                }
                return;
            }

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
            if (error instanceof AuthenticationError) {
                console.warn('[Reminder Sync] Skipped: auth expired');
            } else {
                console.error('[Reminder Sync] ERROR:', error);
                console.error('[Reminder Sync] Stack trace:', error.stack);
            }
        }
    }

    /**
     * Set up a recurring intra-day sync so reminders pick up Google Calendar
     * events that were added or rescheduled after the last sync.
     *
     * Without this, reminders are only a snapshot taken at midnight / browser
     * start / when the side panel is opened, so events created during the day
     * silently get no notification.
     *
     * The interval is user-configurable via the `reminderSyncInterval` setting
     * (minutes); invalid or sub-minimum values fall back to the default.
     */

    /**
     * Resolve the configured sync interval in minutes, falling back to the
     * default for invalid or sub-minimum values.
     * @returns {Promise<number>}
     */
    async getSyncIntervalMinutes() {
        const { reminderSyncInterval } = await StorageHelper.get(
            ['reminderSyncInterval'],
            { reminderSyncInterval: ReminderSyncService.DEFAULT_SYNC_MINUTES }
        );
        const value = Number(reminderSyncInterval);
        if (!Number.isFinite(value) || value < ReminderSyncService.MIN_SYNC_MINUTES) {
            return ReminderSyncService.DEFAULT_SYNC_MINUTES;
        }
        return value;
    }

    /**
     * @param {Object} [options]
     * @param {boolean} [options.force=false] Recreate even if an alarm with the
     *   same cadence already exists. Use when the interval setting changed.
     */
    async setupPeriodicSync({ force = false } = {}) {
        try {
            const periodInMinutes = await this.getSyncIntervalMinutes();

            // chrome.alarms persist across browser/service-worker restarts, and
            // periodic_reminder_sync has no absolute `when` (its first fire is
            // periodInMinutes away). Recreating it on every startup would reset
            // that relative countdown, so on a profile that restarts more often
            // than the interval it would never fire. Only (re)create when it is
            // missing or the cadence actually changed.
            if (!force) {
                const existing = await chrome.alarms.get('periodic_reminder_sync');
                if (existing && existing.periodInMinutes === periodInMinutes) {
                    return;
                }
            }

            await chrome.alarms.clear('periodic_reminder_sync');
            await chrome.alarms.create('periodic_reminder_sync', { periodInMinutes });
        } catch (error) {
            console.error('Failed to setup periodic reminder sync:', error);
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
