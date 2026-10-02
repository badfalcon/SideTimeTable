/**
 * Tests for the recurring delete dialog's occurrence label
 * ("Only Thu, Sep 24" / "9月25日(金)の回だけ").
 */
import { DeleteRecurringDialog } from '../../src/side_panel/components/modals/delete-recurring-dialog.js';
import { setDisplayPrefs } from '../../src/side_panel/components/modals/event-dialog-dom.js';

describe('DeleteRecurringDialog occurrence label', () => {
    const MESSAGES = {
        en: { deleteScopeThisDetail: 'Only $1', deleteScopeThisDetailNoDate: 'Only this occurrence' },
        ja: { deleteScopeThisDetail: '$1の回だけ', deleteScopeThisDetailNoDate: 'この回だけ' },
    };
    const now = new Date(2026, 8, 30);
    const detail = (date) => new DeleteRecurringDialog()._occurrenceDetail(date, now);

    afterEach(() => {
        delete global.window.getLocalizedMessage;
    });

    test('English: weekday, month and day, as the header writes it', () => {
        setDisplayPrefs({ locale: 'en', timeFormat: '12h' });
        window.getLocalizedMessage = (key) => MESSAGES.en[key] || key;
        expect(detail(new Date(2026, 8, 24))).toBe('Only Thu, Sep 24');
    });

    test('Japanese: month, day and weekday, as the header writes it', () => {
        setDisplayPrefs({ locale: 'ja', timeFormat: '24h' });
        window.getLocalizedMessage = (key) => MESSAGES.ja[key] || key;
        expect(detail(new Date(2026, 8, 25))).toBe('9月25日(金)の回だけ');
    });

    test('follows the extension language, not the browser language', () => {
        Object.defineProperty(globalThis, 'navigator', { value: { language: 'ja-JP' }, configurable: true, writable: true });
        setDisplayPrefs({ locale: 'en', timeFormat: '24h' });
        window.getLocalizedMessage = (key) => MESSAGES.en[key] || key;
        expect(detail(new Date(2026, 8, 24))).toBe('Only Thu, Sep 24');
    });

    test('another year shows the year', () => {
        setDisplayPrefs({ locale: 'ja', timeFormat: '24h' });
        window.getLocalizedMessage = (key) => MESSAGES.ja[key] || key;
        expect(detail(new Date(2027, 0, 5))).toBe('2027年1月5日(火)の回だけ');
    });

    test('without a usable date it says "this occurrence"', () => {
        window.getLocalizedMessage = (key) => MESSAGES.en[key] || key;
        expect(detail(undefined)).toBe('Only this occurrence');
        expect(detail(new Date('invalid'))).toBe('Only this occurrence');
    });
});
