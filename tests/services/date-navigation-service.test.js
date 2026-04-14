import { DateNavigationService } from '../../src/side_panel/services/date-navigation-service.js';

describe('DateNavigationService', () => {
    let service;

    beforeEach(() => {
        service = new DateNavigationService();
    });

    // ---------------------------------------------------------------
    // SPEC: State — normalized to midnight, initial value: today
    // ---------------------------------------------------------------
    describe('SPEC: initial state', () => {
        test('initializes with today at midnight', () => {
            const date = service.getDate();
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            expect(date.getTime()).toBe(today.getTime());
        });
    });

    // ---------------------------------------------------------------
    // SPEC: getDate() returns a copy, setDate normalizes to midnight
    // ---------------------------------------------------------------
    describe('SPEC: setDate / getDate', () => {
        test('sets and gets date correctly', () => {
            const target = new Date(2025, 5, 15, 14, 30); // with time
            service.setDate(target);
            const result = service.getDate();
            expect(result.getFullYear()).toBe(2025);
            expect(result.getMonth()).toBe(5);
            expect(result.getDate()).toBe(15);
            // Should be normalized to midnight
            expect(result.getHours()).toBe(0);
            expect(result.getMinutes()).toBe(0);
        });

        test('returns a copy, not the internal reference', () => {
            const date1 = service.getDate();
            const date2 = service.getDate();
            expect(date1).not.toBe(date2);
            expect(date1.getTime()).toBe(date2.getTime());
        });
    });

    describe('isViewingToday', () => {
        test('returns true for today', () => {
            expect(service.isViewingToday()).toBe(true);
        });

        test('returns false for a past date', () => {
            service.setDate(new Date(2020, 0, 1));
            expect(service.isViewingToday()).toBe(false);
        });

        test('returns false for a future date', () => {
            service.setDate(new Date(2099, 11, 31));
            expect(service.isViewingToday()).toBe(false);
        });
    });

    // ---------------------------------------------------------------
    // SPEC: getDateString() — YYYY-MM-DD with zero-padded month/day
    // ---------------------------------------------------------------
    describe('SPEC: getDateString', () => {
        test('returns YYYY-MM-DD format', () => {
            service.setDate(new Date(2025, 2, 5));
            expect(service.getDateString()).toBe('2025-03-05');
        });

        test('pads single-digit month and day', () => {
            service.setDate(new Date(2025, 0, 1));
            expect(service.getDateString()).toBe('2025-01-01');
        });
    });

    // ---------------------------------------------------------------
    // SPEC: advanceToTodayIfNeeded()
    // - true ONLY when: was viewing today AND date rolled past midnight
    // - false when: navigated away, OR still viewing today
    // ---------------------------------------------------------------
    describe('SPEC: advanceToTodayIfNeeded', () => {
        test('returns false when viewing today', () => {
            expect(service.advanceToTodayIfNeeded()).toBe(false);
        });

        test('returns false when not previously viewing today', () => {
            // Navigate away from today — wasViewingToday becomes false
            service.setDate(new Date(2020, 5, 15));
            expect(service.advanceToTodayIfNeeded()).toBe(false);
        });

        test('returns true when was viewing today but date rolled over', () => {
            // Simulate: user was viewing today, then midnight passes
            // We can't easily change Date.now, so we manipulate internal state
            service._wasViewingToday = true;
            service._currentDate = new Date(2020, 0, 1); // a past date

            const result = service.advanceToTodayIfNeeded();
            expect(result).toBe(true);

            // Should now be today
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            expect(service.getDate().getTime()).toBe(today.getTime());
        });
    });
});
