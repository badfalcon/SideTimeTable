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
 * @returns {Object} A Google Calendar event resource ({summary, start, end, ...})
 */
export function buildGoogleEventResource({ summary, description, location, date, startTime, endTime, addMeet, meetRequestId }) {
    const resource = {
        summary: (summary || '').trim(),
        start: { dateTime: buildRfc3339DateTime(date, startTime) },
        end: { dateTime: buildRfc3339DateTime(date, endTime) }
    };

    const trimmedDescription = (description || '').trim();
    if (trimmedDescription) {
        resource.description = trimmedDescription;
    }

    const trimmedLocation = (location || '').trim();
    if (trimmedLocation) {
        resource.location = trimmedLocation;
    }

    if (addMeet) {
        const requestId = meetRequestId
            || `meet-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        resource.conferenceData = {
            createRequest: {
                requestId,
                conferenceSolutionKey: { type: 'hangoutsMeet' }
            }
        };
    }

    return resource;
}
