/**
 * Tests for GoogleEventContentBuilder:
 * - formatEventTime() date display
 * - setMeetInfo() rendering order
 */
import '../../src/lib/locale-utils.js';
import { GoogleEventContentBuilder } from '../../src/side_panel/components/modals/google-event-content-builder.js';

function setNavigatorLanguage(lang) {
  Object.defineProperty(globalThis, 'navigator', {
    value: { language: lang },
    configurable: true,
    writable: true,
  });
}

const MESSAGES = {
  allDay: 'All day',
  allDayDateRange: '$1 – $2 ($3 days)',
  noTimeInfo: 'No time info',
  timeInfoError: 'Time info error',
};

describe('GoogleEventContentBuilder.formatEventTime', () => {
  let builder;
  const now = new Date(2026, 8, 30);
  const EN = { locale: 'en', timeFormat: '12h', now };
  const JA = { locale: 'ja', timeFormat: '24h', now };

  beforeEach(() => {
    window.getLocalizedMessage = (key) => MESSAGES[key] || key;
    setNavigatorLanguage('en-US');
    builder = new GoogleEventContentBuilder();
  });

  afterEach(() => {
    delete global.window.getLocalizedMessage;
  });

  function timedEvent(start, end) {
    return { start: { dateTime: start }, end: { dateTime: end } };
  }

  describe('all-day events', () => {
    test('single all-day event: the header-style date and "All day"', () => {
      const event = { start: { date: '2026-06-01' }, end: { date: '2026-06-02' } };
      expect(builder.formatEventTime(event, EN)).toBe('Mon, Jun 1, All day');
      expect(builder.formatEventTime(event, JA)).toBe('6月1日(月) All day');
    });

    test('multi-day all-day event shows the first and last day', () => {
      const result = builder.formatEventTime({
        start: { date: '2026-06-01' },
        end: { date: '2026-06-04' }, // exclusive end → last day is 06/03
      }, EN);
      expect(result).toBe('Mon, Jun 1 – Wed, Jun 3 (3 days)');
    });

    test('a day in another year shows the year', () => {
      const result = builder.formatEventTime({ start: { date: '2027-01-05' }, end: { date: '2027-01-06' } }, JA);
      expect(result).toBe('2027年1月5日(火) All day');
    });
  });

  describe('timed events', () => {
    test('same-day event: the date once, then the range like the event blocks', () => {
      const event = timedEvent('2026-07-22T09:00:00', '2026-07-22T10:00:00');
      expect(builder.formatEventTime(event, EN)).toBe('Wed, Jul 22, 9:00–10:00 AM');
      expect(builder.formatEventTime(event, JA)).toBe('7月22日(水) 09:00–10:00');
    });

    test('event ending exactly at midnight is treated as same-day', () => {
      const result = builder.formatEventTime(timedEvent('2026-07-22T23:00:00', '2026-07-23T00:00:00'), JA);
      expect(result).toBe('7月22日(水) 23:00–00:00');
    });

    test('event spanning past midnight shows both dates', () => {
      const result = builder.formatEventTime(timedEvent('2026-07-22T23:00:00', '2026-07-23T01:00:00'), EN);
      expect(result).toBe('Wed, Jul 22, 11:00 PM – Thu, Jul 23, 1:00 AM');
    });

    test('zero-duration event shows one date', () => {
      const result = builder.formatEventTime(timedEvent('2026-07-22T09:00:00', '2026-07-22T09:00:00'), JA);
      expect(result).toBe('7月22日(水) 09:00–09:00');
    });

    test('follows the extension language and time format, not the browser', () => {
      setNavigatorLanguage('en-GB');
      const result = builder.formatEventTime(timedEvent('2026-07-22T13:00:00', '2026-07-22T14:30:00'), { locale: 'ja', timeFormat: '12h', now });
      expect(result).toBe('7月22日(水) 午後1:00–2:30');
    });
  });

  test('missing time info returns the localized fallback', () => {
    const result = builder.formatEventTime({ start: {}, end: {} }, EN);
    expect(result).toBe('No time info');
  });
});

/**
 * setMeetInfo() rendering order tests.
 *
 * Locks in that the non-Meet video link is rendered before the Meet link
 * when both are present, matching the notification button priority
 * (video > meet) in alarm-manager / selectNotificationUrl.
 */
function makeMockElement() {
    const children = [];
    return {
        tagName: 'DIV',
        className: '',
        style: { cssText: '' },
        href: '',
        target: '',
        textContent: '',
        children,
        innerHTML: '',
        appendChild(child) { children.push(child); return child; },
        setAttribute(name, value) { this[`attr:${name}`] = value; },
        getAttribute(name) { return this[`attr:${name}`]; },
    };
}

/** Concatenated text of a mock element tree. */
function textOf(el) {
    return (el.textContent || '') + el.children.map(textOf).join('');
}

describe('GoogleEventContentBuilder.setMeetInfo render order', () => {
    beforeEach(() => {
        global.document = {
            createElement: () => makeMockElement(),
        };
        global.window.getLocalizedMessage = (key) => key;
    });

    afterEach(() => {
        delete global.document;
        delete global.window.getLocalizedMessage;
    });

    test('renders non-Meet video link before Meet link when both exist', () => {
        const builder = new GoogleEventContentBuilder();
        const meetElement = makeMockElement();

        const shown = builder.setMeetInfo(meetElement, {
            hangoutLink: 'https://meet.google.com/abc-defg-hij',
            description: 'Backup: https://us02web.zoom.us/j/42',
        });

        // One join button per call: [video, meet]
        expect(shown).toBe(true);
        expect(meetElement.children).toHaveLength(2);
        expect(meetElement.children[0].href).toBe('https://us02web.zoom.us/j/42');
        expect(meetElement.children[1].href).toBe('https://meet.google.com/abc-defg-hij');
    });

    test('renders only video link when no Meet URL', () => {
        const builder = new GoogleEventContentBuilder();
        const meetElement = makeMockElement();

        builder.setMeetInfo(meetElement, {
            description: 'https://us02web.zoom.us/j/77',
        });

        expect(meetElement.children).toHaveLength(1);
        expect(meetElement.children[0].href).toBe('https://us02web.zoom.us/j/77');
    });

    test('renders only Meet link when no other video URL', () => {
        const builder = new GoogleEventContentBuilder();
        const meetElement = makeMockElement();

        builder.setMeetInfo(meetElement, {
            hangoutLink: 'https://meet.google.com/abc-defg-hij',
        });

        expect(meetElement.children).toHaveLength(1);
        expect(meetElement.children[0].href).toBe('https://meet.google.com/abc-defg-hij');
    });

    test('renders nothing when no conference URL', () => {
        const builder = new GoogleEventContentBuilder();
        const meetElement = makeMockElement();

        const shown = builder.setMeetInfo(meetElement, { description: 'No links here' });

        expect(shown).toBe(false);
        expect(meetElement.children).toHaveLength(0);
    });

    test('each button names where it goes: the Meet code, or the host', () => {
        const builder = new GoogleEventContentBuilder();
        const meetElement = makeMockElement();

        builder.setMeetInfo(meetElement, {
            hangoutLink: 'https://meet.google.com/abc-defg-hij',
            description: 'Backup: https://www.zoom.us/j/42',
        });

        expect(textOf(meetElement.children[0])).toContain('zoom.us');
        expect(textOf(meetElement.children[0])).not.toContain('www.');
        expect(textOf(meetElement.children[1])).toContain('abc-defg-hij');
    });
});

describe('GoogleEventContentBuilder.setAttendeesInfo', () => {
    const MESSAGES = {
        guestCountOne: '1 guest',
        guestCountMany: '$1 guests',
        guestSummaryYes: '$1 yes',
        guestSummaryNo: '$1 no',
        guestSummaryMaybe: '$1 maybe',
        guestSummaryAwaiting: '$1 awaiting',
        organizer: 'Organizer',
    };

    beforeEach(() => {
        global.document = { createElement: () => makeMockElement() };
        global.window.getLocalizedMessage = (key) => MESSAGES[key] || key;
    });

    afterEach(() => {
        delete global.document;
        delete global.window.getLocalizedMessage;
    });

    const guests = (...statuses) => statuses.map((responseStatus, i) => ({
        email: `g${i}@x`, displayName: `Guest ${i}`, responseStatus,
    }));

    function render(event) {
        const container = makeMockElement();
        const shown = new GoogleEventContentBuilder().setAttendeesInfo(container, event, 'list');
        return { shown, container };
    }

    // container → [headerRow, list]; headerRow → [icon, toggle]; toggle → [count, breakdown, chevron]
    const toggleOf = (container) => container.children[0].children[1];
    const listOf = (container) => container.children[1];

    test('summarizes the count and each non-zero response, in Google order', () => {
        const { container } = render({ attendees: guests('accepted', 'accepted', 'tentative', 'needsAction') });
        const [count, breakdown] = toggleOf(container).children;
        expect(count.textContent).toBe('4 guests');
        expect(breakdown.textContent).toBe('2 yes · 1 maybe · 1 awaiting');
    });

    test('uses the singular for one guest', () => {
        const { container } = render({ attendees: guests('declined') });
        expect(toggleOf(container).children[0].textContent).toBe('1 guest');
        expect(toggleOf(container).children[1].textContent).toBe('1 no');
    });

    test('an unknown response status counts as awaiting', () => {
        const { container } = render({ attendees: guests(undefined) });
        expect(toggleOf(container).children[1].textContent).toBe('1 awaiting');
    });

    test('a short list starts open, a long one folded', () => {
        const short = render({ attendees: guests('accepted', 'accepted', 'accepted') }).container;
        expect(toggleOf(short).getAttribute('aria-expanded')).toBe('true');
        expect(listOf(short).hidden).toBe(false);

        const long = render({ attendees: guests('accepted', 'accepted', 'accepted', 'accepted') }).container;
        expect(toggleOf(long).getAttribute('aria-expanded')).toBe('false');
        expect(listOf(long).hidden).toBe(true);
        expect(toggleOf(long).getAttribute('aria-controls')).toBe('list');
    });

    test('lists the organizer first with a badge, and skips resources', () => {
        const { container } = render({
            attendees: [
                { email: 'a@x', displayName: 'Guest', responseStatus: 'accepted' },
                { email: 'room@x', displayName: 'Room B', resource: true, responseStatus: 'accepted' },
                { email: 'o@x', displayName: 'Host', organizer: true, responseStatus: 'accepted' },
            ],
        });
        const items = listOf(container).children;
        expect(items).toHaveLength(2);
        expect(textOf(items[0])).toContain('Host');
        expect(textOf(items[0])).toContain('Organizer');
        expect(textOf(items[1])).not.toContain('Organizer');
    });

    test('shows nothing without real attendees', () => {
        expect(render({ attendees: [{ email: 'room@x', resource: true }] }).shown).toBe(false);
        expect(render({}).shown).toBe(false);
    });
});

describe('GoogleEventContentBuilder.setOutOfOfficeInfo', () => {
    beforeEach(() => {
        global.document = { createElement: () => makeMockElement() };
        global.window.getLocalizedMessage = (key) => key;
    });

    afterEach(() => {
        delete global.document;
        delete global.window.getLocalizedMessage;
    });

    test('shows nothing for a regular event', () => {
        const content = makeMockElement();
        expect(new GoogleEventContentBuilder().setOutOfOfficeInfo(content, { eventType: 'default' })).toBe(false);
        expect(content.children).toHaveLength(0);
    });

    test('shows the type, the auto-decline mode and the decline message', () => {
        const content = makeMockElement();
        const shown = new GoogleEventContentBuilder().setOutOfOfficeInfo(content, {
            eventType: 'outOfOffice',
            outOfOfficeProperties: { autoDeclineMode: 'declineAllConflictingInvitations', declineMessage: 'Back at 4' },
        });
        expect(shown).toBe(true);
        expect(content.children.map(c => c.className)).toEqual([
            'event-detail-ooo-type', 'event-detail-ooo-decline', 'event-detail-ooo-message',
        ]);
        expect(textOf(content.children[1])).toContain('Decline all conflicting invitations');
        expect(content.children[2].textContent).toBe('Back at 4');
    });

    test('names the "new invitations only" mode, and omits a declineNone mode', () => {
        const builder = new GoogleEventContentBuilder();
        const onlyNew = makeMockElement();
        builder.setOutOfOfficeInfo(onlyNew, {
            eventType: 'outOfOffice',
            outOfOfficeProperties: { autoDeclineMode: 'declineOnlyNewConflictingInvitations' },
        });
        expect(textOf(onlyNew)).toContain('Decline only new conflicting invitations');

        const none = makeMockElement();
        builder.setOutOfOfficeInfo(none, {
            eventType: 'outOfOffice',
            outOfOfficeProperties: { autoDeclineMode: 'declineNone' },
        });
        expect(none.children.map(c => c.className)).toEqual(['event-detail-ooo-type']);
    });
});
