/**
 * AlarmManager - Manages event reminders using chrome.alarms API
 */
import { STORAGE_KEYS } from './constants.js';
import { getRecurringEventsForDate } from './event-storage.js';
import { extractMeetUrl, extractVideoUrl } from './conference-url-utils.js';

export class AlarmManager {
    static ALARM_PREFIX = 'event_reminder_';
    static GOOGLE_ALARM_PREFIX = 'google_event_reminder_';
    static REMINDER_MINUTES = 5;

    // Google Calendar eventTypes that are status markers rather than meetings.
    // These should never trigger a reminder notification (e.g. an out-of-office
    // block is not something the user needs to be reminded to "attend").
    static NON_MEETING_EVENT_TYPES = ['outOfOffice', 'focusTime', 'workingLocation'];

    /**
     * Set a reminder for an event
     * @param {Object} event The event object with id, title, startTime
     * @param {string} dateStr The date string (YYYY-MM-DD)
     * @param {number} reminderMinutes Minutes before event to remind (optional, defaults to stored value)
     */
    static async setReminder(event, dateStr, reminderMinutes = null) {
        if (!event.reminder || !event.startTime) {
            return;
        }

        try {
            // Get reminder minutes from settings if not provided
            if (reminderMinutes === null) {
                const settings = await chrome.storage.sync.get(['reminderMinutes']);
                reminderMinutes = settings.reminderMinutes ?? this.REMINDER_MINUTES;
            }

            // Validate range: 0-60, otherwise use default
            if (typeof reminderMinutes !== 'number' || reminderMinutes < 0 || reminderMinutes > 60) {
                reminderMinutes = this.REMINDER_MINUTES;
            }

            const alarmName = `${this.ALARM_PREFIX}${dateStr}_${event.id}`;
            const reminderTime = this.calculateReminderTime(event.startTime, dateStr, reminderMinutes);

            // Only set the alarm for the future times
            if (reminderTime <= Date.now()) {
                return;
            }

            // Clear the existing alarm if any
            await chrome.alarms.clear(alarmName);

            // Create a new alarm
            await chrome.alarms.create(alarmName, {
                when: reminderTime
            });
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
        } catch (error) {
            console.error('Failed to clear date reminders:', error);
        }
    }

    /**
     * Calculate the reminder time
     * @param {string} timeStr The time string (HH:mm)
     * @param {string} dateStr The date string (YYYY-MM-DD)
     * @param {number} reminderMinutes Minutes before event to remind
     * @returns {number} The reminder timestamp
     */
    static calculateReminderTime(timeStr, dateStr, reminderMinutes) {
        try {
            const [hours, minutes] = timeStr.split(':').map(Number);

            // Parse the date string properly (YYYY-MM-DD format)
            const [year, month, day] = dateStr.split('-').map(Number);

            // Create the date in the local timezone using the Date constructor
            const eventDate = new Date(year, month - 1, day, hours, minutes, 0);

            // Subtract the specified minutes
            const reminderTime = new Date(eventDate.getTime() - (reminderMinutes * 60 * 1000));

            return reminderTime.getTime();
        } catch (error) {
            console.error('Error calculating reminder time:', error);
            return Date.now() + (reminderMinutes * 60 * 1000); // Fallback: specified minutes from now
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

            // Determine the minutes to display in the notification.
            //
            // Chrome MV3 can deliver alarms several minutes late (battery saver,
            // device sleep, service-worker throttling). Showing the statically
            // configured value ("in 5 minutes") would then be wrong by exactly
            // that delay — the user's "time is off by a few minutes" symptom.
            // Recompute the real remaining time from the event's start instead.
            // This also fixes local-event notifications, which never persisted
            // reminderMinutes and used to fall back to a hard-coded 5.
            // Use ?? so an explicit 0 ("remind at start time") is preserved.
            let reminderMinutes = eventData.reminderMinutes ?? this.REMINDER_MINUTES;
            const startMs = this.resolveStartTimestamp(eventData, alarmName);
            if (startMs !== null) {
                reminderMinutes = Math.max(0, Math.round((startMs - Date.now()) / 60000));
            }

            // Create the notification
            const notificationId = `reminder_${alarmName}`;

            // Decide the primary button label from the conference type.
            // Legacy compatibility: pre-upgrade reminder data only has `hangoutLink` and no
            // `conferenceType`, so synthesize 'meet' in that case.
            let conferenceType = eventData.conferenceType;
            if (!conferenceType && eventData.hangoutLink) {
                conferenceType = 'meet';
            }

            let primaryLabel;
            if (conferenceType === 'meet') {
                primaryLabel = chrome.i18n.getMessage('joinMeet') || 'Join Meet';
            } else if (conferenceType === 'video') {
                primaryLabel = chrome.i18n.getMessage('joinVideoConference') || 'Join video conference';
            } else {
                primaryLabel = chrome.i18n.getMessage('openSideTimeTable') || 'Open SideTimeTable';
            }

            // Pick a grammatically correct message for the remaining time.
            // When the event is already starting (delivered late, or a
            // remind-at-start-time reminder), "starts in 0 minutes" reads wrong,
            // so use a dedicated "starting now" message; "1 minute" gets its own
            // singular form (the recompute makes a value of 1 common).
            let message;
            if (reminderMinutes <= 0) {
                message = chrome.i18n.getMessage('eventStartingNow', [eventData.title, eventData.startTime])
                    || `"${eventData.title}" is starting now (${eventData.startTime})`;
            } else if (reminderMinutes === 1) {
                message = chrome.i18n.getMessage('startsInOneMinute', [eventData.title, eventData.startTime])
                    || `"${eventData.title}" starts in 1 minute (${eventData.startTime})`;
            } else {
                message = chrome.i18n.getMessage('startsInMinutes', [eventData.title, reminderMinutes.toString(), eventData.startTime])
                    || `"${eventData.title}" starts in ${reminderMinutes} minutes (${eventData.startTime})`;
            }

            // Create the notification with a fallback for icon issues
            const notificationOptions = {
                type: 'basic',
                title: chrome.i18n.getMessage('eventReminder') || 'Event Reminder',
                message: message,
                buttons: [
                    { title: primaryLabel },
                    { title: chrome.i18n.getMessage('dismissNotification') || 'Dismiss' }
                ],
                requireInteraction: true
            };

            try {
                // Try with the icon first
                notificationOptions.iconUrl = chrome.runtime.getURL('src/img/icon48.png');
                await chrome.notifications.create(notificationId, notificationOptions);
            } catch (_iconError) {
                // Fallback: Create the notification without the icon
                delete notificationOptions.iconUrl;
                await chrome.notifications.create(notificationId, notificationOptions);
            }
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
            // First, check date-specific events (stored in local storage)
            const storageKey = `${STORAGE_KEYS.LOCAL_EVENTS_PREFIX}${dateStr}`;
            const result = await chrome.storage.local.get(storageKey);
            const events = result[storageKey] || [];

            let event = events.find(e => e.id === eventId);
            if (event) {
                return event;
            }

            // If not found, check recurring events
            const recurringKey = STORAGE_KEYS.RECURRING_EVENTS;
            const recurringResult = await chrome.storage.sync.get(recurringKey);
            const recurringEvents = recurringResult[recurringKey] || [];

            // Check if the eventId matches a recurring event (could be originalId for instances)
            event = recurringEvents.find(e => e.id === eventId);
            if (event) {
                return event;
            }

            return null;
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
            // Get date-specific events (stored in local storage)
            const storageKey = `${STORAGE_KEYS.LOCAL_EVENTS_PREFIX}${dateStr}`;
            const result = await chrome.storage.local.get(storageKey);
            const dateEvents = result[storageKey] || [];

            // Get recurring events for this date (convert string to Date)
            const targetDate = new Date(dateStr + 'T00:00:00');
            const recurringEvents = await getRecurringEventsForDate(targetDate);

            // Combine all events
            const allEvents = [...recurringEvents, ...dateEvents];

            // Clear the existing reminders for this date first
            await this.clearDateReminders(dateStr);

            // Set the new reminders
            for (const event of allEvents) {
                if (event.reminder) {
                    // For recurring instances, use the original event's ID for the alarm
                    const eventId = event.originalId || event.id;
                    const reminderEvent = { ...event, id: eventId };
                    await this.setReminder(reminderEvent, dateStr);
                }
            }
        } catch (error) {
            console.error('Failed to set date reminders:', error);
        }
    }

    /**
     * Set a reminder for a Google event
     * @param {Object} event The Google event object
     * @param {string} dateStr The date string (YYYY-MM-DD)
     * @param {number} reminderMinutes Minutes before event to remind (optional, defaults to stored value)
     */
    static async setGoogleEventReminder(event, dateStr, reminderMinutes = null) {
        if (!event.start || !event.start.dateTime) {
            return; // Skip all-day events
        }

        // Skip non-meeting event types (out-of-office, focus time, working
        // location). These are status markers, not meetings, so a reminder
        // notification makes no sense and confuses the user.
        if (this.NON_MEETING_EVENT_TYPES.includes(event.eventType)) {
            return;
        }

        try {
            // Get reminder minutes from settings if not provided
            if (reminderMinutes === null) {
                const settings = await chrome.storage.sync.get(['reminderMinutes']);
                reminderMinutes = settings.reminderMinutes ?? this.REMINDER_MINUTES;
            }

            const alarmName = `${this.GOOGLE_ALARM_PREFIX}${dateStr}_${event.id}`;
            const reminderTime = this.calculateGoogleEventReminderTime(event.start.dateTime, reminderMinutes);

            // Only set the alarm for the future times
            if (reminderTime <= Date.now()) {
                return;
            }

            // chrome.alarms.create overwrites any existing alarm with the same
            // name, so create directly. Clearing first would briefly leave the
            // reminder absent, and a late delivery landing in that gap would be
            // lost.
            await chrome.alarms.create(alarmName, {
                when: reminderTime
            });

            // Store the event data for later retrieval. Prefer non-Meet conference URLs
            // (Zoom/Teams/Webex pasted into description) over auto-attached hangoutLink.
            const videoUrl = extractVideoUrl(event);
            const meetUrl = extractMeetUrl(event);
            const conferenceUrl = videoUrl || meetUrl || null;
            const conferenceType = videoUrl ? 'video' : (meetUrl ? 'meet' : null);

            const storageKey = `googleEventData_${alarmName}`;
            await chrome.storage.local.set({
                [storageKey]: {
                    id: event.id,
                    title: event.summary || 'No title',
                    startTime: this.formatTimeFromDateTime(event.start.dateTime),
                    // Absolute start timestamp so the notification can compute the
                    // real remaining time at fire time (Chrome may deliver the alarm late).
                    startTimestamp: new Date(event.start.dateTime).getTime(),
                    dateStr: dateStr,
                    reminderMinutes: reminderMinutes,
                    conferenceUrl: conferenceUrl,
                    conferenceType: conferenceType,
                    htmlLink: event.htmlLink || null
                }
            });
        } catch (error) {
            console.error('Failed to set Google event reminder:', error);
        }
    }

    /**
     * Calculate the reminder time for a Google event
     * @param {string} dateTimeStr ISO 8601 datetime string
     * @param {number} reminderMinutes Minutes before event to remind
     * @returns {number} The reminder timestamp
     */
    static calculateGoogleEventReminderTime(dateTimeStr, reminderMinutes) {
        try {
            const eventDate = new Date(dateTimeStr);
            const reminderTime = new Date(eventDate.getTime() - (reminderMinutes * 60 * 1000));
            return reminderTime.getTime();
        } catch (error) {
            console.error('Error calculating Google event reminder time:', error);
            return Date.now() + (reminderMinutes * 60 * 1000); // Fallback: specified minutes from now
        }
    }

    /**
     * Resolve the absolute start timestamp (ms) for a stored reminder so the
     * notification can show the real remaining time at fire time.
     *
     * - Google events persist `startTimestamp` directly.
     * - Local/recurring events only store `startTime` (HH:mm); the date is
     *   reconstructed from the alarm name (which embeds YYYY-MM-DD).
     *
     * @param {Object} eventData The stored event data
     * @param {string} alarmName The alarm name (contains the date)
     * @returns {number|null} The start timestamp in ms, or null if unresolvable
     */
    static resolveStartTimestamp(eventData, alarmName) {
        if (typeof eventData.startTimestamp === 'number' && Number.isFinite(eventData.startTimestamp)) {
            return eventData.startTimestamp;
        }

        if (!eventData.startTime || typeof alarmName !== 'string') {
            return null;
        }

        const prefix = alarmName.startsWith(this.GOOGLE_ALARM_PREFIX)
            ? this.GOOGLE_ALARM_PREFIX
            : this.ALARM_PREFIX;
        const dateStr = alarmName.replace(prefix, '').split('_')[0];

        const [year, month, day] = dateStr.split('-').map(Number);
        const [hours, minutes] = eventData.startTime.split(':').map(Number);

        if ([year, month, day, hours, minutes].some(n => !Number.isFinite(n))) {
            return null;
        }

        return new Date(year, month - 1, day, hours, minutes, 0).getTime();
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
            // Only timed events get reminders (all-day events are skipped).
            const timedEvents = events.filter(e => e.start && e.start.dateTime);

            // Alarm names we intend to keep / (re)create on this sync.
            const keepNames = new Set(
                timedEvents.map(e => `${this.GOOGLE_ALARM_PREFIX}${dateStr}_${e.id}`)
            );

            // Clear ONLY today's Google reminders whose event no longer exists
            // (deleted / cancelled / declined since the last sync). We must NOT
            // wipe-and-recreate everything: a reminder that is due but not yet
            // delivered (Chrome can deliver alarms late) would be cleared and
            // then skipped on recreate (reminderTime <= now), silently losing
            // the notification.
            const alarms = await chrome.alarms.getAll();
            const stale = alarms.filter(alarm =>
                alarm.name.includes(`${this.GOOGLE_ALARM_PREFIX}${dateStr}_`) &&
                !keepNames.has(alarm.name)
            );
            for (const alarm of stale) {
                await chrome.alarms.clear(alarm.name);
                await chrome.storage.local.remove(`googleEventData_${alarm.name}`);
            }

            // (Re)create reminders for current events. setGoogleEventReminder
            // overwrites the same-named alarm, so a still-valid reminder is
            // never absent.
            for (const event of timedEvents) {
                await this.setGoogleEventReminder(event, dateStr);
            }
        } catch (error) {
            console.error('Failed to set Google event reminders:', error);
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