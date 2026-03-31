/**
 * Tests for demo-data.stub.js
 *
 * The stub module replaces the real demo-data.js in production builds.
 * Its contract:
 * 1. Demo mode must be permanently disabled (isDemoMode() === false)
 * 2. All data-returning functions must return safe defaults (empty arrays/null)
 *    so callers never crash when demo data is unavailable
 * 3. All setter functions must be safe no-ops (no side effects, no errors)
 * 4. Time functions must return real current time (not demo-fixed time)
 * 5. The module must export the same interface as the real demo-data.js
 */
import * as stub from '../../src/lib/demo-data.stub.js';

describe('demo-data.stub (production safety)', () => {
    // ---------------------------------------------------------------
    // SPEC Contract 1: isDemoMode() always returns false
    // ---------------------------------------------------------------
    describe('SPEC: demo mode is permanently disabled', () => {
        test('isDemoMode always returns false regardless of state', () => {
            stub.setDemoMode(); // attempt to enable
            expect(stub.isDemoMode()).toBe(false);
        });

        test('DEMO_BUILD flag is false', () => {
            expect(stub.DEMO_BUILD).toBe(false);
        });
    });

    // ---------------------------------------------------------------
    // SPEC Contract 2: All data functions return safe defaults: [], null, or {}
    // ---------------------------------------------------------------
    describe('SPEC: data functions return safe defaults', () => {
        test('getDemoEvents returns empty array (callers can iterate safely)', async () => {
            const events = await stub.getDemoEvents();
            expect(Array.isArray(events)).toBe(true);
            expect(events.length).toBe(0);
        });

        test('getDemoLocalEvents returns empty array', async () => {
            const events = await stub.getDemoLocalEvents();
            expect(Array.isArray(events)).toBe(true);
            expect(events.length).toBe(0);
        });

        test('getDemoCalendars returns empty array', async () => {
            const cals = await stub.getDemoCalendars();
            expect(Array.isArray(cals)).toBe(true);
            expect(cals.length).toBe(0);
        });

        test('getDemoScenarioList returns empty array', async () => {
            const list = await stub.getDemoScenarioList();
            expect(Array.isArray(list)).toBe(true);
            expect(list.length).toBe(0);
        });

        test('getDemoMemoContent returns null (callers check for null)', async () => {
            expect(await stub.getDemoMemoContent()).toBeNull();
        });

        test('getDemoCalendarGroups returns empty array', () => {
            expect(Array.isArray(stub.getDemoCalendarGroups())).toBe(true);
        });

        test('getDemoOptionsSettings returns empty object (settings merge safely)', () => {
            const settings = stub.getDemoOptionsSettings();
            expect(typeof settings).toBe('object');
            expect(Object.keys(settings).length).toBe(0);
        });
    });

    // ---------------------------------------------------------------
    // SPEC Contract 3: All setters are true no-ops
    // ---------------------------------------------------------------
    describe('SPEC: setter functions cause no side effects', () => {
        test('setDemoMode does not throw or change state', () => {
            expect(() => stub.setDemoMode()).not.toThrow();
            expect(stub.isDemoMode()).toBe(false);
        });

        test('setDemoCurrentTime does not affect getCurrentTime', () => {
            const before = stub.getCurrentTime().getTime();
            stub.setDemoCurrentTime('2020-01-01T00:00:00');
            const after = stub.getCurrentTime().getTime();
            // Should still return real current time (within 1 second)
            expect(Math.abs(after - before)).toBeLessThan(1000);
        });

        test('setDemoLang does not affect getDemoLang', () => {
            const before = stub.getDemoLang();
            stub.setDemoLang('ja');
            expect(stub.getDemoLang()).toBe(before);
        });

        test('setDemoScenario does not affect getDemoScenario', () => {
            const before = stub.getDemoScenario();
            stub.setDemoScenario('different');
            expect(stub.getDemoScenario()).toBe(before);
        });
    });

    // ---------------------------------------------------------------
    // SPEC Contract 4: getCurrentTime() returns real current time
    // ---------------------------------------------------------------
    describe('SPEC: time functions use real clock', () => {
        test('getCurrentTime returns approximately now', () => {
            const now = Date.now();
            const result = stub.getCurrentTime();
            expect(result).toBeInstanceOf(Date);
            expect(Math.abs(result.getTime() - now)).toBeLessThan(1000);
        });

        test('getDemoCurrentTime returns a Date (for API compatibility)', () => {
            expect(stub.getDemoCurrentTime()).toBeInstanceOf(Date);
        });

        test('getDemoCurrentTimeString returns a time string', () => {
            const result = stub.getDemoCurrentTimeString();
            expect(typeof result).toBe('string');
            expect(result).toMatch(/^\d{2}:\d{2}$/);
        });
    });

    // ---------------------------------------------------------------
    // SPEC Contract 5: Exports same interface as real demo-data.js
    // ---------------------------------------------------------------
    describe('SPEC: exports match expected interface', () => {
        const expectedExports = [
            'DEMO_BUILD', 'isDemoMode', 'setDemoMode',
            'getCurrentTime', 'getDemoCurrentTime', 'getDemoCurrentTimeString', 'setDemoCurrentTime',
            'getDemoLang', 'setDemoLang',
            'getDemoScenario', 'setDemoScenario',
            'getDemoScenarioList', 'getDemoEvents', 'getDemoLocalEvents',
            'getDemoMemoContent', 'getDemoCalendars', 'getDemoCalendarGroups',
            'getDemoOptionsSettings'
        ];

        test.each(expectedExports)('exports %s', (name) => {
            expect(stub[name]).toBeDefined();
        });
    });
});
