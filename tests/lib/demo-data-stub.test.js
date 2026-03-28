import {
    DEMO_BUILD, isDemoMode, setDemoMode,
    getCurrentTime, getDemoCurrentTime, getDemoCurrentTimeString, setDemoCurrentTime,
    getDemoLang, setDemoLang,
    getDemoScenario, setDemoScenario,
    getDemoScenarioList, getDemoEvents, getDemoLocalEvents,
    getDemoMemoContent, getDemoCalendars, getDemoCalendarGroups,
    getDemoOptionsSettings
} from '../../src/lib/demo-data.stub.js';

describe('demo-data.stub', () => {
    test('DEMO_BUILD is false', () => {
        expect(DEMO_BUILD).toBe(false);
    });

    test('isDemoMode always returns false', () => {
        expect(isDemoMode()).toBe(false);
    });

    test('setDemoMode is a no-op', () => {
        expect(() => setDemoMode()).not.toThrow();
    });

    test('getCurrentTime returns a Date', () => {
        const result = getCurrentTime();
        expect(result).toBeInstanceOf(Date);
    });

    test('getDemoCurrentTime returns a Date', () => {
        expect(getDemoCurrentTime()).toBeInstanceOf(Date);
    });

    test('getDemoCurrentTimeString returns 12:00', () => {
        expect(getDemoCurrentTimeString()).toBe('12:00');
    });

    test('setDemoCurrentTime is a no-op', () => {
        expect(() => setDemoCurrentTime()).not.toThrow();
    });

    test('getDemoLang returns auto', () => {
        expect(getDemoLang()).toBe('auto');
    });

    test('setDemoLang is a no-op', () => {
        expect(() => setDemoLang()).not.toThrow();
    });

    test('getDemoScenario returns dev_team', () => {
        expect(getDemoScenario()).toBe('dev_team');
    });

    test('setDemoScenario is a no-op', () => {
        expect(() => setDemoScenario()).not.toThrow();
    });

    test('async stubs return empty arrays or null', async () => {
        expect(await getDemoScenarioList()).toEqual([]);
        expect(await getDemoEvents()).toEqual([]);
        expect(await getDemoLocalEvents()).toEqual([]);
        expect(await getDemoMemoContent()).toBeNull();
        expect(await getDemoCalendars()).toEqual([]);
    });

    test('getDemoCalendarGroups returns empty array', () => {
        expect(getDemoCalendarGroups()).toEqual([]);
    });

    test('getDemoOptionsSettings returns empty object', () => {
        expect(getDemoOptionsSettings()).toEqual({});
    });
});
