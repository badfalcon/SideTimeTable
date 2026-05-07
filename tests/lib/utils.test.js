import {
  getContrastColor,
  getFormattedDateFromDate,
  logError,
  logWarn,
} from '../../src/lib/utils.js';

import { DEFAULT_SETTINGS } from '../../src/lib/constants.js';

import {
  loadSettings,
  saveSettings,
} from '../../src/lib/settings-storage.js';

import {
  loadLocalEventsForDate,
  saveLocalEventsForDate,
  loadRecurringEvents,
  saveRecurringEvents,
  getRecurringEventsForDate,
  addRecurringEventException,
  deleteRecurringEvent,
} from '../../src/lib/event-storage.js';

// ---------------------------------------------------------------
// SPEC: getContrastColor(hexColor)
// - "#000000" for light, "#ffffff" for dark
// - Luminance = (0.299*R + 0.587*G + 0.114*B) / 255
// ---------------------------------------------------------------
describe('SPEC: getContrastColor', () => {
  const specTable = [
    { input: '#ffffff', expected: '#000000', label: 'white → black' },
    { input: '#000000', expected: '#ffffff', label: 'black → white' },
    { input: '#ff0000', expected: '#ffffff', label: 'red → white' },
    { input: '#00ff00', expected: '#000000', label: 'green → black' },
    { input: '#0000ff', expected: '#ffffff', label: 'blue → white' },
    { input: '#808080', expected: '#000000', label: 'mid-gray → black (luminance ≈ 0.502)' },
  ];

  test.each(specTable)('$input → $expected ($label)', ({ input, expected }) => {
    expect(getContrastColor(input)).toBe(expected);
  });

  test('returns black for yellow (#ffff00)', () => {
    expect(getContrastColor('#ffff00')).toBe('#000000');
  });

  test('returns white for dark theme (#1e1e2e)', () => {
    expect(getContrastColor('#1e1e2e')).toBe('#ffffff');
  });
});

// ---------------------------------------------------------------
// SPEC: getFormattedDateFromDate(date)
// - YYYY-MM-DD, zero-padded, local timezone
// ---------------------------------------------------------------
describe('SPEC: getFormattedDateFromDate', () => {
  test('formats date as YYYY-MM-DD', () => {
    expect(getFormattedDateFromDate(new Date(2025, 0, 1))).toBe('2025-01-01');
    expect(getFormattedDateFromDate(new Date(2025, 11, 31))).toBe('2025-12-31');
  });

  test('pads single-digit month and day', () => {
    expect(getFormattedDateFromDate(new Date(2025, 2, 5))).toBe('2025-03-05');
  });

  test('handles leap year', () => {
    expect(getFormattedDateFromDate(new Date(2024, 1, 29))).toBe('2024-02-29');
  });
});

// ---------------------------------------------------------------
// SPEC: logError — logs to console.error, does not throw
// ---------------------------------------------------------------
describe('SPEC: logError', () => {
  test('logs to console.error with context', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation();
    logError('TestContext', 'something broke');
    expect(spy).toHaveBeenCalledWith('[TestContext] Error:', 'something broke');
    spy.mockRestore();
  });
});

// ---------------------------------------------------------------
// SPEC: logWarn — logs to console.warn, does not throw
// ---------------------------------------------------------------
describe('SPEC: logWarn', () => {
  test('logs to console.warn with context', () => {
    const spy = jest.spyOn(console, 'warn').mockImplementation();
    logWarn('TestContext', 'something odd');
    expect(spy).toHaveBeenCalledWith('[TestContext] Warning:', 'something odd');
    spy.mockRestore();
  });
});

describe('DEFAULT_SETTINGS', () => {
  test('provides all keys needed for the settings page to function', () => {
    // These keys are required by the options page and side panel
    expect(DEFAULT_SETTINGS).toHaveProperty('openTime');
    expect(DEFAULT_SETTINGS).toHaveProperty('closeTime');
    expect(DEFAULT_SETTINGS).toHaveProperty('googleIntegrated');
    expect(DEFAULT_SETTINGS).toHaveProperty('language');
    expect(DEFAULT_SETTINGS).toHaveProperty('googleEventReminder');
    expect(DEFAULT_SETTINGS).toHaveProperty('reminderMinutes');
    expect(DEFAULT_SETTINGS).toHaveProperty('colorTheme');
  });
});

describe('settings persistence', () => {
  beforeEach(() => resetChromeStorage());

  test('saveSettings and loadSettings roundtrip', async () => {
    await saveSettings({ openTime: '08:00', closeTime: '17:00' });
    const result = await loadSettings();
    expect(result.openTime).toBe('08:00');
    expect(result.closeTime).toBe('17:00');
  });

  test('loadSettings returns defaults for missing keys', async () => {
    const result = await loadSettings();
    expect(result.googleIntegrated).toBe(DEFAULT_SETTINGS.googleIntegrated);
    expect(result.language).toBe(DEFAULT_SETTINGS.language);
  });
});

describe('local events persistence', () => {
  beforeEach(() => resetChromeStorage());

  test('saveLocalEventsForDate and loadLocalEventsForDate roundtrip', async () => {
    const date = new Date(2025, 5, 15);
    const events = [
      { id: 'e1', title: 'Meeting', startTime: '10:00', endTime: '11:00' },
      { id: 'e2', title: 'Lunch', startTime: '12:00', endTime: '13:00' },
    ];
    await saveLocalEventsForDate(events, date);
    const loaded = await loadLocalEventsForDate(date);
    expect(loaded).toHaveLength(2);
    expect(loaded[0].title).toBe('Meeting');
    expect(loaded[1].title).toBe('Lunch');
  });

  test('loadLocalEventsForDate returns empty array for dates with no events', async () => {
    const result = await loadLocalEventsForDate(new Date(2030, 0, 1));
    expect(result).toEqual([]);
  });
});

describe('recurring events', () => {
  beforeEach(() => resetChromeStorage());

  test('saveRecurringEvents and loadRecurringEvents roundtrip', async () => {
    const events = [
      { id: 'r1', title: 'Standup', startTime: '09:00', endTime: '09:15',
        recurrence: { type: 'daily', startDate: '2025-06-01', interval: 1 } },
    ];
    await saveRecurringEvents(events);
    const loaded = await loadRecurringEvents();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].title).toBe('Standup');
  });

  test('loadRecurringEvents returns empty array when no events saved', async () => {
    const result = await loadRecurringEvents();
    expect(result).toEqual([]);
  });

  describe('getRecurringEventsForDate', () => {
    const dailyEvent = {
      id: 'r1', title: 'Daily', startTime: '09:00', endTime: '09:15',
      recurrence: { type: 'daily', startDate: '2025-06-01', interval: 1 },
    };

    beforeEach(async () => {
      resetChromeStorage();
    });

    test('daily event matches every day after start', async () => {
      await saveRecurringEvents([dailyEvent]);
      const result = await getRecurringEventsForDate(new Date(2025, 5, 5)); // June 5
      expect(result).toHaveLength(1);
      expect(result[0].isRecurringInstance).toBe(true);
      expect(result[0].instanceDate).toBe('2025-06-05');
    });

    test('daily event does not match before start date', async () => {
      await saveRecurringEvents([dailyEvent]);
      const result = await getRecurringEventsForDate(new Date(2025, 4, 31)); // May 31
      expect(result).toHaveLength(0);
    });

    test('daily event with interval=2 matches every other day', async () => {
      const event = {
        ...dailyEvent,
        recurrence: { type: 'daily', startDate: '2025-06-01', interval: 2 },
      };
      await saveRecurringEvents([event]);

      // Day 0 (June 1) → match, Day 1 (June 2) → skip, Day 2 (June 3) → match
      const match = await getRecurringEventsForDate(new Date(2025, 5, 3));
      expect(match).toHaveLength(1);

      const noMatch = await getRecurringEventsForDate(new Date(2025, 5, 2));
      expect(noMatch).toHaveLength(0);
    });

    test('daily event respects end date', async () => {
      const event = {
        ...dailyEvent,
        recurrence: { type: 'daily', startDate: '2025-06-01', endDate: '2025-06-10', interval: 1 },
      };
      await saveRecurringEvents([event]);

      const inRange = await getRecurringEventsForDate(new Date(2025, 5, 10));
      expect(inRange).toHaveLength(1);

      const afterEnd = await getRecurringEventsForDate(new Date(2025, 5, 11));
      expect(afterEnd).toHaveLength(0);
    });

    test('daily event respects exceptions (deleted instances)', async () => {
      const event = {
        ...dailyEvent,
        recurrence: {
          type: 'daily', startDate: '2025-06-01', interval: 1,
          exceptions: ['2025-06-05'],
        },
      };
      await saveRecurringEvents([event]);

      const excluded = await getRecurringEventsForDate(new Date(2025, 5, 5));
      expect(excluded).toHaveLength(0);

      const included = await getRecurringEventsForDate(new Date(2025, 5, 6));
      expect(included).toHaveLength(1);
    });

    test('weekly event matches correct day of week', async () => {
      // June 1, 2025 is a Sunday (day 0)
      const weeklyEvent = {
        id: 'r2', title: 'Weekly', startTime: '10:00', endTime: '11:00',
        recurrence: { type: 'weekly', startDate: '2025-06-01', interval: 1 },
      };
      await saveRecurringEvents([weeklyEvent]);

      // June 8 is also Sunday → match
      const match = await getRecurringEventsForDate(new Date(2025, 5, 8));
      expect(match).toHaveLength(1);

      // June 9 is Monday → no match
      const noMatch = await getRecurringEventsForDate(new Date(2025, 5, 9));
      expect(noMatch).toHaveLength(0);
    });

    test('weekly event with daysOfWeek matches specified days', async () => {
      const event = {
        id: 'r3', title: 'MWF', startTime: '09:00', endTime: '10:00',
        recurrence: {
          type: 'weekly', startDate: '2025-06-02', interval: 1,
          daysOfWeek: [1, 3, 5], // Mon, Wed, Fri
        },
      };
      await saveRecurringEvents([event]);

      // June 2 (Mon) → match
      expect(await getRecurringEventsForDate(new Date(2025, 5, 2))).toHaveLength(1);
      // June 4 (Wed) → match
      expect(await getRecurringEventsForDate(new Date(2025, 5, 4))).toHaveLength(1);
      // June 3 (Tue) → no match
      expect(await getRecurringEventsForDate(new Date(2025, 5, 3))).toHaveLength(0);
    });

    test('weekly event with daysOfWeek ignores startDate day-of-week', async () => {
      // startDate is Sunday, but daysOfWeek specifies Mon/Wed/Fri
      const event = {
        id: 'r3b', title: 'MWF from Sunday', startTime: '09:00', endTime: '10:00',
        recurrence: {
          type: 'weekly', startDate: '2025-06-01', interval: 1, // Sunday
          daysOfWeek: [1, 3, 5], // Mon, Wed, Fri
        },
      };
      await saveRecurringEvents([event]);

      // June 2 (Mon) → match even though start is Sunday
      expect(await getRecurringEventsForDate(new Date(2025, 5, 2))).toHaveLength(1);
      // June 1 (Sun) → no match (not in daysOfWeek)
      expect(await getRecurringEventsForDate(new Date(2025, 5, 1))).toHaveLength(0);
    });

    test('weekly event with interval=2 matches every other week', async () => {
      const event = {
        id: 'r2b', title: 'Bi-weekly', startTime: '10:00', endTime: '11:00',
        recurrence: { type: 'weekly', startDate: '2025-06-02', interval: 2 }, // Mon
      };
      await saveRecurringEvents([event]);

      // June 2 (week 0, Mon) → match
      expect(await getRecurringEventsForDate(new Date(2025, 5, 2))).toHaveLength(1);
      // June 9 (week 1, Mon) → no match
      expect(await getRecurringEventsForDate(new Date(2025, 5, 9))).toHaveLength(0);
      // June 16 (week 2, Mon) → match
      expect(await getRecurringEventsForDate(new Date(2025, 5, 16))).toHaveLength(1);
    });

    test('monthly event matches same day of month', async () => {
      const event = {
        id: 'r4', title: 'Monthly', startTime: '14:00', endTime: '15:00',
        recurrence: { type: 'monthly', startDate: '2025-01-15', interval: 1 },
      };
      await saveRecurringEvents([event]);

      // Feb 15 → match
      expect(await getRecurringEventsForDate(new Date(2025, 1, 15))).toHaveLength(1);
      // Feb 14 → no match
      expect(await getRecurringEventsForDate(new Date(2025, 1, 14))).toHaveLength(0);
    });

    test('monthly event handles month-end (31st in short month)', async () => {
      const event = {
        id: 'r5', title: 'Month-end', startTime: '16:00', endTime: '17:00',
        recurrence: { type: 'monthly', startDate: '2025-01-31', interval: 1 },
      };
      await saveRecurringEvents([event]);

      // Feb has 28 days → event on Feb 28
      expect(await getRecurringEventsForDate(new Date(2025, 1, 28))).toHaveLength(1);
      // March 31 → match
      expect(await getRecurringEventsForDate(new Date(2025, 2, 31))).toHaveLength(1);
    });

    test('monthly event handles leap year February', async () => {
      const event = {
        id: 'r5b', title: 'Leap month-end', startTime: '16:00', endTime: '17:00',
        recurrence: { type: 'monthly', startDate: '2024-01-31', interval: 1 },
      };
      await saveRecurringEvents([event]);

      // 2024 is leap year: Feb has 29 days → event on Feb 29
      expect(await getRecurringEventsForDate(new Date(2024, 1, 29))).toHaveLength(1);
      // Feb 28 should NOT match (event day is 31, effective day is 29)
      expect(await getRecurringEventsForDate(new Date(2024, 1, 28))).toHaveLength(0);
    });

    test('monthly event with interval=3 matches every 3 months', async () => {
      const event = {
        id: 'r4b', title: 'Quarterly', startTime: '14:00', endTime: '15:00',
        recurrence: { type: 'monthly', startDate: '2025-01-15', interval: 3 },
      };
      await saveRecurringEvents([event]);

      // Jan 15 (month 0) → match
      expect(await getRecurringEventsForDate(new Date(2025, 0, 15))).toHaveLength(1);
      // Feb 15 (month 1) → no match
      expect(await getRecurringEventsForDate(new Date(2025, 1, 15))).toHaveLength(0);
      // Mar 15 (month 2) → no match
      expect(await getRecurringEventsForDate(new Date(2025, 2, 15))).toHaveLength(0);
      // Apr 15 (month 3) → match
      expect(await getRecurringEventsForDate(new Date(2025, 3, 15))).toHaveLength(1);
    });

    test('weekdays event matches Mon-Fri only', async () => {
      const event = {
        id: 'r6', title: 'Weekday', startTime: '08:00', endTime: '09:00',
        recurrence: { type: 'weekdays', startDate: '2025-06-01' },
      };
      await saveRecurringEvents([event]);

      // June 2 (Mon) → match
      expect(await getRecurringEventsForDate(new Date(2025, 5, 2))).toHaveLength(1);
      // June 6 (Fri) → match
      expect(await getRecurringEventsForDate(new Date(2025, 5, 6))).toHaveLength(1);
      // June 1 (Sun) → no match
      expect(await getRecurringEventsForDate(new Date(2025, 5, 1))).toHaveLength(0);
      // June 7 (Sat) → no match
      expect(await getRecurringEventsForDate(new Date(2025, 5, 7))).toHaveLength(0);
    });

    test('daily event with multiple exceptions', async () => {
      const event = {
        ...dailyEvent,
        recurrence: {
          type: 'daily', startDate: '2025-06-01', interval: 1,
          exceptions: ['2025-06-03', '2025-06-05', '2025-06-07'],
        },
      };
      await saveRecurringEvents([event]);

      expect(await getRecurringEventsForDate(new Date(2025, 5, 3))).toHaveLength(0);
      expect(await getRecurringEventsForDate(new Date(2025, 5, 5))).toHaveLength(0);
      expect(await getRecurringEventsForDate(new Date(2025, 5, 7))).toHaveLength(0);
      // Non-excepted dates still match
      expect(await getRecurringEventsForDate(new Date(2025, 5, 4))).toHaveLength(1);
      expect(await getRecurringEventsForDate(new Date(2025, 5, 6))).toHaveLength(1);
    });

    test('weekdays event respects endDate', async () => {
      const event = {
        id: 'r6b', title: 'Weekday with end', startTime: '08:00', endTime: '09:00',
        recurrence: { type: 'weekdays', startDate: '2025-06-01', endDate: '2025-06-06' },
      };
      await saveRecurringEvents([event]);

      // June 6 (Fri) → within range, match
      expect(await getRecurringEventsForDate(new Date(2025, 5, 6))).toHaveLength(1);
      // June 9 (Mon) → after endDate, no match
      expect(await getRecurringEventsForDate(new Date(2025, 5, 9))).toHaveLength(0);
    });

    test('events without recurrence are skipped', async () => {
      await saveRecurringEvents([
        { id: 'r7', title: 'No recurrence', startTime: '10:00', endTime: '11:00' },
      ]);
      const result = await getRecurringEventsForDate(new Date(2025, 5, 15));
      expect(result).toHaveLength(0);
    });
  });

  describe('addRecurringEventException', () => {
    beforeEach(async () => {
      resetChromeStorage();
      await saveRecurringEvents([{
        id: 'r1', title: 'Daily', startTime: '09:00', endTime: '09:15',
        recurrence: { type: 'daily', startDate: '2025-06-01', interval: 1 },
      }]);
    });

    test('adds exception date to recurring event', async () => {
      await addRecurringEventException('r1', '2025-06-05');
      const events = await loadRecurringEvents();
      expect(events[0].recurrence.exceptions).toContain('2025-06-05');
    });

    test('does not duplicate exceptions', async () => {
      await addRecurringEventException('r1', '2025-06-05');
      await addRecurringEventException('r1', '2025-06-05');
      const events = await loadRecurringEvents();
      expect(events[0].recurrence.exceptions.filter(e => e === '2025-06-05')).toHaveLength(1);
    });

    test('no-op for non-existent event id', async () => {
      await addRecurringEventException('nonexistent', '2025-06-05');
      const events = await loadRecurringEvents();
      expect(events[0].recurrence.exceptions).toBeUndefined();
    });
  });

  describe('deleteRecurringEvent', () => {
    beforeEach(async () => {
      resetChromeStorage();
      await saveRecurringEvents([
        { id: 'r1', title: 'First', recurrence: { type: 'daily', startDate: '2025-06-01', interval: 1 } },
        { id: 'r2', title: 'Second', recurrence: { type: 'daily', startDate: '2025-06-01', interval: 1 } },
      ]);
    });

    test('deletes recurring event by id', async () => {
      await deleteRecurringEvent('r1');
      const events = await loadRecurringEvents();
      expect(events).toHaveLength(1);
      expect(events[0].id).toBe('r2');
    });

    test('no-op for non-existent event id', async () => {
      await deleteRecurringEvent('nonexistent');
      const events = await loadRecurringEvents();
      expect(events).toHaveLength(2);
    });
  });
});

describe('loadLocalEventsForDate includes recurring events', () => {
  beforeEach(async () => {
    resetChromeStorage();
  });

  test('combines recurring and date-specific events', async () => {
    // Save a daily recurring event
    await saveRecurringEvents([{
      id: 'r1', title: 'Standup', startTime: '09:00', endTime: '09:15',
      recurrence: { type: 'daily', startDate: '2025-06-01', interval: 1 },
    }]);

    // Save a date-specific event
    const date = new Date(2025, 5, 5);
    await saveLocalEventsForDate(
      [{ id: 'e1', title: 'One-off', startTime: '14:00', endTime: '15:00' }],
      date
    );

    const loaded = await loadLocalEventsForDate(date);
    expect(loaded).toHaveLength(2);
    // Recurring events come first
    expect(loaded[0].title).toBe('Standup');
    expect(loaded[0].isRecurringInstance).toBe(true);
    expect(loaded[1].title).toBe('One-off');
  });
});
