/**
 * GoogleEventUtils - Pure helpers for creating Google Calendar events
 *
 * DOM-free functions shared by the create modal (event resource construction)
 * and the side panel controller (writable-calendar filtering). Keeping these
 * pure makes the create-event path unit-testable without a DOM.
 */
import { buildRfc3339DateTime, isSameDay } from './time-utils.js';

// Event types that must never be edited or deleted from the panel
const NON_EDITABLE_EVENT_TYPES = ['outOfOffice', 'focusTime', 'workingLocation'];

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
 * Whether a Google event can be edited/deleted from the panel.
 *
 * Requires ALL of:
 * - a writable (owner/writer) calendar (`isWritableCalendar` flag stamped at fetch)
 * - id + calendarId (needed to address the PATCH/DELETE)
 * - a timed event (`start.dateTime` and `end.dateTime`; excludes all-day and
 *   endTimeUnspecified events)
 * - start and end on the same local calendar date (the edit form only exposes
 *   HH:MM inputs, so a cross-midnight event could never be saved — don't offer it)
 * - not part of a recurring series (instance or master)
 * - a plain event type (not out-of-office / focus time / working location)
 * - the user may actually modify it: the event is organized by the calendar it
 *   sits on (`organizer.self`) or guests are allowed to modify
 *   (`guestsCanModify`). Received invites fail this and would 403 on save.
 *
 * @param {Object} event - Event as fetched by the panel (API shape + panel flags)
 * @returns {boolean}
 */
export function isEditableGoogleEvent(event) {
    if (!(
        event &&
        event.isWritableCalendar &&
        event.id &&
        event.calendarId &&
        event.start?.dateTime &&
        event.end?.dateTime &&
        !event.recurringEventId &&
        !event.recurrence &&
        !NON_EDITABLE_EVENT_TYPES.includes(event.eventType)
    )) {
        return false;
    }

    const start = new Date(event.start.dateTime);
    const end = new Date(event.end.dateTime);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || !isSameDay(start, end)) {
        return false;
    }

    // organizer.self is true when the event is organized by the calendar this
    // copy sits on (own events, shared-calendar events); false on invite copies.
    return event.organizer?.self === true || event.guestsCanModify === true;
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
 * @param {number|string|null} [fields.reminderMinutes] - Popup reminder lead time
 *   in minutes. Insert mode: blank/null/undefined omits `reminders` (calendar
 *   default applies). Patch mode: `undefined` omits `reminders` entirely so the
 *   event's existing reminders (including email or multiple overrides) are left
 *   untouched — pass it ONLY when the user actually changed the selection;
 *   blank/null reverts explicitly to {useDefault: true}. A non-numeric or
 *   negative value is ignored (treated as "no change") in both modes.
 * @param {Object} [options]
 * @param {boolean} [options.forPatch=false] - Build a body for events.patch
 *   instead of events.insert. PATCH leaves omitted fields unchanged, so this
 *   mode emits explicit '' for blank description/location (clearing them)
 *   and never emits conferenceData (Meet is not editable).
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

    if (reminderMinutes !== undefined && reminderMinutes !== null && reminderMinutes !== '') {
        const minutes = Number(reminderMinutes);
        if (Number.isFinite(minutes) && minutes >= 0) {
            resource.reminders = {
                useDefault: false,
                overrides: [{ method: 'popup', minutes }]
            };
        }
        // Non-numeric/negative: fall through without touching reminders.
    } else if (forPatch && reminderMinutes !== undefined) {
        // Explicit blank in patch mode reverts to the calendar default.
        // (undefined means "not changed" — omit so existing overrides,
        // including email or multiple reminders, are preserved.)
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
