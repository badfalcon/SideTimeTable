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
    test('single all-day event shows the date with year (en)', () => {
      const result = builder.formatEventTime({
        start: { date: '2026-06-01' },
        end: { date: '2026-06-02' },
      });
      expect(result).toBe('06/01/2026 All day');
    });

    test('single all-day event shows the date with year (ja)', () => {
      setNavigatorLanguage('ja-JP');
      const result = builder.formatEventTime({
        start: { date: '2026-06-01' },
        end: { date: '2026-06-02' },
      });
      expect(result).toBe('2026/06/01 All day');
    });

    test('multi-day all-day event shows a full date range including years', () => {
      const result = builder.formatEventTime({
        start: { date: '2026-06-01' },
        end: { date: '2026-06-04' }, // exclusive end → last day is 06/03
      });
      expect(result).toBe('06/01/2026 – 06/03/2026 (3 days)');
    });
  });

  describe('timed events', () => {
    test('same-day event shows the start date only', () => {
      const result = builder.formatEventTime(
        timedEvent('2026-07-22T09:00:00', '2026-07-22T10:00:00')
      );
      expect(result).toContain('07/22/2026');
      expect(result).not.toContain('07/23');
    });

    test('event ending exactly at midnight is treated as same-day', () => {
      const result = builder.formatEventTime(
        timedEvent('2026-07-22T23:00:00', '2026-07-23T00:00:00')
      );
      expect(result).toContain('07/22/2026');
      expect(result).not.toContain('07/23/2026');
    });

    test('event spanning past midnight shows both dates', () => {
      const result = builder.formatEventTime(
        timedEvent('2026-07-22T23:00:00', '2026-07-23T01:00:00')
      );
      expect(result).toContain('07/22/2026');
      expect(result).toContain('07/23/2026');
    });

    test('zero-duration event shows the start date only', () => {
      const result = builder.formatEventTime(
        timedEvent('2026-07-22T09:00:00', '2026-07-22T09:00:00')
      );
      expect(result).toContain('07/22/2026');
      expect(result).not.toContain('07/23');
    });

    test('English date format stays MM/DD/YYYY even for en-GB browsers', () => {
      setNavigatorLanguage('en-GB');
      const result = builder.formatEventTime(
        timedEvent('2026-07-22T09:00:00', '2026-07-22T10:00:00')
      );
      expect(result).toContain('07/22/2026');
      expect(result).not.toContain('22/07/2026');
    });

    test('Japanese locale uses YYYY/MM/DD and the tilde separator', () => {
      setNavigatorLanguage('ja-JP');
      const result = builder.formatEventTime(
        timedEvent('2026-07-22T09:00:00', '2026-07-22T10:00:00')
      );
      expect(result).toContain('2026/07/22');
      expect(result).toContain('～');
    });
  });

  test('missing time info returns the localized fallback', () => {
    const result = builder.formatEventTime({ start: {}, end: {} });
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
