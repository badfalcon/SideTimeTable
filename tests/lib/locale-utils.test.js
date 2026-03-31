/**
 * Tests for locale-utils.js
 *
 * Behavioral contracts tested:
 * 1. Time display: English users see 12h (2:30 PM), Japanese users see 24h (14:30)
 * 2. Date display: English MM/DD/YYYY, Japanese YYYY/MM/DD
 * 3. User preference: saved format overrides defaults, invalid input rejected
 * 4. Graceful handling: empty/null inputs return empty string, never throw
 * 5. Locale detection: auto mode detects browser language, explicit overrides
 */

import '../../src/lib/locale-utils.js';

describe('locale-utils', () => {
    beforeEach(() => {
        resetChromeStorage();
        chrome.i18n.getUILanguage.mockReturnValue('en');
    });

    // ---------------------------------------------------------------
    // Contract 1: Time display differs by locale
    // ---------------------------------------------------------------
    describe('time display by locale', () => {
        test('English user sees 2:30 PM for 14:30', () => {
            const result = window.formatTimeForLocale('14:30', 'en');
            expect(result).toMatch(/2/);
            expect(result).toMatch(/30/);
            expect(result).toMatch(/PM/i);
        });

        test('Japanese user sees 14:30 in 24h format', () => {
            const result = window.formatTimeForLocale('14:30', 'ja');
            expect(result).toMatch(/14/);
            expect(result).toMatch(/30/);
            // Should NOT contain AM/PM
            expect(result).not.toMatch(/[AP]M/i);
        });

        test('midnight shows as 12:00 AM in English', () => {
            const result = window.formatTimeForLocale('00:00', 'en');
            expect(result).toMatch(/12/);
            expect(result).toMatch(/AM/i);
        });

        test('midnight shows as 00:00 in Japanese', () => {
            const result = window.formatTimeForLocale('00:00', 'ja');
            expect(result).toMatch(/0/);
        });

        test('noon shows as 12:00 PM in English', () => {
            const result = window.formatTimeForLocale('12:00', 'en');
            expect(result).toMatch(/12/);
            expect(result).toMatch(/PM/i);
        });
    });

    // ---------------------------------------------------------------
    // Contract: explicit 12h/24h format overrides locale default
    // ---------------------------------------------------------------
    describe('explicit format override', () => {
        test('24h format shows 14:30 even for English locale', () => {
            const result = window.formatTimeByFormat('14:30', '24h', 'en');
            expect(result).toMatch(/14/);
            expect(result).not.toMatch(/PM/i);
        });

        test('12h format shows PM even for Japanese locale', () => {
            const result = window.formatTimeByFormat('14:30', '12h', 'ja');
            expect(result).toMatch(/2/);
            expect(result).toMatch(/30/);
            // 12h mode should have AM/PM indicator
            expect(result).toMatch(/PM|午後/i);
        });

        test('formatTime minimal API accepts format and locale', () => {
            const result12 = window.formatTime('14:30', { format: '12h', locale: 'en' });
            expect(result12).toMatch(/PM/i);

            const result24 = window.formatTime('14:30', { format: '24h', locale: 'ja' });
            expect(result24).toMatch(/14/);
        });

        test('formatTime defaults to 24h Japanese when no options given', () => {
            const result = window.formatTime('14:30');
            expect(result).toMatch(/14/);
        });

        test('invalid format falls back to 24h', () => {
            const result = window.formatTime('14:30', { format: 'invalid' });
            expect(result).toMatch(/14/);
        });
    });

    // ---------------------------------------------------------------
    // Contract 2: Date display differs by locale
    // ---------------------------------------------------------------
    describe('date display by locale', () => {
        test('English date shows month before day (MM/DD/YYYY)', () => {
            const date = new Date(2025, 2, 5); // March 5, 2025
            const result = window.formatDateForLocale(date, 'en');
            // MM/DD/YYYY → 03/05/2025
            expect(result).toMatch(/03.*05.*2025/);
        });

        test('Japanese date shows year first (YYYY/MM/DD)', () => {
            const date = new Date(2025, 2, 5);
            const result = window.formatDateForLocale(date, 'ja');
            // YYYY/MM/DD → 2025/03/05
            expect(result).toMatch(/2025.*03.*05/);
        });

        test('date with weekday shows abbreviated day name in English', () => {
            const monday = new Date(2025, 2, 17);
            const result = window.formatDateWithWeekdayForLocale(monday, 'en');
            expect(result).toMatch(/Mon/);
        });

        test('date with weekday shows Japanese day name', () => {
            const monday = new Date(2025, 2, 17);
            const result = window.formatDateWithWeekdayForLocale(monday, 'ja');
            expect(result).toMatch(/月/);
        });

        test('defaults to Japanese locale when none specified', () => {
            const date = new Date(2025, 0, 1);
            const result = window.formatDateForLocale(date);
            expect(result).toMatch(/2025/);
        });
    });

    // ---------------------------------------------------------------
    // Contract 4: Graceful handling of bad input
    // ---------------------------------------------------------------
    describe('graceful handling of invalid input', () => {
        test('empty time string returns empty string', () => {
            expect(window.formatTimeForLocale('')).toBe('');
            expect(window.formatTimeByFormat('')).toBe('');
            expect(window.formatTime('')).toBe('');
        });

        test('null/undefined time returns empty string', () => {
            expect(window.formatTimeForLocale(null)).toBe('');
            expect(window.formatTimeForLocale(undefined)).toBe('');
        });

        test('null/undefined date returns empty string', () => {
            expect(window.formatDateForLocale(null)).toBe('');
            expect(window.formatDateForLocale(undefined)).toBe('');
            expect(window.formatDateWithWeekdayForLocale(null)).toBe('');
        });
    });

    // ---------------------------------------------------------------
    // Contract 3: User time format preference persistence
    // ---------------------------------------------------------------
    describe('time format preference', () => {
        test('user who chose 12h gets 12h on next session', async () => {
            await window.setTimeFormatPreference('12h');
            const pref = await window.getTimeFormatPreference();
            expect(pref).toBe('12h');
        });

        test('user who chose 24h gets 24h on next session', async () => {
            await window.setTimeFormatPreference('24h');
            const pref = await window.getTimeFormatPreference();
            expect(pref).toBe('24h');
        });

        test('invalid format is rejected and not saved', async () => {
            await window.setTimeFormatPreference('36h');
            // Should not find anything saved
            const result = await new Promise(resolve => {
                chrome.storage.sync.get(['timeFormat'], resolve);
            });
            expect(result.timeFormat).toBeUndefined();
        });

        test('en-US users default to 12h when no preference saved', async () => {
            chrome.i18n.getUILanguage.mockReturnValue('en-US');
            const pref = await window.getTimeFormatPreference();
            expect(pref).toBe('12h');
        });

        test('non-en-US users default to 24h when no preference saved', async () => {
            chrome.i18n.getUILanguage.mockReturnValue('ja');
            const pref = await window.getTimeFormatPreference();
            expect(pref).toBe('24h');

            chrome.i18n.getUILanguage.mockReturnValue('de');
            expect(await window.getTimeFormatPreference()).toBe('24h');
        });
    });

    // ---------------------------------------------------------------
    // Contract 5: Locale detection
    // ---------------------------------------------------------------
    describe('locale detection', () => {
        test('auto mode detects Japanese browser', async () => {
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

        test('explicit language setting overrides browser language', async () => {
            const origGetLang = window.getCurrentLanguageSetting;
            const origResolve = window.resolveLanguageCode;
            window.getCurrentLanguageSetting = undefined;
            window.resolveLanguageCode = undefined;

            chrome.storage.sync.set({ language: 'ja' }, () => {});
            chrome.i18n.getUILanguage.mockReturnValue('en-US'); // browser is English
            const locale = await window.getCurrentLocale();
            expect(locale).toBe('ja');

            window.getCurrentLanguageSetting = origGetLang;
            window.resolveLanguageCode = origResolve;
        });
    });
});
