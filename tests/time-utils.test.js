import {
  createTimeOnDate,
  parseTimeString,
  isToday,
  isSameDay,
  calculateTimeDifference,
  calculateWorkHours,
} from '../src/lib/time-utils.js';

describe('createTimeOnDate', () => {
  test('creates a new Date with specified time on the given date', () => {
    const base = new Date(2025, 5, 15); // June 15, 2025
    const result = createTimeOnDate(base, 10, 30);
    expect(result.getFullYear()).toBe(2025);
    expect(result.getMonth()).toBe(5);
    expect(result.getDate()).toBe(15);
    expect(result.getHours()).toBe(10);
    expect(result.getMinutes()).toBe(30);
    expect(result.getSeconds()).toBe(0);
    expect(result.getMilliseconds()).toBe(0);
  });

  test('does not mutate the original date', () => {
    const base = new Date(2025, 0, 1, 0, 0, 0, 0);
    createTimeOnDate(base, 15, 45);
    expect(base.getHours()).toBe(0);
    expect(base.getMinutes()).toBe(0);
  });

  test('supports seconds and milliseconds', () => {
    const base = new Date(2025, 0, 1);
    const result = createTimeOnDate(base, 8, 0, 30, 500);
    expect(result.getSeconds()).toBe(30);
    expect(result.getMilliseconds()).toBe(500);
  });

  test('handles midnight boundary (0:00:00.000)', () => {
    const base = new Date(2025, 6, 20, 12, 30);
    const result = createTimeOnDate(base, 0, 0, 0, 0);
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
    expect(result.getMilliseconds()).toBe(0);
    expect(result.getDate()).toBe(20);
  });

  test('handles end-of-day boundary (23:59:59.999)', () => {
    const base = new Date(2025, 0, 1);
    const result = createTimeOnDate(base, 23, 59, 59, 999);
    expect(result.getHours()).toBe(23);
    expect(result.getMinutes()).toBe(59);
    expect(result.getSeconds()).toBe(59);
    expect(result.getMilliseconds()).toBe(999);
  });

  test('returns a different Date instance from the input', () => {
    const base = new Date(2025, 0, 1);
    const result = createTimeOnDate(base, 10, 0);
    expect(result).not.toBe(base);
  });
});

describe('parseTimeString', () => {
  // Spec: Accepts "H:MM" or "HH:MM" format with digits only.
  // Returns {hour, minute} within valid ranges (0-23, 0-59).
  // Throws on any invalid input.

  describe('valid inputs', () => {
    test('parses two-digit hour and minute', () => {
      expect(parseTimeString('09:30')).toEqual({ hour: 9, minute: 30 });
      expect(parseTimeString('23:59')).toEqual({ hour: 23, minute: 59 });
    });

    test('accepts single-digit hour and minute', () => {
      expect(parseTimeString('9:5')).toEqual({ hour: 9, minute: 5 });
      expect(parseTimeString('0:00')).toEqual({ hour: 0, minute: 0 });
    });

    test('parses boundary values: midnight and end of day', () => {
      expect(parseTimeString('00:00')).toEqual({ hour: 0, minute: 0 });
      expect(parseTimeString('23:59')).toEqual({ hour: 23, minute: 59 });
    });
  });

  describe('invalid inputs', () => {
    test('rejects null, undefined, and non-string types', () => {
      expect(() => parseTimeString(null)).toThrow();
      expect(() => parseTimeString(undefined)).toThrow();
      expect(() => parseTimeString(123)).toThrow();
    });

    test('rejects empty string', () => {
      expect(() => parseTimeString('')).toThrow();
    });

    test('rejects strings without colon separator', () => {
      expect(() => parseTimeString('1230')).toThrow();
    });

    test('rejects strings with multiple colons', () => {
      expect(() => parseTimeString('12:30:00')).toThrow();
    });

    test('rejects out-of-range hours (24+) and minutes (60+)', () => {
      expect(() => parseTimeString('24:00')).toThrow();
      expect(() => parseTimeString('12:60')).toThrow();
    });

    test('rejects negative values', () => {
      expect(() => parseTimeString('-1:00')).toThrow();
    });

    test('rejects non-numeric characters', () => {
      expect(() => parseTimeString('ab:cd')).toThrow();
      expect(() => parseTimeString('12:xy')).toThrow();
      expect(() => parseTimeString('10.5:30')).toThrow();
      expect(() => parseTimeString('10:30abc')).toThrow();
    });

    test('rejects whitespace in parts', () => {
      expect(() => parseTimeString(' 09:30')).toThrow();
      expect(() => parseTimeString('09: 30')).toThrow();
    });
  });
});

describe('isToday', () => {
  test('returns true for today', () => {
    expect(isToday(new Date())).toBe(true);
  });

  test('returns false for yesterday', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(isToday(yesterday)).toBe(false);
  });

  test('returns false for tomorrow', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(isToday(tomorrow)).toBe(false);
  });

  test('returns true for today at different times', () => {
    const earlyToday = new Date();
    earlyToday.setHours(0, 0, 0, 0);
    expect(isToday(earlyToday)).toBe(true);

    const lateToday = new Date();
    lateToday.setHours(23, 59, 59, 999);
    expect(isToday(lateToday)).toBe(true);
  });
});

describe('isSameDay', () => {
  test('returns true for same day different times', () => {
    const d1 = new Date(2025, 3, 10, 8, 0);
    const d2 = new Date(2025, 3, 10, 20, 30);
    expect(isSameDay(d1, d2)).toBe(true);
  });

  test('returns false for different days', () => {
    const d1 = new Date(2025, 3, 10);
    const d2 = new Date(2025, 3, 11);
    expect(isSameDay(d1, d2)).toBe(false);
  });

  test('does not mutate original dates', () => {
    const d1 = new Date(2025, 3, 10, 15, 0);
    const d2 = new Date(2025, 3, 10, 20, 0);
    isSameDay(d1, d2);
    expect(d1.getHours()).toBe(15);
    expect(d2.getHours()).toBe(20);
  });

  test('returns false for same day number in different months', () => {
    const d1 = new Date(2025, 2, 15); // March 15
    const d2 = new Date(2025, 3, 15); // April 15
    expect(isSameDay(d1, d2)).toBe(false);
  });

  test('returns false for same day/month in different years', () => {
    const d1 = new Date(2024, 5, 15);
    const d2 = new Date(2025, 5, 15);
    expect(isSameDay(d1, d2)).toBe(false);
  });

  test('returns false for year boundary (Dec 31 vs Jan 1)', () => {
    const d1 = new Date(2025, 11, 31); // Dec 31
    const d2 = new Date(2026, 0, 1);   // Jan 1
    expect(isSameDay(d1, d2)).toBe(false);
  });
});

describe('calculateTimeDifference', () => {
  test('calculates difference between Date objects', () => {
    const start = new Date(2025, 0, 1, 10, 0);
    const end = new Date(2025, 0, 1, 11, 30);
    expect(calculateTimeDifference(start, end)).toBe(90 * 60 * 1000);
  });

  test('calculates difference between timestamps', () => {
    expect(calculateTimeDifference(1000, 5000)).toBe(4000);
  });

  test('returns negative for reversed times', () => {
    expect(calculateTimeDifference(5000, 1000)).toBe(-4000);
  });

  test('returns zero for identical times', () => {
    const time = new Date(2025, 0, 1, 12, 0);
    expect(calculateTimeDifference(time, time)).toBe(0);
  });

  test('handles mixed Date and number inputs', () => {
    const date = new Date(2025, 0, 1, 10, 0);
    const timestamp = date.getTime() + 3600000; // +1 hour
    expect(calculateTimeDifference(date, timestamp)).toBe(3600000);
  });

  test('returns NaN for invalid Date objects', () => {
    const result = calculateTimeDifference(new Date('invalid'), new Date());
    expect(result).toBeNaN();
  });

  test('calculates cross-day difference', () => {
    const day1 = new Date(2025, 0, 1, 23, 0);
    const day2 = new Date(2025, 0, 2, 1, 0);
    expect(calculateTimeDifference(day1, day2)).toBe(2 * 60 * 60 * 1000);
  });
});

describe('calculateWorkHours', () => {
  // Spec: Calculates business hours for a given date.
  // open time must be <= close time. Throws otherwise.

  const date = new Date(2025, 5, 15);

  test('returns correct hourDiff, openTime, and closeTime', () => {
    const result = calculateWorkHours(date, '09:00', '17:00');
    expect(result.hourDiff).toBe(8);
    expect(result.openTime.getHours()).toBe(9);
    expect(result.closeTime.getHours()).toBe(17);
  });

  test('supports half-hour boundaries', () => {
    const result = calculateWorkHours(date, '09:30', '18:00');
    expect(result.hourDiff).toBe(8.5);
  });

  test('returns zero hours when open and close are the same', () => {
    const result = calculateWorkHours(date, '09:00', '09:00');
    expect(result.hourDiff).toBe(0);
  });

  test('preserves the target date in returned Date objects', () => {
    const result = calculateWorkHours(date, '09:00', '17:00');
    expect(result.openTime.getFullYear()).toBe(2025);
    expect(result.openTime.getMonth()).toBe(5);
    expect(result.openTime.getDate()).toBe(15);
    expect(result.closeTime.getDate()).toBe(15);
  });

  test('throws when close time is before open time', () => {
    expect(() => calculateWorkHours(date, '17:00', '09:00'))
      .toThrow('Close time must not be before open time');
  });

  test('throws when time strings are invalid', () => {
    expect(() => calculateWorkHours(date, 'invalid', '17:00')).toThrow();
  });
});
