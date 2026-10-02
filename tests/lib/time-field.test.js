import { parseTimeText, formatTimeText, buildTimeOptions, nearestTimeIndex } from '../../src/lib/time-field.js';

describe('time-field', () => {
    // ---------------------------------------------------------------
    // SPEC: Reading a typed time
    // - Hours alone, 3–4 digits, H:MM / H.MM, 24-hour values
    // - am/pm in any common spelling, 午前/午後, 時/分/半, full-width digits
    // - Out-of-range or non-time text → null
    // ---------------------------------------------------------------
    describe('SPEC: parseTimeText', () => {
        test.each([
            ['9', '09:00'],
            ['09', '09:00'],
            ['930', '09:30'],
            ['0930', '09:30'],
            ['2130', '21:30'],
            ['9:30', '09:30'],
            ['9.30', '09:30'],
            ['9:5', '09:05'],
            ['21:30', '21:30'],
            ['0:00', '00:00'],
            ['23:59', '23:59'],
            ['  9:30  ', '09:30'],
        ])('%s → %s', (text, expected) => {
            expect(parseTimeText(text)).toBe(expected);
        });

        test.each([
            ['9am', '09:00'],
            ['9 AM', '09:00'],
            ['9:30pm', '21:30'],
            ['9:30 p.m.', '21:30'],
            ['9p', '21:00'],
            ['930pm', '21:30'],
            ['12am', '00:00'],
            ['12:30 AM', '00:30'],
            ['12pm', '12:00'],
            ['12:15 PM', '12:15'],
            ['13:00 pm', '13:00'],
        ])('am/pm: %s → %s', (text, expected) => {
            expect(parseTimeText(text)).toBe(expected);
        });

        test.each([
            ['午前9:30', '09:30'],
            ['午後9:30', '21:30'],
            ['午後12:00', '12:00'],
            ['午前12:00', '00:00'],
            ['9時', '09:00'],
            ['21時30分', '21:30'],
            ['午後3時', '15:00'],
            ['9時半', '09:30'],
            ['９：３０', '09:30'],
        ])('Japanese: %s → %s', (text, expected) => {
            expect(parseTimeText(text)).toBe(expected);
        });

        test.each([
            '', '   ', 'abc', '24:00', '9:60', '25', '13am', '12345', '9:30:00', '午前9:30pm', ':30', null, undefined,
        ])('not a time: %p', (text) => {
            expect(parseTimeText(text)).toBeNull();
        });
    });

    // ---------------------------------------------------------------
    // SPEC: Writing a time
    // - As the timeline writes it: "09:00", "9:00 AM", "午前9:00"
    // - What it writes reads back as the same time, for every listed time
    // ---------------------------------------------------------------
    describe('SPEC: formatTimeText', () => {
        test.each([
            ['09:00', '24h', 'ja', '09:00'],
            ['21:30', '24h', 'en', '21:30'],
            ['09:00', '12h', 'en', '9:00 AM'],
            ['12:15', '12h', 'en', '12:15 PM'],
            ['00:30', '12h', 'en', '12:30 AM'],
            ['09:00', '12h', 'ja', '午前9:00'],
            ['21:30', '12h', 'ja', '午後9:30'],
        ])('%s (%s, %s) → %s', (hhmm, timeFormat, locale, expected) => {
            expect(formatTimeText(hhmm, { timeFormat, locale })).toBe(expected);
        });

        test('empty or malformed → ""', () => {
            expect(formatTimeText('', { timeFormat: '24h', locale: 'ja' })).toBe('');
            expect(formatTimeText('9:00', { timeFormat: '24h', locale: 'ja' })).toBe('');
        });

        test.each([
            ['24h', 'ja'], ['24h', 'en'], ['12h', 'ja'], ['12h', 'en'],
        ])('round trip for every listed time (%s, %s)', (timeFormat, locale) => {
            for (const time of buildTimeOptions(5)) {
                expect(parseTimeText(formatTimeText(time, { timeFormat, locale }))).toBe(time);
            }
        });
    });

    // ---------------------------------------------------------------
    // SPEC: The list of times
    // - Every `step` minutes from 00:00, ending before 24:00
    // - The highlighted option is the same time or the next one after it
    // ---------------------------------------------------------------
    describe('SPEC: buildTimeOptions / nearestTimeIndex', () => {
        test('15-minute steps', () => {
            const times = buildTimeOptions(15);
            expect(times).toHaveLength(96);
            expect(times[0]).toBe('00:00');
            expect(times[37]).toBe('09:15');
            expect(times[95]).toBe('23:45');
        });

        test('30-minute steps', () => {
            expect(buildTimeOptions(30)).toHaveLength(48);
        });

        test('nearest option', () => {
            const times = buildTimeOptions(15);
            expect(times[nearestTimeIndex(times, '09:15')]).toBe('09:15');
            expect(times[nearestTimeIndex(times, '09:20')]).toBe('09:30');
            expect(times[nearestTimeIndex(times, '23:50')]).toBe('23:45');
            expect(nearestTimeIndex(times, '')).toBe(-1);
        });
    });
});
