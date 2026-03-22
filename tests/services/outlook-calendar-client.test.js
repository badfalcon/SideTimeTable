/**
 * Tests for OutlookCalendarClient internal methods
 *
 * Tests _normalizeEvent and _toISOWithTimezone as pure-function-like methods
 * by instantiating OutlookCalendarClient and calling them directly.
 */
import { OutlookCalendarClient } from '../../src/services/outlook-calendar-client.js';

describe('OutlookCalendarClient', () => {
    let client;

    beforeEach(() => {
        client = new OutlookCalendarClient();
    });

    describe('_toISOWithTimezone', () => {
        test('returns dateTime with Z suffix as-is', () => {
            const result = client._toISOWithTimezone('2025-03-21T09:00:00Z', 'UTC');
            expect(result).toBe('2025-03-21T09:00:00Z');
        });

        test('returns dateTime with offset as-is', () => {
            const result = client._toISOWithTimezone('2025-03-21T09:00:00+09:00', 'Asia/Tokyo');
            expect(result).toBe('2025-03-21T09:00:00+09:00');
        });

        test('converts UTC timezone correctly', () => {
            const result = client._toISOWithTimezone('2025-03-21T09:00:00.0000000', 'UTC');
            expect(result).toBe('2025-03-21T09:00:00.000Z');
        });

        test('converts IANA timezone name (Asia/Tokyo = UTC+9)', () => {
            const result = client._toISOWithTimezone('2025-03-21T09:00:00.0000000', 'Asia/Tokyo');
            // 09:00 JST = 00:00 UTC
            expect(result).toBe('2025-03-21T00:00:00.000Z');
        });

        test('converts Windows timezone name (Tokyo Standard Time)', () => {
            const result = client._toISOWithTimezone('2025-03-21T18:00:00.0000000', 'Tokyo Standard Time');
            // 18:00 JST = 09:00 UTC
            expect(result).toBe('2025-03-21T09:00:00.000Z');
        });

        test('converts Eastern Standard Time', () => {
            // EST is UTC-5 in winter (March 21 2025 is after DST switch, so EDT = UTC-4)
            const result = client._toISOWithTimezone('2025-03-21T12:00:00.0000000', 'Eastern Standard Time');
            // After DST switch (March 9, 2025), Eastern = UTC-4
            // 12:00 EDT = 16:00 UTC
            expect(result).toBe('2025-03-21T16:00:00.000Z');
        });

        test('handles datetime without fractional seconds', () => {
            const result = client._toISOWithTimezone('2025-03-21T09:00:00', 'UTC');
            expect(result).toBe('2025-03-21T09:00:00.000Z');
        });

        test('falls back to Z suffix for unknown timezone', () => {
            const result = client._toISOWithTimezone('2025-03-21T09:00:00', 'Unknown/Timezone');
            // Should fall back to treating as UTC
            expect(result).toContain('2025-03-21');
            expect(result).toContain('Z');
        });

        test('handles negative UTC offset timezone', () => {
            const result = client._toISOWithTimezone('2025-03-21T09:00:00.0000000', 'Pacific Standard Time');
            // March 21 = PDT (UTC-7)
            // 09:00 PDT = 16:00 UTC
            expect(result).toBe('2025-03-21T16:00:00.000Z');
        });

        test('handles DST Fall Back (November, EST UTC-5)', () => {
            // November 2, 2025 is after Fall Back (Nov 2 at 2:00 AM)
            // Eastern = EST = UTC-5
            const result = client._toISOWithTimezone('2025-11-03T10:00:00.0000000', 'Eastern Standard Time');
            // 10:00 EST = 15:00 UTC
            expect(result).toBe('2025-11-03T15:00:00.000Z');
        });

        test('handles DST Spring Forward day (March, EDT UTC-4)', () => {
            // March 9, 2025 is Spring Forward day for US Eastern
            // After 2:00 AM, Eastern = EDT = UTC-4
            const result = client._toISOWithTimezone('2025-03-09T14:00:00.0000000', 'Eastern Standard Time');
            // 14:00 EDT = 18:00 UTC
            expect(result).toBe('2025-03-09T18:00:00.000Z');
        });

        test('handles pre-DST date (January, EST UTC-5)', () => {
            // January is firmly in EST (UTC-5)
            const result = client._toISOWithTimezone('2025-01-15T12:00:00.0000000', 'Eastern Standard Time');
            // 12:00 EST = 17:00 UTC
            expect(result).toBe('2025-01-15T17:00:00.000Z');
        });

        test('handles DST in non-US timezone (W. Europe Standard Time)', () => {
            // October 26, 2025 is after Fall Back for Europe (last Sunday of October)
            // W. Europe = CET = UTC+1
            const result = client._toISOWithTimezone('2025-10-27T09:00:00.0000000', 'W. Europe Standard Time');
            // 09:00 CET = 08:00 UTC
            expect(result).toBe('2025-10-27T08:00:00.000Z');
        });
    });

    describe('_normalizeEvent', () => {
        const makeOutlookEvent = (overrides = {}) => ({
            id: 'test-event-id',
            subject: 'Test Meeting',
            bodyPreview: 'Meeting description',
            isAllDay: false,
            start: { dateTime: '2025-03-21T09:00:00.0000000', timeZone: 'UTC' },
            end: { dateTime: '2025-03-21T10:00:00.0000000', timeZone: 'UTC' },
            location: { displayName: 'Room A' },
            webLink: 'https://outlook.com/event/123',
            onlineMeeting: { joinUrl: 'https://teams.microsoft.com/meet/123' },
            isOrganizer: true,
            isCancelled: false,
            responseStatus: { response: 'organizer' },
            attendees: [],
            categories: [],
            organizer: { emailAddress: { address: 'user@example.com', name: 'Test User' } },
            ...overrides
        });

        test('normalizes basic event fields', () => {
            const result = client._normalizeEvent(makeOutlookEvent(), 'cal-1', '#0078d4');

            expect(result.id).toBe('test-event-id');
            expect(result.summary).toBe('Test Meeting');
            expect(result.description).toBe('Meeting description');
            expect(result.location).toBe('Room A');
            expect(result.htmlLink).toBe('https://outlook.com/event/123');
            expect(result.hangoutLink).toBe('https://teams.microsoft.com/meet/123');
            expect(result.provider).toBe('outlook');
            expect(result.eventType).toBe('default');
        });

        test('converts timed event datetime', () => {
            const result = client._normalizeEvent(makeOutlookEvent(), 'cal-1', '#0078d4');

            expect(result.start.dateTime).toBe('2025-03-21T09:00:00.000Z');
            expect(result.end.dateTime).toBe('2025-03-21T10:00:00.000Z');
            expect(result.start.date).toBeUndefined();
        });

        test('converts all-day event', () => {
            const event = makeOutlookEvent({
                isAllDay: true,
                start: { dateTime: '2025-03-21T00:00:00.0000000', timeZone: 'UTC' },
                end: { dateTime: '2025-03-22T00:00:00.0000000', timeZone: 'UTC' }
            });
            const result = client._normalizeEvent(event, 'cal-1', '#0078d4');

            expect(result.start.date).toBe('2025-03-21');
            expect(result.end.date).toBe('2025-03-22');
            expect(result.start.dateTime).toBeUndefined();
        });

        test('maps response status correctly', () => {
            const accepted = client._normalizeEvent(
                makeOutlookEvent({ responseStatus: { response: 'accepted' } }), 'cal-1', '#0078d4'
            );
            expect(accepted._responseStatus).toBe('accepted');

            const declined = client._normalizeEvent(
                makeOutlookEvent({ responseStatus: { response: 'declined' } }), 'cal-1', '#0078d4'
            );
            expect(declined._responseStatus).toBe('declined');

            const tentative = client._normalizeEvent(
                makeOutlookEvent({ responseStatus: { response: 'tentativelyAccepted' } }), 'cal-1', '#0078d4'
            );
            expect(tentative._responseStatus).toBe('tentative');

            const organizer = client._normalizeEvent(
                makeOutlookEvent({ responseStatus: { response: 'organizer' } }), 'cal-1', '#0078d4'
            );
            expect(organizer._responseStatus).toBe('accepted');
        });

        test('detects cancelled events', () => {
            const result = client._normalizeEvent(
                makeOutlookEvent({ isCancelled: true }), 'cal-1', '#0078d4'
            );
            expect(result.status).toBe('cancelled');
        });

        test('uses calendar color for event background', () => {
            const result = client._normalizeEvent(makeOutlookEvent(), 'cal-1', '#ff0000');
            expect(result.calendarBackgroundColor).toBe('#ff0000');
        });

        test('defaults summary for events without subject', () => {
            const result = client._normalizeEvent(
                makeOutlookEvent({ subject: null }), 'cal-1', '#0078d4'
            );
            expect(result.summary).toBe('(No title)');
        });

        test('marks self attendee for organizer', () => {
            const event = makeOutlookEvent({
                isOrganizer: true,
                organizer: { emailAddress: { address: 'user@example.com', name: 'User' } },
                attendees: [
                    { emailAddress: { address: 'user@example.com', name: 'User' }, status: { response: 'organizer' } },
                    { emailAddress: { address: 'other@example.com', name: 'Other' }, status: { response: 'accepted' } }
                ]
            });
            const result = client._normalizeEvent(event, 'cal-1', '#0078d4');

            expect(result.attendees[0].self).toBe(true);
            expect(result.attendees[1].self).toBe(false);
        });

        test('handles missing optional fields gracefully', () => {
            const minimal = {
                id: 'min-id',
                subject: 'Min',
                isAllDay: false,
                start: { dateTime: '2025-03-21T09:00:00Z', timeZone: 'UTC' },
                end: { dateTime: '2025-03-21T10:00:00Z', timeZone: 'UTC' }
            };
            const result = client._normalizeEvent(minimal, null, '#0078d4');

            expect(result.description).toBe('');
            expect(result.location).toBe('');
            expect(result.htmlLink).toBe('');
            expect(result.hangoutLink).toBe('');
            expect(result.attendees).toEqual([]);
        });
    });

    describe('_mapCalendarColor', () => {
        test('maps known color names', () => {
            expect(client._mapCalendarColor('lightBlue')).toBe('#69afe5');
            expect(client._mapCalendarColor('lightGreen')).toBe('#7bd148');
            expect(client._mapCalendarColor('lightRed')).toBe('#dc2127');
            expect(client._mapCalendarColor('auto')).toBe('#0078d4');
        });

        test('returns default for unknown color', () => {
            expect(client._mapCalendarColor('unknownColor')).toBe('#0078d4');
            expect(client._mapCalendarColor(undefined)).toBe('#0078d4');
            expect(client._mapCalendarColor(null)).toBe('#0078d4');
        });
    });
});
