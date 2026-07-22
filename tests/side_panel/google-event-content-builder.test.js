/**
 * Tests for GoogleEventContentBuilder.formatEventTime date display
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

  beforeAll(() => {
    window.getLocalizedMessage = (key) => MESSAGES[key] || key;
  });

  beforeEach(() => {
    setNavigatorLanguage('en-US');
    builder = new GoogleEventContentBuilder();
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
