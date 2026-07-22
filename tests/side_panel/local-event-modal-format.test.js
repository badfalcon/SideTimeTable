/**
 * Tests for LocalEventModal view-mode date/time formatting
 */
import '../../src/lib/locale-utils.js';
import { LocalEventModal } from '../../src/side_panel/components/modals/local-event-modal.js';

function setNavigatorLanguage(lang) {
  Object.defineProperty(globalThis, 'navigator', {
    value: { language: lang },
    configurable: true,
    writable: true,
  });
}

describe('LocalEventModal formatting', () => {
  beforeAll(() => {
    window.getLocalizedMessage = (key) => key;
  });

  beforeEach(() => {
    setNavigatorLanguage('en-US');
  });

  describe('_formatViewTime', () => {
    const format = (...args) => LocalEventModal.prototype._formatViewTime.call({}, ...args);

    test('prepends the display date in MM/DD/YYYY for English', () => {
      const result = format('09:00', '10:30', new Date(2026, 6, 22));
      expect(result.startsWith('07/22/2026 ')).toBe(true);
      expect(result).toContain(' - ');
    });

    test('English date format stays MM/DD/YYYY even for en-GB browsers', () => {
      setNavigatorLanguage('en-GB');
      const result = format('09:00', '10:30', new Date(2026, 6, 22));
      expect(result.startsWith('07/22/2026 ')).toBe(true);
    });

    test('uses YYYY/MM/DD and the tilde separator for Japanese', () => {
      setNavigatorLanguage('ja-JP');
      const result = format('09:00', '10:30', new Date(2026, 6, 22));
      expect(result.startsWith('2026/07/22 ')).toBe(true);
      expect(result).toContain('～');
    });

    test('fallback on malformed time input still includes the date', () => {
      const result = format(12345, '10:00', new Date(2026, 6, 22));
      expect(result).toBe('07/22/2026 12345 - 10:00');
    });
  });

  describe('_getDisplayDate', () => {
    const getDisplayDate = (ctx, event) =>
      LocalEventModal.prototype._getDisplayDate.call(ctx, event);

    test('prefers the recurring instance date', () => {
      const date = getDisplayDate(
        { _getCurrentDate: () => new Date(2026, 0, 1) },
        { instanceDate: '2026-07-25' }
      );
      expect(date.getFullYear()).toBe(2026);
      expect(date.getMonth()).toBe(6);
      expect(date.getDate()).toBe(25);
    });

    test('falls back to the injected current panel date', () => {
      const panelDate = new Date(2026, 2, 14);
      const date = getDisplayDate({ _getCurrentDate: () => panelDate }, {});
      expect(date).toBe(panelDate);
    });

    test('defaults to a valid Date without instanceDate or panel date getter', () => {
      const date = getDisplayDate({ _getCurrentDate: null }, {});
      expect(date).toBeInstanceOf(Date);
      expect(Number.isNaN(date.getTime())).toBe(false);
    });
  });
});
