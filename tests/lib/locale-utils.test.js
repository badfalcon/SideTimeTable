/**
 * Tests for locale-utils.js
 *
 * Based on SPEC.md — locale-utils section.
 * Tests specify exact expected outputs, not regex patterns.
 */

import '../../src/lib/locale-utils.js';

describe('locale-utils', () => {
    beforeEach(() => {
        resetChromeStorage();
        chrome.i18n.getUILanguage.mockReturnValue('en');
    });

    // ---------------------------------------------------------------
    // SPEC: Time Display — specific input/output table
    //
    // | Input    | en (12h)     | ja (24h) |
    // |----------|-------------|----------|
    // | 00:00    | 12:00 AM    | 00:00    |
    // | 09:00    | 9:00 AM     | 09:00    |
    // | 12:00    | 12:00 PM    | 12:00    |
    // | 14:30    | 2:30 PM     | 14:30    |
    // | 23:59    | 11:59 PM    | 23:59    |
    // ---------------------------------------------------------------
    describe('SPEC: time display by locale', () => {
        // English: hour: 'numeric' (no leading zero) + AM/PM
        // Japanese: hour: '2-digit' (zero-padded) + 24h
        const timeTable = [
            { input: '00:00', en: '12:00 AM', ja: '00:00' },
            { input: '09:00', en: '9:00 AM',  ja: '09:00' },
            { input: '12:00', en: '12:00 PM', ja: '12:00' },
            { input: '14:30', en: '2:30 PM',  ja: '14:30' },
            { input: '23:59', en: '11:59 PM', ja: '23:59' },
        ];

        describe('formatTimeForLocale (English = 12h)', () => {
            test.each(timeTable)('$input → $en', ({ input, en }) => {
                expect(window.formatTimeForLocale(input, 'en')).toBe(en);
            });
        });

        describe('formatTimeForLocale (Japanese = 24h)', () => {
            test.each(timeTable)('$input → $ja', ({ input, ja }) => {
                expect(window.formatTimeForLocale(input, 'ja')).toBe(ja);
            });
        });
    });

    // ---------------------------------------------------------------
    // SPEC: explicit 12h/24h format override
    // ---------------------------------------------------------------
    describe('SPEC: format override via formatTimeByFormat', () => {
        test('24h format shows 14:30 regardless of locale hint', () => {
            expect(window.formatTimeByFormat('14:30', '24h', 'en')).toBe('14:30');
            expect(window.formatTimeByFormat('14:30', '24h', 'ja')).toBe('14:30');
        });

        test('12h format shows 2:30 PM regardless of locale hint', () => {
            const enResult = window.formatTimeByFormat('14:30', '12h', 'en');
            expect(enResult).toBe('2:30 PM');
        });
    });

    describe('SPEC: formatTime minimal API', () => {
        test('format: 12h, locale: en → 2:30 PM', () => {
            expect(window.formatTime('14:30', { format: '12h', locale: 'en' })).toBe('2:30 PM');
        });

        test('format: 24h, locale: ja → 14:30', () => {
            expect(window.formatTime('14:30', { format: '24h', locale: 'ja' })).toBe('14:30');
        });

        test('no options → defaults to 24h ja → 14:30', () => {
            expect(window.formatTime('14:30')).toBe('14:30');
        });

        test('invalid format → falls back to 24h', () => {
            expect(window.formatTime('14:30', { format: 'bogus' })).toBe('14:30');
        });
    });

    // ---------------------------------------------------------------
    // SPEC: Date Display
    //
    // | Locale | Format       | Example (March 5, 2025) |
    // |--------|-------------|------------------------|
    // | en     | MM/DD/YYYY  | 03/05/2025             |
    // | ja     | YYYY/MM/DD  | 2025/03/05             |
    // ---------------------------------------------------------------
    describe('SPEC: date display by locale', () => {
        const march5 = new Date(2025, 2, 5);

        test('English: 03/05/2025', () => {
            expect(window.formatDateForLocale(march5, 'en')).toBe('03/05/2025');
        });

        test('Japanese: 2025/03/05', () => {
            expect(window.formatDateForLocale(march5, 'ja')).toBe('2025/03/05');
        });

        test('default locale is ja', () => {
            expect(window.formatDateForLocale(march5)).toBe('2025/03/05');
        });
    });

    // ---------------------------------------------------------------
    // SPEC: Weekday Display
    // ---------------------------------------------------------------
    describe('SPEC: weekday display', () => {
        const monday = new Date(2025, 2, 17); // Monday, March 17, 2025

        test('English: contains Mon', () => {
            const result = window.formatDateWithWeekdayForLocale(monday, 'en');
            expect(result).toContain('Mon');
        });

        test('Japanese: contains 月', () => {
            const result = window.formatDateWithWeekdayForLocale(monday, 'ja');
            expect(result).toContain('月');
        });
    });

    // ---------------------------------------------------------------
    // SPEC: Empty/null/undefined → empty string ""
    // ---------------------------------------------------------------
    describe('SPEC: graceful handling of invalid input', () => {
        test.each([null, undefined, ''])('formatTimeForLocale(%j) → ""', (input) => {
            expect(window.formatTimeForLocale(input)).toBe('');
        });

        test.each([null, undefined, ''])('formatTimeByFormat(%j) → ""', (input) => {
            expect(window.formatTimeByFormat(input)).toBe('');
        });

        test.each([null, undefined, ''])('formatTime(%j) → ""', (input) => {
            expect(window.formatTime(input)).toBe('');
        });

        test.each([null, undefined])('formatDateForLocale(%j) → ""', (input) => {
            expect(window.formatDateForLocale(input)).toBe('');
        });

        test.each([null, undefined])('formatDateWithWeekdayForLocale(%j) → ""', (input) => {
            expect(window.formatDateWithWeekdayForLocale(input)).toBe('');
        });
    });

    // ---------------------------------------------------------------
    // SPEC: Time format preference persistence
    // - en-US default: 12h
    // - Other locales default: 24h
    // - Invalid preference → not saved
    // ---------------------------------------------------------------
    describe('SPEC: time format preference', () => {
        test('saved 12h preference is returned on next load', async () => {
            await window.setTimeFormatPreference('12h');
            expect(await window.getTimeFormatPreference()).toBe('12h');
        });

        test('saved 24h preference is returned on next load', async () => {
            await window.setTimeFormatPreference('24h');
            expect(await window.getTimeFormatPreference()).toBe('24h');
        });

        test('no preference + en-US browser → 12h default', async () => {
            chrome.i18n.getUILanguage.mockReturnValue('en-US');
            expect(await window.getTimeFormatPreference()).toBe('12h');
        });

        test('no preference + ja browser → 24h default', async () => {
            chrome.i18n.getUILanguage.mockReturnValue('ja');
            expect(await window.getTimeFormatPreference()).toBe('24h');
        });

        test('no preference + fr browser → 24h default', async () => {
            chrome.i18n.getUILanguage.mockReturnValue('fr');
            expect(await window.getTimeFormatPreference()).toBe('24h');
        });

        test('invalid value is not saved', async () => {
            await window.setTimeFormatPreference('36h');
            const raw = await chrome.storage.sync.get(['timeFormat']);
            expect(raw.timeFormat).toBeUndefined();
        });
    });

    // ---------------------------------------------------------------
    // SPEC: Locale detection
    // ---------------------------------------------------------------
    describe('SPEC: locale detection', () => {
        // Use the fallback path (no window helpers)
        function withFallbackPath(fn) {
            const origGetLang = window.getCurrentLanguageSetting;
            const origResolve = window.resolveLanguageCode;
            window.getCurrentLanguageSetting = undefined;
            window.resolveLanguageCode = undefined;
            try {
                return fn();
            } finally {
                window.getCurrentLanguageSetting = origGetLang;
                window.resolveLanguageCode = origResolve;
            }
        }

        test('auto + ja-JP browser → ja', async () => {
            await withFallbackPath(async () => {
                chrome.storage.sync.set({ language: 'auto' }, () => {});
                chrome.i18n.getUILanguage.mockReturnValue('ja-JP');
                expect(await window.getCurrentLocale()).toBe('ja');
            });
        });

        test('auto + en-US browser → en', async () => {
            await withFallbackPath(async () => {
                chrome.storage.sync.set({ language: 'auto' }, () => {});
                chrome.i18n.getUILanguage.mockReturnValue('en-US');
                expect(await window.getCurrentLocale()).toBe('en');
            });
        });

        test('explicit ja overrides en-US browser', async () => {
            await withFallbackPath(async () => {
                chrome.storage.sync.set({ language: 'ja' }, () => {});
                chrome.i18n.getUILanguage.mockReturnValue('en-US');
                expect(await window.getCurrentLocale()).toBe('ja');
            });
        });
    });
});
