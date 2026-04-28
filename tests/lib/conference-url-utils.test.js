/**
 * Tests for conference-url-utils
 */
import {
    extractMeetUrl,
    extractVideoUrl,
    selectNotificationUrl,
} from '../../src/lib/conference-url-utils.js';

describe('extractMeetUrl', () => {
    test('hangoutLink direct', () => {
        expect(extractMeetUrl({ hangoutLink: 'https://meet.google.com/abc-defg-hij' }))
            .toBe('https://meet.google.com/abc-defg-hij');
    });

    test('conferenceData entryPoints (video)', () => {
        const event = {
            conferenceData: {
                entryPoints: [
                    { entryPointType: 'phone', uri: 'tel:+1234' },
                    { entryPointType: 'video', uri: 'https://meet.google.com/xyz-pqrs-uvw' },
                ]
            }
        };
        expect(extractMeetUrl(event)).toBe('https://meet.google.com/xyz-pqrs-uvw');
    });

    test('Meet URL pasted in description', () => {
        expect(extractMeetUrl({ description: 'Click https://meet.google.com/aaa-bbbb-ccc here' }))
            .toBe('https://meet.google.com/aaa-bbbb-ccc');
    });

    test('Meet URL pasted in location', () => {
        expect(extractMeetUrl({ location: 'https://meet.google.com/loc-test-xyz' }))
            .toBe('https://meet.google.com/loc-test-xyz');
    });

    test('returns null when no Meet URL', () => {
        expect(extractMeetUrl({ description: 'No conference link here' })).toBeNull();
    });

    test('returns null for empty event', () => {
        expect(extractMeetUrl({})).toBeNull();
    });
});

describe('extractVideoUrl', () => {
    test('Zoom URL in description', () => {
        expect(extractVideoUrl({ description: 'Join: https://us02web.zoom.us/j/12345' }))
            .toBe('https://us02web.zoom.us/j/12345');
    });

    test('Teams URL in description', () => {
        expect(extractVideoUrl({ description: 'https://teams.microsoft.com/l/meetup-join/abc' }))
            .toBe('https://teams.microsoft.com/l/meetup-join/abc');
    });

    test('Webex URL in location', () => {
        expect(extractVideoUrl({ location: 'https://company.webex.com/meet/room1' }))
            .toBe('https://company.webex.com/meet/room1');
    });

    test('HTML-encoded ampersand in Zoom URL is decoded', () => {
        const event = {
            description: 'Join https://us02web.zoom.us/j/1?pwd=a&amp;tk=b end'
        };
        expect(extractVideoUrl(event)).toBe('https://us02web.zoom.us/j/1?pwd=a&tk=b');
    });

    test('Zoom URL inside HTML anchor stops at quote', () => {
        const event = {
            description: '<a href="https://zoom.us/j/777">click</a>'
        };
        expect(extractVideoUrl(event)).toBe('https://zoom.us/j/777');
    });

    test('does not greedily span multiple Zoom URLs', () => {
        const event = {
            description: 'Visit https://zoom.us/j/AAA and https://zoom.us/j/BBB'
        };
        expect(extractVideoUrl(event)).toBe('https://zoom.us/j/AAA');
    });

    test('strips trailing sentence punctuation', () => {
        expect(extractVideoUrl({ description: 'Use https://zoom.us/j/123.' }))
            .toBe('https://zoom.us/j/123');
        expect(extractVideoUrl({ description: 'See https://zoom.us/j/456, and reply.' }))
            .toBe('https://zoom.us/j/456');
        expect(extractVideoUrl({ description: 'リンク: https://zoom.us/j/789。' }))
            .toBe('https://zoom.us/j/789');
        expect(extractVideoUrl({ description: 'click https://zoom.us/j/abc!' }))
            .toBe('https://zoom.us/j/abc');
        expect(extractVideoUrl({ description: 'try https://zoom.us/j/qq?' }))
            .toBe('https://zoom.us/j/qq');
        expect(extractVideoUrl({ description: 'see https://zoom.us/j/sc;' }))
            .toBe('https://zoom.us/j/sc');
        expect(extractVideoUrl({ description: 'リンク https://zoom.us/j/jp、続きあり' }))
            .toBe('https://zoom.us/j/jp');
    });

    test('decodes numeric HTML entities', () => {
        expect(extractVideoUrl({ description: 'https://zoom.us/j/1?pwd=a&#38;b' }))
            .toBe('https://zoom.us/j/1?pwd=a&b');
        expect(extractVideoUrl({ description: 'https://zoom.us/j/1?pwd=a&#x26;b' }))
            .toBe('https://zoom.us/j/1?pwd=a&b');
        expect(extractVideoUrl({ description: 'https://zoom.us/j/1?pwd=a&#X26;b' }))
            .toBe('https://zoom.us/j/1?pwd=a&b');
    });

    test('multi-line description with URL on its own line', () => {
        const event = { description: 'Agenda:\nhttps://zoom.us/j/777\nSee you there' };
        expect(extractVideoUrl(event)).toBe('https://zoom.us/j/777');
    });

    test('does not falsely match zoom.usa.example.com', () => {
        // The slash after zoom.us in the regex prevents matching subdomains containing zoom.usa
        expect(extractVideoUrl({ description: 'https://zoom.usa.example.com/foo' })).toBeNull();
    });

    test('returns null when no video URL', () => {
        expect(extractVideoUrl({ description: 'Just text', location: 'Conference Room' })).toBeNull();
    });

    test('does not match Meet URL', () => {
        expect(extractVideoUrl({ description: 'https://meet.google.com/abc-defg-hij' })).toBeNull();
    });

    test('returns null for empty event', () => {
        expect(extractVideoUrl({})).toBeNull();
    });
});

describe('selectNotificationUrl', () => {
    test('prefers conferenceUrl when set', () => {
        expect(selectNotificationUrl({
            conferenceUrl: 'https://us02web.zoom.us/j/1',
            hangoutLink: 'https://meet.google.com/old',
            htmlLink: 'https://calendar.google.com/...',
        })).toBe('https://us02web.zoom.us/j/1');
    });

    test('falls back to hangoutLink for legacy data', () => {
        expect(selectNotificationUrl({
            hangoutLink: 'https://meet.google.com/legacy',
            htmlLink: 'https://calendar.google.com/...',
        })).toBe('https://meet.google.com/legacy');
    });

    test('falls back to htmlLink when no conference link', () => {
        expect(selectNotificationUrl({
            htmlLink: 'https://calendar.google.com/event?id=abc',
        })).toBe('https://calendar.google.com/event?id=abc');
    });

    test('returns null for empty object', () => {
        expect(selectNotificationUrl({})).toBeNull();
    });

    test('returns null for null/undefined input', () => {
        expect(selectNotificationUrl(null)).toBeNull();
        expect(selectNotificationUrl(undefined)).toBeNull();
    });
});
