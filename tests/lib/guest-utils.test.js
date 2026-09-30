/**
 * Tests for the guest helpers used when creating a Google event: address
 * checks, splitting typed/pasted text, the attendees body, and suggestions
 * from people on loaded events.
 */
import {
    GuestDirectory,
    buildAttendees,
    isValidEmail,
    normalizeEmail,
    parseGuestInput
} from '../../src/lib/guest-utils.js';

describe('isValidEmail', () => {
    test.each([
        'sato@example.com',
        'first.last+tag@sub.example.co.jp',
        '  padded@example.org  ',
    ])('accepts %s', (value) => {
        expect(isValidEmail(value)).toBe(true);
    });

    test.each([
        'tanaka@examp',
        'no-at-sign.example.com',
        'two@@example.com',
        'space in@example.com',
        'trailing@example.c',
        '',
        null,
    ])('rejects %p', (value) => {
        expect(isValidEmail(value)).toBe(false);
    });
});

describe('normalizeEmail', () => {
    test('trims and lowercases', () => {
        expect(normalizeEmail('  Sato@Example.COM ')).toBe('sato@example.com');
    });
});

describe('parseGuestInput', () => {
    test('splits on commas, semicolons, spaces, new lines and 、', () => {
        expect(parseGuestInput('a@example.com, b@example.com;c@example.com\nd@example.com e@example.com、f@example.com')
            .map(g => g.email))
            .toEqual(['a@example.com', 'b@example.com', 'c@example.com', 'd@example.com', 'e@example.com', 'f@example.com']);
    });

    test('reads the "Name <address>" form a mail client copies', () => {
        expect(parseGuestInput('"Hana Sato" <sato@example.com>, 山田 太郎 <yamada@example.com>')).toEqual([
            { email: 'sato@example.com', name: 'Hana Sato' },
            { email: 'yamada@example.com', name: '山田 太郎' },
        ]);
    });

    test('keeps entries that are not addresses so they can be shown as errors', () => {
        expect(parseGuestInput('tanaka@examp')).toEqual([{ email: 'tanaka@examp', name: '' }]);
    });

    test('empty input gives no guests', () => {
        expect(parseGuestInput('  , ;  ')).toEqual([]);
        expect(parseGuestInput(undefined)).toEqual([]);
    });
});

describe('buildAttendees', () => {
    test('keeps valid addresses once each, in order', () => {
        expect(buildAttendees([
            { email: 'sato@example.com' },
            { email: 'bad@examp' },
            { email: 'SATO@example.com' },
            { email: 'yamada@example.com' },
        ])).toEqual([{ email: 'sato@example.com' }, { email: 'yamada@example.com' }]);
    });

    test('handles a missing list', () => {
        expect(buildAttendees(undefined)).toEqual([]);
    });
});

describe('GuestDirectory', () => {
    const event = (...attendees) => ({ attendees });

    test('remembers attendees but not yourself or meeting rooms', () => {
        const directory = new GuestDirectory();
        directory.addFromEvents([
            event(
                { email: 'me@example.com', self: true },
                { email: 'room-a@resource.calendar.google.com', resource: true, displayName: 'Room A' },
                { email: 'sato@example.com', displayName: '佐藤 花子' }
            ),
            { summary: 'no attendees' },
        ]);
        expect([...directory.people.keys()]).toEqual(['sato@example.com']);
    });

    test('suggests by address prefix or by any word of the name', () => {
        const directory = new GuestDirectory();
        directory.addFromEvents([event(
            { email: 'sato@example.com', displayName: '佐藤 花子' },
            { email: 'sam.lee@example.org', displayName: 'Sam Lee' },
            { email: 'yamada@example.com' }
        )]);

        expect(directory.search('sa').map(p => p.email)).toEqual(['sam.lee@example.org', 'sato@example.com']);
        expect(directory.search('lee').map(p => p.email)).toEqual(['sam.lee@example.org']);
        expect(directory.search('花子').map(p => p.email)).toEqual(['sato@example.com']);
        expect(directory.search('example')).toEqual([]);
        expect(directory.search('  ')).toEqual([]);
    });

    test('most recently seen comes first, and already added guests are skipped', () => {
        const directory = new GuestDirectory();
        directory.add('sato@example.com', '佐藤 花子');
        directory.add('sasaki@example.com', '佐々木 健');
        directory.add('sato@example.com'); // seen again, name kept

        expect(directory.search('sa').map(p => p.email)).toEqual(['sato@example.com', 'sasaki@example.com']);
        expect(directory.nameFor('SATO@example.com')).toBe('佐藤 花子');
        expect(directory.search('sa', { exclude: ['Sato@Example.com'] }).map(p => p.email))
            .toEqual(['sasaki@example.com']);
    });

    test('caps the number of suggestions and of remembered people', () => {
        const directory = new GuestDirectory(3);
        ['a1', 'a2', 'a3', 'a4'].forEach(name => directory.add(`${name}@example.com`));
        expect(directory.people.size).toBe(3);
        expect(directory.nameFor('a1@example.com')).toBe('');
        expect(directory.search('a', { max: 2 }).map(p => p.email)).toEqual(['a4@example.com', 'a3@example.com']);
    });

    test('ignores entries that are not addresses', () => {
        const directory = new GuestDirectory();
        directory.addFromEvents([event({ email: 'not-an-address' }, null)]);
        expect(directory.people.size).toBe(0);
    });
});
