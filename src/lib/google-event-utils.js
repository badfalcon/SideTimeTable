/**
 * GoogleEventUtils - Pure helpers for creating Google Calendar events
 *
 * DOM-free functions shared by the create modal (event resource construction)
 * and the side panel controller (writable-calendar filtering). Keeping these
 * pure makes the create-event path unit-testable without a DOM.
 */
import { buildRfc3339DateTime } from './time-utils.js';

/**
 * Whether a calendar can have events written to it.
 * Google exposes accessRole values: owner, writer, reader, freeBusyReader.
 * Only owner and writer permit events.insert.
 *
 * @param {{accessRole?: string}} calendar
 * @returns {boolean}
 */
export function isWritableCalendar(calendar) {
    return !!calendar && (calendar.accessRole === 'owner' || calendar.accessRole === 'writer');
}

/**
 * Filter a calendar list down to those the user can write to.
 * When `selectedIds` is provided, further restrict to calendars that are also
 * in the currently-displayed set — so an event created here is guaranteed to
 * appear on the timeline (which only renders selected calendars).
 *
 * @param {Array<{id?: string, accessRole?: string}>} calendars
 * @param {Array<string>|null} [selectedIds] - IDs of currently-displayed calendars
 * @returns {Array} The writable (and, if given, displayed) subset
 */
export function filterWritableCalendars(calendars, selectedIds = null) {
    const writable = Array.isArray(calendars) ? calendars.filter(isWritableCalendar) : [];
    if (!Array.isArray(selectedIds)) {
        return writable;
    }
    const selected = new Set(selectedIds);
    return writable.filter(cal => selected.has(cal.id));
}

/**
 * Build a Google Calendar API event resource from form fields.
 * Optional fields (description, location) are omitted when blank so the
 * request body stays minimal.
 *
 * When `addMeet` is true, a `conferenceData.createRequest` for Google Meet is
 * attached — the caller must then send the insert with `conferenceDataVersion=1`
 * (see GoogleCalendarClient.createEvent, which detects `conferenceData`).
 *
 * @param {Object} fields
 * @param {string} fields.summary - Event title (required)
 * @param {Date} fields.date - The date the event is on
 * @param {string} fields.startTime - Start time "HH:MM" (required)
 * @param {string} fields.endTime - End time "HH:MM" (required)
 * @param {string} [fields.description]
 * @param {string} [fields.location]
 * @param {boolean} [fields.addMeet] - Attach a Google Meet conference
 * @param {string} [fields.meetRequestId] - Unique id for the Meet create request
 *   (generated when omitted; injectable for tests)
 * @param {number|string|null} [fields.reminderMinutes] - Popup reminder lead time in
 *   minutes; blank/null uses the calendar's default reminders
 * @param {Object} [options]
 * @param {boolean} [options.forPatch=false] - Build a body for events.patch
 *   instead of events.insert. PATCH leaves omitted fields unchanged, so this
 *   mode emits explicit '' for blank description/location (clearing them),
 *   maps a blank reminder to {useDefault: true} (reverting to the calendar
 *   default), and never emits conferenceData (Meet is not editable).
 * @returns {Object} A Google Calendar event resource ({summary, start, end, ...})
 */
export function buildGoogleEventResource({ summary, description, location, date, startTime, endTime, addMeet, meetRequestId, reminderMinutes }, { forPatch = false } = {}) {
    const resource = {
        summary: (summary || '').trim(),
        start: { dateTime: buildRfc3339DateTime(date, startTime) },
        end: { dateTime: buildRfc3339DateTime(date, endTime) }
    };

    const trimmedDescription = (description || '').trim();
    if (trimmedDescription || forPatch) {
        resource.description = trimmedDescription;
    }

    const trimmedLocation = (location || '').trim();
    if (trimmedLocation || forPatch) {
        resource.location = trimmedLocation;
    }

    if (addMeet && !forPatch) {
        const requestId = meetRequestId
            || `meet-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        resource.conferenceData = {
            createRequest: {
                requestId,
                conferenceSolutionKey: { type: 'hangoutsMeet' }
            }
        };
    }

    const hasReminder = reminderMinutes !== undefined && reminderMinutes !== null && reminderMinutes !== '';
    if (hasReminder) {
        const minutes = Number(reminderMinutes);
        if (Number.isFinite(minutes) && minutes >= 0) {
            resource.reminders = {
                useDefault: false,
                overrides: [{ method: 'popup', minutes }]
            };
        }
    } else if (forPatch) {
        // Insert can just omit reminders, but PATCH must explicitly revert to
        // the calendar default or a previous override would stick.
        resource.reminders = { useDefault: true };
    }

    return resource;
}

/**
 * Extract a local "HH:MM" wall-clock time from an RFC3339 dateTime string,
 * for prefilling time inputs when editing an event.
 *
 * @param {string|null|undefined} dateTimeString - e.g. "2026-07-23T09:05:00+09:00";
 *   falsy for all-day events (which have start.date instead of start.dateTime)
 * @returns {string} "HH:MM" in the local timezone, or '' when absent/unparseable
 */
export function extractTimeHHMM(dateTimeString) {
    if (!dateTimeString) {
        return '';
    }
    const parsed = new Date(dateTimeString);
    if (Number.isNaN(parsed.getTime())) {
        return '';
    }
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`;
}
