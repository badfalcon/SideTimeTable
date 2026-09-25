/**
 * Tests for the recurring delete dialog's occurrence label
 * ("Only Thu, Sep 24" / "9月25日(金)の回だけ").
 */
import { DeleteRecurringDialog } from '../../src/side_panel/components/modals/delete-recurring-dialog.js';

function setNavigatorLanguage(lang) {
    Object.defineProperty(globalThis, 'navigator', {
        value: { language: lang },
        configurable: true,
        writable: true,
    });
}

describe('DeleteRecurringDialog occurrence label', () => {
    const MESSAGES = {
        en: { deleteScopeThisDetail: 'Only $1', deleteScopeThisDetailNoDate: 'Only this occurrence' },
        ja: { deleteScopeThisDetail: '$1の回だけ', deleteScopeThisDetailNoDate: 'この回だけ' },
    };
    const detail = (date) => new DeleteRecurringDialog()._occurrenceDetail(date);

    afterEach(() => {
        delete global.window.getLocalizedMessage;
    });

    test('English: weekday, month and day', () => {
        setNavigatorLanguage('en-US');
        window.getLocalizedMessage = (key) => MESSAGES.en[key] || key;
        expect(detail(new Date(2026, 8, 24))).toBe('Only Thu, Sep 24');
    });

    test('Japanese: month, day and weekday', () => {
        setNavigatorLanguage('ja-JP');
        window.getLocalizedMessage = (key) => MESSAGES.ja[key] || key;
        expect(detail(new Date(2026, 8, 25))).toBe('9月25日(金)の回だけ');
    });

    test('without a usable date it says "this occurrence"', () => {
        setNavigatorLanguage('en-US');
        window.getLocalizedMessage = (key) => MESSAGES.en[key] || key;
        expect(detail(undefined)).toBe('Only this occurrence');
        expect(detail(new Date('invalid'))).toBe('Only this occurrence');
    });
});
