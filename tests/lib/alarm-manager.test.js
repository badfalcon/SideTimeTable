/**
 * Tests for AlarmManager
 *
 * Based on SPEC.md — alarm-manager section.
 */
import { AlarmManager } from '../../src/lib/alarm-manager.js';

describe('AlarmManager', () => {
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
        chrome.notifications.create.mockImplementation(() => Promise.resolve());
    });

    // ---------------------------------------------------------------
    // SPEC: Reminder Timing
    // Calculation: eventStartTime - (reminderMinutes * 60 * 1000)
    // ---------------------------------------------------------------
    describe('SPEC: reminder timing', () => {
        test('10:00 event with 5min reminder → fires at 09:55', () => {
            const result = AlarmManager.calculateReminderTime('10:00', '2025-03-15', 5);
            expect(result).toBe(new Date(2025, 2, 15, 9, 55, 0).getTime());
        });

        test('12:00 event with 30min reminder → fires at 11:30', () => {
            const result = AlarmManager.calculateReminderTime('12:00', '2025-06-01', 30);
            expect(result).toBe(new Date(2025, 5, 1, 11, 30, 0).getTime());
        });

        test('00:00 event with 10min reminder → fires at 23:50 previous day', () => {
            const result = AlarmManager.calculateReminderTime('00:00', '2025-03-15', 10);
            expect(result).toBe(new Date(2025, 2, 14, 23, 50, 0).getTime());
        });

        test('Google event: ISO datetime - reminderMinutes', () => {
            const iso = '2025-06-01T14:00:00Z';
            const eventMs = new Date(iso).getTime();
            expect(AlarmManager.calculateGoogleEventReminderTime(iso, 5))
                .toBe(eventMs - 5 * 60_000);
        });
    });

    // ---------------------------------------------------------------
    // SPEC: When Reminders Are NOT Set
    // - reminder is false/missing
    // - startTime is missing
    // - reminder time is in the past
    // - Google all-day events
    // ---------------------------------------------------------------
    describe('SPEC: reminders are NOT set when', () => {
        test('event.reminder is false', async () => {
            await AlarmManager.setReminder(
                { id: '1', startTime: '10:00', reminder: false }, '2030-01-01', 5
            );
            expect(chrome.alarms.create).not.toHaveBeenCalled();
        });

        test('event.startTime is missing', async () => {
            await AlarmManager.setReminder(
                { id: '1', reminder: true }, '2030-01-01', 5
            );
            expect(chrome.alarms.create).not.toHaveBeenCalled();
        });

        test('calculated reminder time is in the past', async () => {
            await AlarmManager.setReminder(
                { id: '1', startTime: '10:00', reminder: true }, '2020-01-01', 5
            );
            expect(chrome.alarms.create).not.toHaveBeenCalled();
        });

        test('Google all-day event (start.date without start.dateTime)', async () => {
            await AlarmManager.setGoogleEventReminder(
                { id: 'g1', start: { date: '2030-03-15' } }, '2030-03-15', 5
            );
            expect(chrome.alarms.create).not.toHaveBeenCalled();
        });

        test('Google event without start property', async () => {
            await AlarmManager.setGoogleEventReminder({ id: 'g1' }, '2030-03-15', 5);
            expect(chrome.alarms.create).not.toHaveBeenCalled();
        });
    });

    // ---------------------------------------------------------------
    // SPEC: Reminders ARE set for future events
    // ---------------------------------------------------------------
    describe('SPEC: reminders ARE set for future events', () => {
        function tomorrowDateStr() {
            const d = new Date();
            d.setDate(d.getDate() + 1);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        }

        test('future local event → alarm created', async () => {
            await AlarmManager.setReminder(
                { id: 'f1', startTime: '12:00', reminder: true },
                tomorrowDateStr(), 5
            );
            expect(chrome.alarms.create).toHaveBeenCalledTimes(1);
        });

        test('future Google event → alarm created', async () => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            await AlarmManager.setGoogleEventReminder(
                { id: 'g1', summary: 'Test', start: { dateTime: tomorrow.toISOString() } },
                tomorrowDateStr(), 5
            );
            expect(chrome.alarms.create).toHaveBeenCalledTimes(1);
        });
    });

    // ---------------------------------------------------------------
    // SPEC: Settings Integration
    // - When reminderMinutes not passed, reads from storage
    // - When not in storage either, defaults to 5
    // ---------------------------------------------------------------
    describe('SPEC: settings integration for reminderMinutes', () => {
        function nextYearDateStr() {
            return `${new Date().getFullYear() + 1}-06-15`;
        }

        test('reads reminderMinutes=15 from storage → alarm at 11:45', async () => {
            chrome.storage.sync.set({ reminderMinutes: 15 }, () => {});

            await AlarmManager.setReminder(
                { id: 't1', startTime: '12:00', reminder: true },
                nextYearDateStr()
            );

            const alarmOpts = chrome.alarms.create.mock.calls[0][1];
            const year = new Date().getFullYear() + 1;
            expect(alarmOpts.when).toBe(new Date(year, 5, 15, 11, 45, 0).getTime());
        });

        test('no storage value → defaults to 5 → alarm at 11:55', async () => {
            await AlarmManager.setReminder(
                { id: 't1', startTime: '12:00', reminder: true },
                nextYearDateStr()
            );

            const alarmOpts = chrome.alarms.create.mock.calls[0][1];
            const year = new Date().getFullYear() + 1;
            expect(alarmOpts.when).toBe(new Date(year, 5, 15, 11, 55, 0).getTime());
        });
    });

    // ---------------------------------------------------------------
    // SPEC: Notification Content
    // - hangoutLink → "Join Meet" button
    // - no hangoutLink → "Open SideTimeTable" button
    // - requireInteraction: true
    // - icon fallback on failure
    // - no notification for missing event data
    // ---------------------------------------------------------------
    describe('SPEC: notification content', () => {
        test('event with hangoutLink → first button is Join Meet', async () => {
            const data = {
                id: 'g1', title: 'Sync', startTime: '14:00',
                hangoutLink: 'https://meet.google.com/abc'
            };
            chrome.storage.local.set({
                'googleEventData_google_event_reminder_2025-03-15_g1': data
            }, () => {});

            await AlarmManager.showReminderNotification('google_event_reminder_2025-03-15_g1');

            const opts = chrome.notifications.create.mock.calls[0][1];
            expect(opts.buttons[0].title).toMatch(/Join.*Meet|Meet/i);
            expect(opts.requireInteraction).toBe(true);
        });

        test('event without hangoutLink → first button is Open SideTimeTable', async () => {
            const event = { id: 'e1', title: 'Meeting', startTime: '11:00' };
            chrome.storage.local.set({ 'localEvents_2025-03-15': [event] }, () => {});

            await AlarmManager.showReminderNotification('event_reminder_2025-03-15_e1');

            const opts = chrome.notifications.create.mock.calls[0][1];
            expect(opts.buttons[0].title).toMatch(/Open.*SideTimeTable|SideTimeTable/i);
        });

        test('no notification when event data is missing', async () => {
            await AlarmManager.showReminderNotification('event_reminder_2025-03-15_ghost');
            expect(chrome.notifications.create).not.toHaveBeenCalled();
        });

        test('no notification for malformed alarm name', async () => {
            await AlarmManager.showReminderNotification('event_reminder_bad');
            expect(chrome.notifications.create).not.toHaveBeenCalled();
        });

        test('icon failure → retries without icon', async () => {
            const event = { id: 'e2', title: 'Test', startTime: '12:00' };
            chrome.storage.local.set({ 'localEvents_2025-03-15': [event] }, () => {});
            chrome.notifications.create
                .mockRejectedValueOnce(new Error('icon not found'))
                .mockResolvedValueOnce();

            await AlarmManager.showReminderNotification('event_reminder_2025-03-15_e2');

            expect(chrome.notifications.create).toHaveBeenCalledTimes(2);
            // Second call should not have iconUrl
            const secondOpts = chrome.notifications.create.mock.calls[1][1];
            expect(secondOpts.iconUrl).toBeUndefined();
        });
    });

    // ---------------------------------------------------------------
    // SPEC: Event Data Retrieval
    // 1. localEvents_YYYY-MM-DD in local storage
    // 2. recurringEvents in sync storage
    // 3. null if not found
    // ---------------------------------------------------------------
    describe('SPEC: event data retrieval fallback chain', () => {
        test('finds event in date-specific local storage', async () => {
            chrome.storage.local.set({
                'localEvents_2025-03-15': [{ id: 'e1', title: 'Local' }]
            }, () => {});

            const result = await AlarmManager.getEventData('e1', '2025-03-15');
            expect(result.title).toBe('Local');
        });

        test('falls back to recurring events in sync storage', async () => {
            chrome.storage.sync.set({
                recurringEvents: [{ id: 'r1', title: 'Standup' }]
            }, () => {});

            const result = await AlarmManager.getEventData('r1', '2025-03-15');
            expect(result.title).toBe('Standup');
        });

        test('returns null when not in either storage', async () => {
            expect(await AlarmManager.getEventData('ghost', '2025-03-15')).toBeNull();
        });

        test('Google event data retrieved from local storage', async () => {
            chrome.storage.local.set({
                'googleEventData_google_event_reminder_2025-03-15_g1': { title: 'GCal' }
            }, () => {});

            const result = await AlarmManager.getGoogleEventData(
                'google_event_reminder_2025-03-15_g1'
            );
            expect(result.title).toBe('GCal');
        });

        test('returns null for non-existent Google event', async () => {
            expect(await AlarmManager.getGoogleEventData('nonexistent')).toBeNull();
        });
    });

    // ---------------------------------------------------------------
    // SPEC: Date Scoping
    // - clearDateReminders only clears alarms for that date
    // - clearGoogleEventReminders only clears Google alarms
    // ---------------------------------------------------------------
    describe('SPEC: date scoping', () => {
        test('clearDateReminders only affects specified date', async () => {
            chrome.alarms.getAll.mockImplementation((cb) => {
                const list = [
                    { name: 'event_reminder_2025-03-15_a' },
                    { name: 'event_reminder_2025-03-15_b' },
                    { name: 'event_reminder_2025-03-16_c' },
                ];
                if (cb) { cb(list); return; }
                return Promise.resolve(list);
            });

            await AlarmManager.clearDateReminders('2025-03-15');

            // 2 cleared (15th), not 1 (16th)
            expect(chrome.alarms.clear).toHaveBeenCalledTimes(2);
        });

        test('clearGoogleEventReminders only clears google_ prefixed alarms', async () => {
            chrome.alarms.getAll.mockImplementation((cb) => {
                const list = [
                    { name: 'google_event_reminder_2025-03-15_g1' },
                    { name: 'event_reminder_2025-03-15_local1' },
                ];
                if (cb) { cb(list); return; }
                return Promise.resolve(list);
            });

            await AlarmManager.clearGoogleEventReminders('2025-03-15');

            expect(chrome.alarms.clear).toHaveBeenCalledTimes(1);
            expect(chrome.alarms.clear).toHaveBeenCalledWith(
                'google_event_reminder_2025-03-15_g1'
            );
        });

        test('setGoogleEventReminders skips all-day events', async () => {
            const spy = jest.spyOn(AlarmManager, 'setGoogleEventReminder').mockResolvedValue();
            jest.spyOn(AlarmManager, 'clearGoogleEventReminders').mockResolvedValue();

            await AlarmManager.setGoogleEventReminders([
                { id: 'g1', start: { dateTime: '2030-03-15T10:00:00Z' } },
                { id: 'g2', start: { date: '2030-03-15' } },  // all-day → skipped
                { id: 'g3', start: { dateTime: '2030-03-15T14:00:00Z' } },
            ], '2030-03-15');

            expect(spy).toHaveBeenCalledTimes(2);
            spy.mockRestore();
        });

        test('setDateReminders only sets alarms for events with reminder=true', async () => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const ds = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;

            chrome.storage.local.set({
                [`localEvents_${ds}`]: [
                    { id: 'e1', startTime: '23:00', reminder: true },
                    { id: 'e2', startTime: '23:30', reminder: false },
                ]
            }, () => {});
            chrome.storage.sync.set({ recurringEvents: [] }, () => {});

            await AlarmManager.setDateReminders(ds);

            // Only e1 has reminder=true
            expect(chrome.alarms.create).toHaveBeenCalledTimes(1);
        });
    });

    // ---------------------------------------------------------------
    // SPEC: formatTimeFromDateTime
    // ---------------------------------------------------------------
    describe('SPEC: time extraction from ISO datetime', () => {
        test('14:30 local → "14:30"', () => {
            const d = new Date(2025, 2, 15, 14, 30, 0);
            expect(AlarmManager.formatTimeFromDateTime(d.toISOString())).toBe('14:30');
        });

        test('09:05 local → "09:05" (zero-padded)', () => {
            const d = new Date(2025, 0, 1, 9, 5, 0);
            expect(AlarmManager.formatTimeFromDateTime(d.toISOString())).toBe('09:05');
        });

        test('00:00 local → "00:00"', () => {
            const d = new Date(2025, 5, 1, 0, 0, 0);
            expect(AlarmManager.formatTimeFromDateTime(d.toISOString())).toBe('00:00');
        });
    });
});
