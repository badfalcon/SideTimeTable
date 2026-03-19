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
});

describe('parseTimeString', () => {
  test('parses valid HH:MM string', () => {
    expect(parseTimeString('09:30')).toEqual({ hour: 9, minute: 30 });
    expect(parseTimeString('0:00')).toEqual({ hour: 0, minute: 0 });
    expect(parseTimeString('23:59')).toEqual({ hour: 23, minute: 59 });
  });

  test('throws on null/undefined/non-string', () => {
    expect(() => parseTimeString(null)).toThrow('Invalid time string');
    expect(() => parseTimeString(undefined)).toThrow('Invalid time string');
    expect(() => parseTimeString(123)).toThrow('Invalid time string');
  });

  test('throws on wrong format', () => {
    expect(() => parseTimeString('1230')).toThrow('must be in "HH:MM" format');
    expect(() => parseTimeString('12:30:00')).toThrow('must be in "HH:MM" format');
  });

  test('throws on out-of-range values', () => {
    expect(() => parseTimeString('24:00')).toThrow('Invalid time value');
    expect(() => parseTimeString('12:60')).toThrow('Invalid time value');
    expect(() => parseTimeString('-1:00')).toThrow('Invalid time value');
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
});

describe('calculateWorkHours', () => {
  test('calculates work hours correctly', () => {
    const date = new Date(2025, 5, 15);
    const result = calculateWorkHours(date, '09:00', '17:00');
    expect(result.hourDiff).toBe(8);
    expect(result.openTime.getHours()).toBe(9);
    expect(result.closeTime.getHours()).toBe(17);
  });

  test('handles half-hour boundaries', () => {
    const date = new Date(2025, 5, 15);
    const result = calculateWorkHours(date, '09:30', '18:00');
    expect(result.hourDiff).toBe(8.5);
  });

  test('propagates parseTimeString errors', () => {
    const date = new Date(2025, 5, 15);
    expect(() => calculateWorkHours(date, 'invalid', '17:00')).toThrow();
  });
});
