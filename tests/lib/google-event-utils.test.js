import {
  isWritableCalendar,
  filterWritableCalendars,
  buildGoogleEventResource,
  extractTimeHHMM,
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

  describe('Google Meet', () => {
    test('omits conferenceData when addMeet is falsy', () => {
      const r = buildGoogleEventResource({
        summary: 'X', date, startTime: '10:00', endTime: '11:00',
      });
      expect(r).not.toHaveProperty('conferenceData');

      const r2 = buildGoogleEventResource({
        summary: 'X', date, startTime: '10:00', endTime: '11:00', addMeet: false,
      });
      expect(r2).not.toHaveProperty('conferenceData');
    });

    test('attaches a hangoutsMeet createRequest when addMeet is true', () => {
      const r = buildGoogleEventResource({
        summary: 'X', date, startTime: '10:00', endTime: '11:00',
        addMeet: true, meetRequestId: 'fixed-id-123',
      });
      expect(r.conferenceData).toEqual({
        createRequest: {
          requestId: 'fixed-id-123',
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      });
    });

    test('generates a non-empty requestId when none is supplied', () => {
      const r = buildGoogleEventResource({
        summary: 'X', date, startTime: '10:00', endTime: '11:00', addMeet: true,
      });
      expect(typeof r.conferenceData.createRequest.requestId).toBe('string');
      expect(r.conferenceData.createRequest.requestId.length).toBeGreaterThan(0);
    });
  });

  describe('reminders', () => {
    test('omits reminders for blank/null/undefined (use calendar default)', () => {
      for (const reminderMinutes of ['', null, undefined]) {
        const r = buildGoogleEventResource({
          summary: 'X', date, startTime: '10:00', endTime: '11:00', reminderMinutes,
        });
        expect(r).not.toHaveProperty('reminders');
      }
    });

    test('sets a popup override for a numeric lead time', () => {
      const r = buildGoogleEventResource({
        summary: 'X', date, startTime: '10:00', endTime: '11:00', reminderMinutes: '10',
      });
      expect(r.reminders).toEqual({
        useDefault: false,
        overrides: [{ method: 'popup', minutes: 10 }],
      });
    });

    test('accepts 0 minutes (at start time)', () => {
      const r = buildGoogleEventResource({
        summary: 'X', date, startTime: '10:00', endTime: '11:00', reminderMinutes: 0,
      });
      expect(r.reminders.overrides[0].minutes).toBe(0);
    });

    test('ignores a non-numeric reminder value', () => {
      const r = buildGoogleEventResource({
        summary: 'X', date, startTime: '10:00', endTime: '11:00', reminderMinutes: 'soon',
      });
      expect(r).not.toHaveProperty('reminders');
    });
  });
});

// ---------------------------------------------------------------
// SPEC: buildGoogleEventResource — forPatch mode (events.patch body)
// - PATCH leaves omitted fields unchanged, so cleared text fields must be
//   sent as explicit '' and blank reminders as {useDefault: true}
// - Meet (conferenceData) is never emitted — not editable
// - Create mode (no options / forPatch:false) must be byte-for-byte unchanged
// ---------------------------------------------------------------
describe('buildGoogleEventResource forPatch', () => {
  const date = new Date(2026, 6, 23); // 2026-07-23 local

  const base = { summary: 'Sync', date, startTime: '09:00', endTime: '10:00' };

  test('emits summary and start/end like create mode', () => {
    const r = buildGoogleEventResource(base, { forPatch: true });
    expect(r.summary).toBe('Sync');
    expect(r.start.dateTime).toMatch(/^2026-07-23T09:00:00/);
    expect(r.end.dateTime).toMatch(/^2026-07-23T10:00:00/);
  });

  test.each([
    { description: undefined, label: 'undefined' },
    { description: '', label: 'empty' },
    { description: '   ', label: 'blank' },
  ])('emits explicit empty description when $label (so PATCH clears it)', ({ description }) => {
    const r = buildGoogleEventResource({ ...base, description }, { forPatch: true });
    expect(r).toHaveProperty('description', '');
  });

  test.each([
    { location: undefined, label: 'undefined' },
    { location: '', label: 'empty' },
    { location: '  ', label: 'blank' },
  ])('emits explicit empty location when $label (so PATCH clears it)', ({ location }) => {
    const r = buildGoogleEventResource({ ...base, location }, { forPatch: true });
    expect(r).toHaveProperty('location', '');
  });

  test('keeps trimmed non-blank description and location', () => {
    const r = buildGoogleEventResource(
      { ...base, description: ' notes ', location: ' Room B ' },
      { forPatch: true }
    );
    expect(r.description).toBe('notes');
    expect(r.location).toBe('Room B');
  });

  test.each([undefined, null, ''])(
    'blank reminder (%s) reverts to the calendar default', (reminderMinutes) => {
      const r = buildGoogleEventResource({ ...base, reminderMinutes }, { forPatch: true });
      expect(r.reminders).toEqual({ useDefault: true });
    }
  );

  test('numeric reminder sets a popup override', () => {
    const r = buildGoogleEventResource({ ...base, reminderMinutes: '15' }, { forPatch: true });
    expect(r.reminders).toEqual({
      useDefault: false,
      overrides: [{ method: 'popup', minutes: 15 }],
    });
  });

  test('never emits conferenceData even when addMeet is set', () => {
    const r = buildGoogleEventResource({ ...base, addMeet: true }, { forPatch: true });
    expect(r).not.toHaveProperty('conferenceData');
  });

  describe('create-mode regression (forPatch omitted or false)', () => {
    test.each([[undefined], [{ forPatch: false }], [{}]])(
      'blank description/location are omitted with options %p', (options) => {
        const r = options === undefined
          ? buildGoogleEventResource({ ...base, description: '', location: ' ' })
          : buildGoogleEventResource({ ...base, description: '', location: ' ' }, options);
        expect(r).not.toHaveProperty('description');
        expect(r).not.toHaveProperty('location');
      }
    );

    test('blank reminder is omitted (calendar default applies implicitly)', () => {
      const r = buildGoogleEventResource({ ...base, reminderMinutes: '' });
      expect(r).not.toHaveProperty('reminders');
    });

    test('addMeet still emits conferenceData', () => {
      const r = buildGoogleEventResource({ ...base, addMeet: true, meetRequestId: 'm1' });
      expect(r.conferenceData.createRequest.requestId).toBe('m1');
    });
  });
});

// ---------------------------------------------------------------
// SPEC: extractTimeHHMM
// - RFC3339 dateTime -> local "HH:MM" (zero-padded)
// - falsy input / invalid date -> '' (all-day events have no dateTime)
// ---------------------------------------------------------------
describe('extractTimeHHMM', () => {
  test('extracts a zero-padded local time from an RFC3339 string', () => {
    // Construct via a local Date so the expectation is timezone-independent
    const local = new Date(2026, 6, 23, 9, 5);
    expect(extractTimeHHMM(local.toISOString())).toBe('09:05');
  });

  test('handles afternoon times', () => {
    const local = new Date(2026, 6, 23, 23, 45);
    expect(extractTimeHHMM(local.toISOString())).toBe('23:45');
  });

  test.each([[null], [undefined], ['']])('returns empty string for %p', (input) => {
    expect(extractTimeHHMM(input)).toBe('');
  });

  test('returns empty string for an unparseable value', () => {
    expect(extractTimeHHMM('not-a-date')).toBe('');
  });
});
