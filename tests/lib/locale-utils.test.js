/**
 * Tests for locale-utils.js
 *
 * locale-utils.js attaches functions to `window`, so we import it for side
 * effects and then access the functions via `window.*` (same as production).
 */

// Import for side effects (attaches to window)
import '../../src/lib/locale-utils.js';

describe('locale-utils', () => {
    beforeEach(() => {
        resetChromeStorage();
        chrome.i18n.getUILanguage.mockReturnValue('en');
    });

    // ---------------------------------------------------------------
    // Pure formatting functions
    // ---------------------------------------------------------------
    describe('formatTimeForLocale', () => {
        test('returns empty string for falsy input', () => {
            expect(window.formatTimeForLocale('')).toBe('');
            expect(window.formatTimeForLocale(null)).toBe('');
            expect(window.formatTimeForLocale(undefined)).toBe('');
        });

        test('formats time in Japanese locale (24h)', () => {
            const result = window.formatTimeForLocale('14:30', 'ja');
            expect(result).toMatch(/14/);
            expect(result).toMatch(/30/);
        });

        test('formats time in English locale (12h)', () => {
            const result = window.formatTimeForLocale('14:30', 'en');
            expect(result).toMatch(/2/);
            expect(result).toMatch(/30/);
            expect(result).toMatch(/PM/i);
        });

        test('formats midnight correctly', () => {
            const jaResult = window.formatTimeForLocale('00:00', 'ja');
            expect(jaResult).toMatch(/0/);
            const enResult = window.formatTimeForLocale('00:00', 'en');
            expect(enResult).toMatch(/12/);
        });

        test('defaults to ja locale', () => {
            const result = window.formatTimeForLocale('09:00');
            expect(result).toMatch(/09/);
        });
    });

    describe('formatTimeByFormat', () => {
        test('returns empty string for falsy input', () => {
            expect(window.formatTimeByFormat('')).toBe('');
            expect(window.formatTimeByFormat(null)).toBe('');
        });

        test('formats in 24h mode', () => {
            const result = window.formatTimeByFormat('14:30', '24h', 'ja');
            expect(result).toMatch(/14/);
            expect(result).toMatch(/30/);
        });

        test('formats in 12h mode', () => {
            const result = window.formatTimeByFormat('14:30', '12h', 'en');
            expect(result).toMatch(/2/);
            expect(result).toMatch(/30/);
            expect(result).toMatch(/PM/i);
        });

        test('defaults to 24h ja', () => {
            const result = window.formatTimeByFormat('09:15');
            expect(result).toMatch(/09/);
            expect(result).toMatch(/15/);
        });
    });

    describe('formatTime', () => {
        test('returns empty for falsy input', () => {
            expect(window.formatTime('')).toBe('');
        });

        test('accepts options object', () => {
            const result = window.formatTime('14:30', { format: '12h', locale: 'en' });
            expect(result).toMatch(/2/);
            expect(result).toMatch(/PM/i);
        });

        test('defaults to 24h ja with empty options', () => {
            const result = window.formatTime('14:30', {});
            expect(result).toMatch(/14/);
        });

        test('handles invalid format gracefully', () => {
            const result = window.formatTime('14:30', { format: 'invalid' });
            // Should fall back to 24h
            expect(result).toMatch(/14/);
        });
    });

    describe('formatDateForLocale', () => {
        test('returns empty string for falsy input', () => {
            expect(window.formatDateForLocale(null)).toBe('');
            expect(window.formatDateForLocale(undefined)).toBe('');
        });

        test('formats date in English locale (MM/DD/YYYY)', () => {
            const date = new Date(2025, 2, 15); // March 15, 2025
            const result = window.formatDateForLocale(date, 'en');
            expect(result).toMatch(/03/);
            expect(result).toMatch(/15/);
            expect(result).toMatch(/2025/);
        });

        test('formats date in Japanese locale (YYYY/MM/DD)', () => {
            const date = new Date(2025, 2, 15);
            const result = window.formatDateForLocale(date, 'ja');
            expect(result).toMatch(/2025/);
            expect(result).toMatch(/03/);
            expect(result).toMatch(/15/);
        });

        test('defaults to ja locale', () => {
            const date = new Date(2025, 0, 1);
            const result = window.formatDateForLocale(date);
            expect(result).toMatch(/2025/);
        });
    });

    describe('formatDateWithWeekdayForLocale', () => {
        test('returns empty string for falsy input', () => {
            expect(window.formatDateWithWeekdayForLocale(null)).toBe('');
        });

        test('includes weekday in English', () => {
            const date = new Date(2025, 2, 17); // Monday March 17
            const result = window.formatDateWithWeekdayForLocale(date, 'en');
            expect(result).toMatch(/Mon/);
        });

        test('includes weekday in Japanese', () => {
            const date = new Date(2025, 2, 17); // Monday
            const result = window.formatDateWithWeekdayForLocale(date, 'ja');
            // Japanese weekday: 月
            expect(result).toMatch(/月/);
        });
    });

    // ---------------------------------------------------------------
    // Async functions with Chrome API mocking
    // ---------------------------------------------------------------
    describe('getCurrentLocale', () => {
        test('returns language from storage when set', async () => {
            // Remove window functions to test the fallback path
            const origGetLang = window.getCurrentLanguageSetting;
            const origResolve = window.resolveLanguageCode;
            window.getCurrentLanguageSetting = undefined;
            window.resolveLanguageCode = undefined;

            chrome.storage.sync.set({ language: 'ja' }, () => {});
            const locale = await window.getCurrentLocale();
            expect(locale).toBe('ja');

            window.getCurrentLanguageSetting = origGetLang;
            window.resolveLanguageCode = origResolve;
        });

        test('falls back to browser language when set to auto', async () => {
            const origGetLang = window.getCurrentLanguageSetting;
            const origResolve = window.resolveLanguageCode;
            window.getCurrentLanguageSetting = undefined;
            window.resolveLanguageCode = undefined;

            chrome.storage.sync.set({ language: 'auto' }, () => {});
            chrome.i18n.getUILanguage.mockReturnValue('ja-JP');
            const locale = await window.getCurrentLocale();
            expect(locale).toBe('ja');

            window.getCurrentLanguageSetting = origGetLang;
            window.resolveLanguageCode = origResolve;
        });

        test('uses window helper functions when available', async () => {
            // These are set by localize.js import
            window.getCurrentLanguageSetting = jest.fn().mockResolvedValue('ja');
            window.resolveLanguageCode = jest.fn().mockReturnValue('ja');

            const locale = await window.getCurrentLocale();
            expect(locale).toBe('ja');
            expect(window.getCurrentLanguageSetting).toHaveBeenCalled();
            expect(window.resolveLanguageCode).toHaveBeenCalledWith('ja');
        });
    });

    describe('getTimeFormatPreference', () => {
        test('returns saved preference when valid', async () => {
            chrome.storage.sync.set({ timeFormat: '12h' }, () => {});
            const result = await window.getTimeFormatPreference();
            expect(result).toBe('12h');
        });

        test('returns saved 24h preference', async () => {
            chrome.storage.sync.set({ timeFormat: '24h' }, () => {});
            const result = await window.getTimeFormatPreference();
            expect(result).toBe('24h');
        });

        test('returns default based on UI language when not saved', async () => {
            chrome.i18n.getUILanguage.mockReturnValue('en-US');
            const result = await window.getTimeFormatPreference();
            expect(result).toBe('12h');
        });

        test('defaults to 24h for non-en-US languages', async () => {
            chrome.i18n.getUILanguage.mockReturnValue('ja');
            const result = await window.getTimeFormatPreference();
            expect(result).toBe('24h');
        });
    });

    describe('setTimeFormatPreference', () => {
        test('saves valid format', async () => {
            await window.setTimeFormatPreference('12h');
            const result = await new Promise(resolve => {
                chrome.storage.sync.get(['timeFormat'], resolve);
            });
            expect(result.timeFormat).toBe('12h');
        });

        test('ignores invalid format', async () => {
            await window.setTimeFormatPreference('invalid');
            const result = await new Promise(resolve => {
                chrome.storage.sync.get(['timeFormat'], resolve);
            });
            expect(result.timeFormat).toBeUndefined();
        });
    });
});
