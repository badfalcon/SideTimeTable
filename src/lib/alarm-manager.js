/**
 * AlarmManager - Manages event reminders using chrome.alarms API
 */
export class AlarmManager {
    static ALARM_PREFIX = 'event_reminder_';
    static REMINDER_MINUTES = 5;

    /**
     * Set reminder for an event
     * @param {Object} event Event object with id, title, startTime
     * @param {string} dateStr Date string (YYYY-MM-DD)
     */
    static async setReminder(event, dateStr) {
        if (!event.reminder || !event.startTime) {
            return;
        }

        try {
            const alarmName = `${this.ALARM_PREFIX}${dateStr}_${event.id}`;
            const reminderTime = this.calculateReminderTime(event.startTime, dateStr);

            // Only set alarm for future times
            if (reminderTime <= Date.now()) {
                console.log('Reminder time is in the past, skipping:', event.title);
                return;
            }

            // Clear existing alarm if any
            await chrome.alarms.clear(alarmName);

            // Create new alarm
            await chrome.alarms.create(alarmName, {
                when: reminderTime
            });

            console.log(`Reminder set for event: ${event.title} at`, new Date(reminderTime));
        } catch (error) {
            console.error('Failed to set reminder:', error);
        }
    }

    /**
     * Clear reminder for an event
     * @param {string} eventId Event ID
     * @param {string} dateStr Date string (YYYY-MM-DD)
     */
    static async clearReminder(eventId, dateStr) {
        try {
            const alarmName = `${this.ALARM_PREFIX}${dateStr}_${eventId}`;
            await chrome.alarms.clear(alarmName);
            console.log('Reminder cleared for event ID:', eventId);
        } catch (error) {
            console.error('Failed to clear reminder:', error);
        }
    }

    /**
     * Clear all reminders for a specific date
     * @param {string} dateStr Date string (YYYY-MM-DD)
     */
    static async clearDateReminders(dateStr) {
        try {
            const alarms = await chrome.alarms.getAll();
            const dateAlarms = alarms.filter(alarm =>
                alarm.name.includes(`${this.ALARM_PREFIX}${dateStr}_`)
            );

            for (const alarm of dateAlarms) {
                await chrome.alarms.clear(alarm.name);
            }

            console.log(`Cleared ${dateAlarms.length} reminders for date:`, dateStr);
        } catch (error) {
            console.error('Failed to clear date reminders:', error);
        }
    }

    /**
     * Calculate reminder time (5 minutes before event start)
     * @param {string} timeStr Time string (HH:mm)
     * @param {string} dateStr Date string (YYYY-MM-DD)
     * @returns {number} Reminder timestamp
     */
    static calculateReminderTime(timeStr, dateStr) {
        try {
            const [hours, minutes] = timeStr.split(':').map(Number);

            // Parse the date string properly (YYYY-MM-DD format)
            const [year, month, day] = dateStr.split('-').map(Number);

            // Create date in local timezone using Date constructor
            const eventDate = new Date(year, month - 1, day, hours, minutes, 0);

            // Subtract 5 minutes
            const reminderTime = new Date(eventDate.getTime() - (this.REMINDER_MINUTES * 60 * 1000));


            return reminderTime.getTime();
        } catch (error) {
            console.error('Error calculating reminder time:', error);
            return Date.now() + (5 * 60 * 1000); // Fallback: 5 minutes from now
        }
    }

    /**
     * Show notification for event reminder
     * @param {string} alarmName Alarm name
     */
    static async showReminderNotification(alarmName) {
        try {
            // Extract event info from alarm name
            const parts = alarmName.replace(this.ALARM_PREFIX, '').split('_');
            if (parts.length < 2) {
                console.warn('Invalid alarm name format:', alarmName);
                return;
            }

            const dateStr = parts[0];
            const eventId = parts.slice(1).join('_');

            // Get event details from storage
            const eventData = await this.getEventData(eventId, dateStr);
            if (!eventData) {
                console.warn('Event data not found for reminder:', alarmName);
                return;
            }

            // Create notification
            const notificationId = `reminder_${alarmName}`;

            // Create notification with fallback for icon issues
            const notificationOptions = {
                type: 'basic',
                title: chrome.i18n.getMessage('eventReminder') || 'Event Reminder',
                message: chrome.i18n.getMessage('startsInMinutes', [eventData.title, this.REMINDER_MINUTES.toString(), eventData.startTime])
                    || `"${eventData.title}" starts in ${this.REMINDER_MINUTES} minutes (${eventData.startTime})`,
                buttons: [
                    { title: chrome.i18n.getMessage('openSideTimeTable') || 'Open SideTimeTable' },
                    { title: chrome.i18n.getMessage('dismissNotification') || 'Dismiss' }
                ],
                requireInteraction: true
            };

            try {
                // Try with icon first
                notificationOptions.iconUrl = chrome.runtime.getURL('src/img/icon48.png');
                await chrome.notifications.create(notificationId, notificationOptions);
            } catch (iconError) {
                // Fallback: Create notification without icon
                delete notificationOptions.iconUrl;
                await chrome.notifications.create(notificationId, notificationOptions);
            }

            console.log('Reminder notification shown for:', eventData.title);
        } catch (error) {
            console.error('Failed to show reminder notification:', error);
        }
    }

    /**
     * Get event data from storage
     * @param {string} eventId Event ID
     * @param {string} dateStr Date string
     * @returns {Object|null} Event data
     */
    static async getEventData(eventId, dateStr) {
        try {
            const storageKey = `localEvents_${dateStr}`;
            const result = await chrome.storage.sync.get(storageKey);
            const events = result[storageKey] || [];

            return events.find(event => event.id === eventId) || null;
        } catch (error) {
            console.error('Failed to get event data:', error);
            return null;
        }
    }

    /**
     * Set reminders for all events on a specific date
     * @param {string} dateStr Date string (YYYY-MM-DD)
     */
    static async setDateReminders(dateStr) {
        try {
            const storageKey = `localEvents_${dateStr}`;
            const result = await chrome.storage.sync.get(storageKey);
            const events = result[storageKey] || [];

            // Clear existing reminders for this date first
            await this.clearDateReminders(dateStr);

            // Set new reminders
            for (const event of events) {
                if (event.reminder) {
                    await this.setReminder(event, dateStr);
                }
            }

            console.log(`Set reminders for ${events.filter(e => e.reminder).length} events on ${dateStr}`);
        } catch (error) {
            console.error('Failed to set date reminders:', error);
        }
    }
}