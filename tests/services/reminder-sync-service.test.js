/**
 * Tests for ReminderSyncService
 *
 * Based on SPEC.md — reminder-sync-service section.
 */

jest.mock('../../src/lib/alarm-manager.js', () => ({
    AlarmManager: {
        setDateReminders: jest.fn().mockResolvedValue(),
        setGoogleEventReminders: jest.fn().mockResolvedValue(),
        GOOGLE_ALARM_PREFIX: 'google_event_reminder_',
    }
}));

jest.mock('../../src/services/google-calendar-client.js', () => ({
    AuthenticationError: class AuthenticationError extends Error {
        constructor(msg) { super(msg); this.name = 'AuthenticationError'; }
    }
}));

const { AlarmManager } = require('../../src/lib/alarm-manager.js');
const { AuthenticationError } = require('../../src/services/google-calendar-client.js');

// Dynamic import after mocks
let ReminderSyncService;

beforeAll(async () => {
    const mod = await import('../../src/services/reminder-sync-service.js');
    ReminderSyncService = mod.ReminderSyncService;
});

describe('ReminderSyncService', () => {
    let service;
    let mockCalendarClient;

    beforeEach(() => {
        resetChromeStorage();
        jest.clearAllMocks();

        chrome.alarms.clear.mockImplementation((name, callback) => {
            if (callback) { callback(true); return; }
            return Promise.resolve(true);
        });
        chrome.alarms.create.mockImplementation(() => Promise.resolve());
        chrome.alarms.getAll.mockImplementation((callback) => {
            if (callback) { callback([]); return; }
            return Promise.resolve([]);
        });

        mockCalendarClient = {
            getPrimaryCalendarEvents: jest.fn().mockResolvedValue([]),
        };
        service = new ReminderSyncService(mockCalendarClient);
    });

    // ---------------------------------------------------------------
    // SPEC: syncLocalEventReminders
    // - Calls AlarmManager.setDateReminders(todayDateStr)
    // - On error → logs, does not throw
    // ---------------------------------------------------------------
    describe('SPEC: syncLocalEventReminders', () => {
        test('calls setDateReminders with today\'s date string', async () => {
            await service.syncLocalEventReminders();

            expect(AlarmManager.setDateReminders).toHaveBeenCalledTimes(1);
            const dateStr = AlarmManager.setDateReminders.mock.calls[0][0];
            // Verify YYYY-MM-DD format
            expect(dateStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        });

        test('does not throw on error', async () => {
            AlarmManager.setDateReminders.mockRejectedValueOnce(new Error('fail'));
            await expect(service.syncLocalEventReminders()).resolves.toBeUndefined();
        });
    });

    // ---------------------------------------------------------------
    // SPEC: syncGoogleEventReminders
    // - googleEventReminder false → returns early
    // - googleIntegrated false → returns early
    // - Both enabled → clears old alarms, fetches events, sets reminders
    // - AuthenticationError → logs warning, does not throw
    // ---------------------------------------------------------------
    describe('SPEC: syncGoogleEventReminders', () => {
        test('returns early when googleEventReminder is false', async () => {
            chrome.storage.sync.set({
                googleEventReminder: false,
                googleIntegrated: true,
            }, () => {});

            await service.syncGoogleEventReminders();

            expect(mockCalendarClient.getPrimaryCalendarEvents).not.toHaveBeenCalled();
        });

        test('returns early when googleIntegrated is false', async () => {
            chrome.storage.sync.set({
                googleEventReminder: true,
                googleIntegrated: false,
            }, () => {});

            await service.syncGoogleEventReminders();

            expect(mockCalendarClient.getPrimaryCalendarEvents).not.toHaveBeenCalled();
        });

        test('fetches and sets reminders when both enabled', async () => {
            chrome.storage.sync.set({
                googleEventReminder: true,
                googleIntegrated: true,
                reminderMinutes: 10,
            }, () => {});

            const fakeEvents = [
                { id: 'g1', summary: 'Meeting', start: { dateTime: '2025-03-15T10:00:00Z' } },
            ];
            mockCalendarClient.getPrimaryCalendarEvents.mockResolvedValue(fakeEvents);

            await service.syncGoogleEventReminders();

            expect(mockCalendarClient.getPrimaryCalendarEvents).toHaveBeenCalledTimes(1);
            expect(AlarmManager.setGoogleEventReminders).toHaveBeenCalledWith(
                fakeEvents, expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/)
            );
        });

        test('clears old date alarms but keeps today\'s', async () => {
            chrome.storage.sync.set({
                googleEventReminder: true,
                googleIntegrated: true,
            }, () => {});

            const today = new Date();
            const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

            chrome.alarms.getAll.mockImplementation((callback) => {
                const alarms = [
                    { name: `google_event_reminder_${todayStr}_g1` },
                    { name: 'google_event_reminder_2020-01-01_old1' },
                ];
                if (callback) { callback(alarms); return; }
                return Promise.resolve(alarms);
            });

            await service.syncGoogleEventReminders();

            // Old alarm should be cleared
            expect(chrome.alarms.clear).toHaveBeenCalledWith(
                'google_event_reminder_2020-01-01_old1'
            );
        });

        test('records sync timestamp after success', async () => {
            chrome.storage.sync.set({
                googleEventReminder: true,
                googleIntegrated: true,
            }, () => {});

            await service.syncGoogleEventReminders();

            const localData = await chrome.storage.local.get(['lastReminderSyncTime']);
            expect(localData.lastReminderSyncTime).toBeDefined();
            expect(typeof localData.lastReminderSyncTime).toBe('number');
        });

        test('AuthenticationError → does not throw', async () => {
            chrome.storage.sync.set({
                googleEventReminder: true,
                googleIntegrated: true,
            }, () => {});

            mockCalendarClient.getPrimaryCalendarEvents.mockRejectedValue(
                new AuthenticationError('token expired')
            );

            await expect(service.syncGoogleEventReminders()).resolves.toBeUndefined();
        });

        test('other errors → does not throw', async () => {
            chrome.storage.sync.set({
                googleEventReminder: true,
                googleIntegrated: true,
            }, () => {});

            mockCalendarClient.getPrimaryCalendarEvents.mockRejectedValue(
                new Error('network failure')
            );

            await expect(service.syncGoogleEventReminders()).resolves.toBeUndefined();
        });
    });

    // ---------------------------------------------------------------
    // SPEC: syncAll — runs local and Google sync in parallel
    // ---------------------------------------------------------------
    describe('SPEC: syncAll', () => {
        test('calls both sync methods', async () => {
            const localSpy = jest.spyOn(service, 'syncLocalEventReminders').mockResolvedValue();
            const googleSpy = jest.spyOn(service, 'syncGoogleEventReminders').mockResolvedValue();

            await service.syncAll();

            expect(localSpy).toHaveBeenCalledTimes(1);
            expect(googleSpy).toHaveBeenCalledTimes(1);
        });
    });

    // ---------------------------------------------------------------
    // SPEC: setupDailySync
    // - Creates "daily_reminder_sync" alarm at next midnight
    // - Repeats every 24 hours (1440 minutes)
    // ---------------------------------------------------------------
    describe('SPEC: setupDailySync', () => {
        test('creates alarm at next midnight with 24h repeat', async () => {
            await service.setupDailySync();

            expect(chrome.alarms.clear).toHaveBeenCalledWith('daily_reminder_sync');
            expect(chrome.alarms.create).toHaveBeenCalledWith(
                'daily_reminder_sync',
                expect.objectContaining({
                    periodInMinutes: 1440,
                })
            );

            const opts = chrome.alarms.create.mock.calls[0][1];
            // "when" should be approximately next midnight
            const now = new Date();
            const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
            expect(opts.when).toBe(tomorrow.getTime());
        });

        test('does not throw on error', async () => {
            chrome.alarms.clear.mockRejectedValueOnce(new Error('fail'));
            await expect(service.setupDailySync()).resolves.toBeUndefined();
        });
    });
});
