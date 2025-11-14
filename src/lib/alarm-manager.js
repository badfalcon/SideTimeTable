/**
 * AlarmManager - Manages event reminders using chrome.alarms API
 */
export class AlarmManager {
    static ALARM_PREFIX = 'event_reminder_';
    static GOOGLE_ALARM_PREFIX = 'google_event_reminder_';
    static REMINDER_MINUTES = 5;

    /**
     * Set a reminder for an event
     * @param {Object} event The event object with id, title, startTime
     * @param {string} dateStr The date string (YYYY-MM-DD)
     */
    static async setReminder(event, dateStr) {
        if (!event.reminder || !event.startTime) {
            return;
        }

        try {
            const alarmName = `${this.ALARM_PREFIX}${dateStr}_${event.id}`;
            const reminderTime = this.calculateReminderTime(event.startTime, dateStr);

            // Only set the alarm for the future times
            if (reminderTime <= Date.now()) {
                console.log('Reminder time is in the past, skipping:', event.title);
                return;
            }

            // Clear the existing alarm if any
            await chrome.alarms.clear(alarmName);

            // Create a new alarm
            await chrome.alarms.create(alarmName, {
                when: reminderTime
            });

            console.log(`Reminder set for event: ${event.title} at`, new Date(reminderTime));
        } catch (error) {
            console.error('Failed to set reminder:', error);
        }
    }

    /**
     * Clear the reminder for an event
     * @param {string} eventId The event ID
     * @param {string} dateStr The date string (YYYY-MM-DD)
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
     * Clear all the reminders for a specific date
     * @param {string} dateStr The date string (YYYY-MM-DD)
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
     * Calculate the reminder time (5 minutes before the event start)
     * @param {string} timeStr The time string (HH:mm)
     * @param {string} dateStr The date string (YYYY-MM-DD)
     * @returns {number} The reminder timestamp
     */
    static calculateReminderTime(timeStr, dateStr) {
        try {
            const [hours, minutes] = timeStr.split(':').map(Number);

            // Parse the date string properly (YYYY-MM-DD format)
            const [year, month, day] = dateStr.split('-').map(Number);

            // Create the date in the local timezone using the Date constructor
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
     * Show the notification for the event reminder
     * @param {string} alarmName The alarm name
     */
    static async showReminderNotification(alarmName) {
        try {
            // Check if it's a Google event reminder
            const isGoogleEvent = alarmName.startsWith(this.GOOGLE_ALARM_PREFIX);

            let eventData;
            if (isGoogleEvent) {
                // Get Google event data from storage
                eventData = await this.getGoogleEventData(alarmName);
            } else {
                // Extract the event info from the alarm name (local event)
                const parts = alarmName.replace(this.ALARM_PREFIX, '').split('_');
                if (parts.length < 2) {
                    console.warn('Invalid alarm name format:', alarmName);
                    return;
                }

                const dateStr = parts[0];
                const eventId = parts.slice(1).join('_');

                // Get the event details from the storage
                eventData = await this.getEventData(eventId, dateStr);
            }

            if (!eventData) {
                console.warn('Event data not found for reminder:', alarmName);
                return;
            }

            // Create the notification
            const notificationId = `reminder_${alarmName}`;

            // Create the notification with a fallback for icon issues
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
                // Try with the icon first
                notificationOptions.iconUrl = chrome.runtime.getURL('src/img/icon48.png');
                await chrome.notifications.create(notificationId, notificationOptions);
            } catch (iconError) {
                // Fallback: Create the notification without the icon
                delete notificationOptions.iconUrl;
                await chrome.notifications.create(notificationId, notificationOptions);
            }

            console.log('Reminder notification shown for:', eventData.title);
        } catch (error) {
            console.error('Failed to show reminder notification:', error);
        }
    }

    /**
     * Get the event data from the storage
     * @param {string} eventId The event ID
     * @param {string} dateStr The date string
     * @returns {Object|null} The event data
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
     * Set the reminders for all the events on a specific date
     * @param {string} dateStr The date string (YYYY-MM-DD)
     */
    static async setDateReminders(dateStr) {
        try {
            const storageKey = `localEvents_${dateStr}`;
            const result = await chrome.storage.sync.get(storageKey);
            const events = result[storageKey] || [];

            // Clear the existing reminders for this date first
            await this.clearDateReminders(dateStr);

            // Set the new reminders
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

    /**
     * Set a reminder for a Google event
     * @param {Object} event The Google event object
     * @param {string} dateStr The date string (YYYY-MM-DD)
     */
    static async setGoogleEventReminder(event, dateStr) {
        if (!event.start || !event.start.dateTime) {
            return; // Skip all-day events
        }

        try {
            const alarmName = `${this.GOOGLE_ALARM_PREFIX}${dateStr}_${event.id}`;
            const reminderTime = this.calculateGoogleEventReminderTime(event.start.dateTime);

            // Only set the alarm for the future times
            if (reminderTime <= Date.now()) {
                console.log('Reminder time is in the past, skipping:', event.summary);
                return;
            }

            // Clear the existing alarm if any
            await chrome.alarms.clear(alarmName);

            // Create a new alarm
            await chrome.alarms.create(alarmName, {
                when: reminderTime
            });

            // Store the event data for later retrieval
            const storageKey = `googleEventData_${alarmName}`;
            await chrome.storage.local.set({
                [storageKey]: {
                    id: event.id,
                    title: event.summary || 'No title',
                    startTime: this.formatTimeFromDateTime(event.start.dateTime),
                    dateStr: dateStr
                }
            });

            console.log(`Google reminder set for event: ${event.summary} at`, new Date(reminderTime));
        } catch (error) {
            console.error('Failed to set Google event reminder:', error);
        }
    }

    /**
     * Calculate the reminder time for a Google event (5 minutes before)
     * @param {string} dateTimeStr ISO 8601 datetime string
     * @returns {number} The reminder timestamp
     */
    static calculateGoogleEventReminderTime(dateTimeStr) {
        try {
            const eventDate = new Date(dateTimeStr);
            const reminderTime = new Date(eventDate.getTime() - (this.REMINDER_MINUTES * 60 * 1000));
            return reminderTime.getTime();
        } catch (error) {
            console.error('Error calculating Google event reminder time:', error);
            return Date.now() + (5 * 60 * 1000); // Fallback: 5 minutes from now
        }
    }

    /**
     * Format time from ISO 8601 datetime string
     * @param {string} dateTimeStr ISO 8601 datetime string
     * @returns {string} Time string (HH:mm)
     */
    static formatTimeFromDateTime(dateTimeStr) {
        try {
            const date = new Date(dateTimeStr);
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return `${hours}:${minutes}`;
        } catch (error) {
            console.error('Error formatting time:', error);
            return '00:00';
        }
    }

    /**
     * Set reminders for all Google events on a specific date
     * @param {Array} events Array of Google event objects
     * @param {string} dateStr The date string (YYYY-MM-DD)
     */
    static async setGoogleEventReminders(events, dateStr) {
        try {
            // Clear existing Google event reminders for this date first
            await this.clearGoogleEventReminders(dateStr);

            // Set new reminders
            let count = 0;
            for (const event of events) {
                if (event.start && event.start.dateTime) {
                    await this.setGoogleEventReminder(event, dateStr);
                    count++;
                }
            }

            console.log(`Set ${count} Google event reminders for ${dateStr}`);
        } catch (error) {
            console.error('Failed to set Google event reminders:', error);
        }
    }

    /**
     * Clear all Google event reminders for a specific date
     * @param {string} dateStr The date string (YYYY-MM-DD)
     */
    static async clearGoogleEventReminders(dateStr) {
        try {
            const alarms = await chrome.alarms.getAll();
            const googleAlarms = alarms.filter(alarm =>
                alarm.name.includes(`${this.GOOGLE_ALARM_PREFIX}${dateStr}_`)
            );

            for (const alarm of googleAlarms) {
                await chrome.alarms.clear(alarm.name);
                // Also clear the stored event data
                const storageKey = `googleEventData_${alarm.name}`;
                await chrome.storage.local.remove(storageKey);
            }

            console.log(`Cleared ${googleAlarms.length} Google event reminders for date:`, dateStr);
        } catch (error) {
            console.error('Failed to clear Google event reminders:', error);
        }
    }

    /**
     * Get Google event data from storage
     * @param {string} alarmName The alarm name
     * @returns {Object|null} The event data
     */
    static async getGoogleEventData(alarmName) {
        try {
            const storageKey = `googleEventData_${alarmName}`;
            const result = await chrome.storage.local.get(storageKey);
            return result[storageKey] || null;
        } catch (error) {
            console.error('Failed to get Google event data:', error);
            return null;
        }
    }
}