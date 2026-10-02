import {
    parseDateText,
    formatDateText,
    formatMonthTitle,
    weekdayNames,
    buildMonthDays,
    toYmd,
    fromYmd,
    addDays,
    addMonths
} from '../../src/lib/date-field.js';

// A fixed "now" (Friday 2 October 2026) so dates without a year are in 2026
const NOW = new Date(2026, 9, 2, 10, 0);

describe('date-field', () => {
    // ---------------------------------------------------------------
    // SPEC: Reading a typed date
    // - ISO and slashed forms, US month/day/year, 8 and 4 digits
    // - Japanese 年/月/日, English month names, weekdays are ignored
    // - A date without a year is in the current one
    // - Days that do not exist, or text that is not a date → null
    // ---------------------------------------------------------------
    describe('SPEC: parseDateText', () => {
        test.each([
            ['2026-10-31', '2026-10-31'],
            ['2026/10/31', '2026-10-31'],
            ['2026.10.31', '2026-10-31'],
            ['2026/1/5', '2026-01-05'],
            ['2027 / 1 / 5', '2027-01-05'],
            ['10/31/2026', '2026-10-31'],
            ['1/5/27', '2027-01-05'],
            ['10/31', '2026-10-31'],
            ['1-5', '2026-01-05'],
            ['20261031', '2026-10-31'],
            ['1031', '2026-10-31'],
            ['  10/31  ', '2026-10-31'],
        ])('numbers: %s → %s', (text, expected) => {
            expect(parseDateText(text, NOW)).toBe(expected);
        });

        test.each([
            ['2026年10月31日', '2026-10-31'],
            ['2027年1月5日', '2027-01-05'],
            ['10月31日', '2026-10-31'],
            ['10月31', '2026-10-31'],
            ['10 月 31 日', '2026-10-31'],
            ['10月31日(土)', '2026-10-31'],
            ['10月31日（土）', '2026-10-31'],
            ['2027年1月5日(火)', '2027-01-05'],
            ['10月31日 土曜日', '2026-10-31'],
            ['１０月３１日', '2026-10-31'],
            ['２０２６／１０／３１', '2026-10-31'],
        ])('Japanese: %s → %s', (text, expected) => {
            expect(parseDateText(text, NOW)).toBe(expected);
        });

        test.each([
            ['Oct 31', '2026-10-31'],
            ['oct 31', '2026-10-31'],
            ['Oct. 31', '2026-10-31'],
            ['October 31', '2026-10-31'],
            ['October 31st', '2026-10-31'],
            ['Oct 31, 2027', '2027-10-31'],
            ['Sept 1', '2026-09-01'],
            ['31 Oct', '2026-10-31'],
            ['31 October 2027', '2027-10-31'],
            ['Sat, Oct 31', '2026-10-31'],
            ['Tue, Jan 5, 2027', '2027-01-05'],
            ['Saturday, October 31, 2026', '2026-10-31'],
        ])('English: %s → %s', (text, expected) => {
            expect(parseDateText(text, NOW)).toBe(expected);
        });

        test.each([
            ['today', '2026-10-02'],
            ['Today', '2026-10-02'],
            ['今日', '2026-10-02'],
            ['tomorrow', '2026-10-03'],
            ['明日', '2026-10-03'],
        ])('words: %s → %s', (text, expected) => {
            expect(parseDateText(text, NOW)).toBe(expected);
        });

        test.each([
            [''],
            ['   '],
            ['abc'],
            ['2026'],
            ['13/1'],
            ['2/30'],
            ['2026-02-29'],
            ['2026-13-01'],
            ['0000-01-01'],
            ['10月32日'],
            ['Foo 31'],
            ['Ma 3'],
            ['10/31/2026 10:00'],
        ])('not a date: "%s" → null', (text) => {
            expect(parseDateText(text, NOW)).toBeNull();
        });

        test('a leap day exists in a leap year', () => {
            expect(parseDateText('2028-02-29', NOW)).toBe('2028-02-29');
        });

        test('non-strings → null', () => {
            expect(parseDateText(null, NOW)).toBeNull();
            expect(parseDateText(undefined, NOW)).toBeNull();
            expect(parseDateText(20261031, NOW)).toBeNull();
        });
    });

    // ---------------------------------------------------------------
    // SPEC: Writing a date
    // - The header's form, with the year only when it is not this year
    // - Every day reads back as the same day in both languages
    // ---------------------------------------------------------------
    describe('SPEC: formatDateText', () => {
        test.each([
            ['2026-10-31', 'ja', '10月31日(土)'],
            ['2026-10-31', 'en', 'Sat, Oct 31'],
            ['2027-01-05', 'ja', '2027年1月5日(火)'],
            ['2027-01-05', 'en', 'Tue, Jan 5, 2027'],
        ])('%s (%s) → %s', (ymd, locale, expected) => {
            expect(formatDateText(ymd, { locale }, NOW)).toBe(expected);
        });

        test('no date → empty', () => {
            expect(formatDateText('', { locale: 'ja' }, NOW)).toBe('');
            expect(formatDateText('2026-02-30', { locale: 'en' }, NOW)).toBe('');
        });

        test.each(['ja', 'en'])('every day of 2026–2027 reads back (%s)', (locale) => {
            let ymd = '2026-01-01';
            while (ymd < '2028-01-01') {
                expect(parseDateText(formatDateText(ymd, { locale }, NOW), NOW)).toBe(ymd);
                ymd = addDays(ymd, 1);
            }
        });
    });

    describe('SPEC: calendar helpers', () => {
        test('month title', () => {
            expect(formatMonthTitle(2026, 9, 'ja')).toBe('2026年10月');
            expect(formatMonthTitle(2026, 9, 'en')).toBe('October 2026');
        });

        test('weekday names from Sunday', () => {
            expect(weekdayNames('ja')).toEqual(['日', '月', '火', '水', '木', '金', '土']);
            expect(weekdayNames('en')).toEqual(['S', 'M', 'T', 'W', 'T', 'F', 'S']);
            expect(weekdayNames('en', 'long')[0]).toBe('Sunday');
        });

        test('six weeks from the Sunday on or before the 1st', () => {
            // October 2026 starts on a Thursday
            const days = buildMonthDays(2026, 9);
            expect(days).toHaveLength(42);
            expect(days[0]).toBe('2026-09-27');
            expect(days[4]).toBe('2026-10-01');
            expect(days[41]).toBe('2026-11-07');
            // A month that starts on a Sunday starts on the first row
            expect(buildMonthDays(2026, 1)[0]).toBe('2026-02-01');
        });

        test('days and months', () => {
            expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
            expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
            expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
            expect(addMonths('2026-03-31', -1)).toBe('2026-02-28');
            expect(addMonths('2026-10-15', 12)).toBe('2027-10-15');
            expect(addMonths('2026-01-15', -1)).toBe('2025-12-15');
        });

        test('YYYY-MM-DD both ways', () => {
            expect(toYmd(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
            expect(fromYmd('2026-01-05').getTime()).toBe(new Date(2026, 0, 5).getTime());
            expect(fromYmd('2026-02-30')).toBeNull();
            expect(fromYmd('2026-1-5')).toBeNull();
            expect(fromYmd(null)).toBeNull();
        });
    });
});
