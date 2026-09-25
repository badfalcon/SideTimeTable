/**
 * Tests for the event dialogs' shared helpers that do not need a DOM:
 * message substitution, the duration picker's arithmetic, and whether
 * Chrome's time fields use a 12-hour clock.
 */
import {
    CUSTOM_DURATION,
    applyDurationPreset,
    msg,
    msgWith,
    syncDurationFromTimes,
    usesTwelveHourClock
} from '../../src/side_panel/components/modals/event-dialog-dom.js';

describe('msg / msgWith', () => {
    afterEach(() => {
        delete global.window.getLocalizedMessage;
    });

    test('falls back when the key is missing (getLocalizedMessage echoes the key)', () => {
        window.getLocalizedMessage = (key) => key;
        expect(msg('someKey', 'Fallback')).toBe('Fallback');
    });

    test('uses the localized message when there is one', () => {
        window.getLocalizedMessage = () => 'Localized';
        expect(msg('someKey', 'Fallback')).toBe('Localized');
    });

    test('replaces every numbered placeholder', () => {
        window.getLocalizedMessage = () => '$1 of $2 ($1)';
        expect(msgWith('k', '', 3, 'x')).toBe('3 of x (3)');
    });

    test('substitutes into the fallback too', () => {
        window.getLocalizedMessage = (key) => key;
        expect(msgWith('guestCountMany', '$1 guests', 4)).toBe('4 guests');
    });

    test('a value containing "$" is inserted literally', () => {
        window.getLocalizedMessage = () => 'Only $1';
        expect(msgWith('k', '', '$2 day')).toBe('Only $2 day');
    });
});

describe('duration picker', () => {
    const field = (value) => ({ value });

    test('picking a duration writes the end time from the start', () => {
        const start = field('09:00'), end = field('09:30'), duration = field('90');
        applyDurationPreset(start, end, duration);
        expect(end.value).toBe('10:30');
        expect(duration.value).toBe('90');
    });

    test('a duration past midnight is clamped and then reads as custom', () => {
        const start = field('23:00'), end = field('23:30'), duration = field('120');
        applyDurationPreset(start, end, duration);
        expect(end.value).toBe('23:59');
        expect(duration.value).toBe(CUSTOM_DURATION);
    });

    test('without a start time nothing is written', () => {
        const start = field(''), end = field('10:00'), duration = field('60');
        applyDurationPreset(start, end, duration);
        expect(end.value).toBe('10:00');
        expect(duration.value).toBe(CUSTOM_DURATION);
    });

    test('times that match a preset select it; others read as custom', () => {
        const duration = field('');
        syncDurationFromTimes(field('11:00'), field('12:30'), duration);
        expect(duration.value).toBe('90');
        syncDurationFromTimes(field('11:00'), field('11:50'), duration);
        expect(duration.value).toBe(CUSTOM_DURATION);
        syncDurationFromTimes(field('12:00'), field('11:00'), duration);
        expect(duration.value).toBe(CUSTOM_DURATION);
    });
});

describe('usesTwelveHourClock', () => {
    const original = chrome.i18n.getUILanguage;

    afterEach(() => {
        chrome.i18n.getUILanguage = original;
    });

    test.each([
        ['en-US', true],
        ['en', true],
        ['ja', false],
        ['en-GB', false],
        ['de', false],
    ])('Chrome UI language %s → 12-hour: %s', (language, expected) => {
        chrome.i18n.getUILanguage = jest.fn(() => language);
        expect(usesTwelveHourClock()).toBe(expected);
    });

    test('falls back to navigator.language when chrome.i18n is unavailable', () => {
        chrome.i18n.getUILanguage = jest.fn(() => { throw new Error('no i18n'); });
        Object.defineProperty(globalThis, 'navigator', {
            value: { language: 'ja-JP' },
            configurable: true,
            writable: true,
        });
        expect(usesTwelveHourClock()).toBe(false);
    });
});
