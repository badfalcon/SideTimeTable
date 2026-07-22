import {
  isWritableCalendar,
  filterWritableCalendars,
  buildGoogleEventResource,
} from '../../src/lib/google-event-utils.js';

// ---------------------------------------------------------------
// SPEC: isWritableCalendar / filterWritableCalendars
// - owner and writer are writable; reader / freeBusyReader / none are not
// ---------------------------------------------------------------
describe('isWritableCalendar', () => {
  test.each([
    ['owner', true],
    ['writer', true],
    ['reader', false],
    ['freeBusyReader', false],
    ['none', false],
    [undefined, false],
  ])('accessRole "%s" -> %s', (accessRole, expected) => {
    expect(isWritableCalendar({ accessRole })).toBe(expected);
  });

  test('null/undefined calendar is not writable', () => {
    expect(isWritableCalendar(null)).toBe(false);
    expect(isWritableCalendar(undefined)).toBe(false);
  });
});

describe('filterWritableCalendars', () => {
  test('keeps only owner/writer calendars, preserving order', () => {
    const cals = [
      { id: 'a', accessRole: 'owner' },
      { id: 'b', accessRole: 'reader' },
      { id: 'c', accessRole: 'writer' },
      { id: 'd', accessRole: 'freeBusyReader' },
    ];
    expect(filterWritableCalendars(cals).map(c => c.id)).toEqual(['a', 'c']);
  });

  test('returns an empty array for non-array input', () => {
    expect(filterWritableCalendars(null)).toEqual([]);
    expect(filterWritableCalendars(undefined)).toEqual([]);
    expect(filterWritableCalendars('nope')).toEqual([]);
  });

  test('returns empty when nothing is writable', () => {
    expect(filterWritableCalendars([{ accessRole: 'reader' }])).toEqual([]);
  });

  describe('with selectedIds (displayed set)', () => {
    const cals = [
      { id: 'a', accessRole: 'owner' },
      { id: 'b', accessRole: 'writer' },
      { id: 'c', accessRole: 'owner' },
    ];

    test('restricts writable calendars to the displayed set', () => {
      expect(filterWritableCalendars(cals, ['a', 'c']).map(c => c.id)).toEqual(['a', 'c']);
    });

    test('excludes a writable calendar that is not displayed', () => {
      // 'b' is writable but not selected → must not be offered (would vanish on reload)
      expect(filterWritableCalendars(cals, ['a']).map(c => c.id)).toEqual(['a']);
    });

    test('returns empty when no writable calendar is displayed', () => {
      expect(filterWritableCalendars(cals, ['zzz'])).toEqual([]);
    });

    test('an empty displayed set yields no options', () => {
      expect(filterWritableCalendars(cals, [])).toEqual([]);
    });

    test('a non-array selectedIds is ignored (returns all writable)', () => {
      expect(filterWritableCalendars(cals, null).map(c => c.id)).toEqual(['a', 'b', 'c']);
    });
  });
});

// ---------------------------------------------------------------
// SPEC: buildGoogleEventResource
// - always includes summary/start/end; omits blank description/location
// - trims text fields; uses RFC3339 dateTime for start/end
// ---------------------------------------------------------------
describe('buildGoogleEventResource', () => {
  const date = new Date(2026, 6, 22); // July 22, 2026

  test('builds a minimal resource with only required fields', () => {
    const r = buildGoogleEventResource({
      summary: 'Standup',
      date,
      startTime: '09:00',
      endTime: '09:30',
    });

    expect(r.summary).toBe('Standup');
    expect(r.start.dateTime).toMatch(/^2026-07-22T09:00:00/);
    expect(r.end.dateTime).toMatch(/^2026-07-22T09:30:00/);
    expect(r).not.toHaveProperty('description');
    expect(r).not.toHaveProperty('location');
  });

  test('includes and trims description and location when present', () => {
    const r = buildGoogleEventResource({
      summary: '  Sync  ',
      description: '  agenda  ',
      location: '  Room A  ',
      date,
      startTime: '10:00',
      endTime: '11:00',
    });

    expect(r.summary).toBe('Sync');
    expect(r.description).toBe('agenda');
    expect(r.location).toBe('Room A');
  });

  test('omits description/location when they are blank or whitespace', () => {
    const r = buildGoogleEventResource({
      summary: 'X',
      description: '   ',
      location: '',
      date,
      startTime: '10:00',
      endTime: '11:00',
    });

    expect(r).not.toHaveProperty('description');
    expect(r).not.toHaveProperty('location');
  });

  test('start and end carry a timezone offset (RFC3339)', () => {
    const r = buildGoogleEventResource({
      summary: 'TZ',
      date,
      startTime: '08:15',
      endTime: '08:45',
    });

    // e.g. 2026-07-22T08:15:00+09:00 — must end with a ±HH:MM offset
    expect(r.start.dateTime).toMatch(/[+-]\d{2}:\d{2}$/);
    expect(r.end.dateTime).toMatch(/[+-]\d{2}:\d{2}$/);
  });

  test('throws when a time string is invalid', () => {
    expect(() => buildGoogleEventResource({
      summary: 'X',
      date,
      startTime: 'bad',
      endTime: '10:00',
    })).toThrow();
  });
});
