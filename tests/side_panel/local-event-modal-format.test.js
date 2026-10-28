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
    const now = new Date(2026, 8, 30);
    const format = (start, end, date, prefs) =>
      LocalEventModal.prototype._formatViewTime.call({}, start, end, date, { ...prefs, now });

    test('English: the header-style date, then the range like the event blocks', () => {
      expect(format('09:00', '10:30', new Date(2026, 6, 22), { locale: 'en', timeFormat: '12h' }))
        .toBe('Wed, Jul 22, 9:00–10:30 AM');
    });

    test('Japanese: 24-hour range after the date', () => {
      expect(format('09:00', '10:30', new Date(2026, 6, 22), { locale: 'ja', timeFormat: '24h' }))
        .toBe('7月22日(水) 09:00–10:30');
    });

    test('does not depend on the browser language', () => {
      setNavigatorLanguage('en-GB');
      expect(format('13:00', '14:00', new Date(2026, 6, 22), { locale: 'en', timeFormat: '24h' }))
        .toBe('Wed, Jul 22, 13:00–14:00');
    });

    test('malformed time input falls back to the raw times', () => {
      expect(format(12345, '10:00', new Date(2026, 6, 22), { locale: 'en', timeFormat: '24h' }))
        .toBe('12345–10:00');
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
