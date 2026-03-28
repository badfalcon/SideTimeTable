import { AlarmManager } from '../../src/lib/alarm-manager.js';

describe('AlarmManager', () => {
    beforeEach(() => {
        resetChromeStorage();
        jest.clearAllMocks();

        // Make chrome.alarms methods return Promises
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
    // Pure calculation methods
    // ---------------------------------------------------------------
    describe('calculateReminderTime', () => {
        test('calculates correct reminder time', () => {
            const result = AlarmManager.calculateReminderTime('10:00', '2025-03-15', 5);
            const expected = new Date(2025, 2, 15, 9, 55, 0).getTime();
            expect(result).toBe(expected);
        });

        test('handles midnight event', () => {
            const result = AlarmManager.calculateReminderTime('00:00', '2025-03-15', 10);
            const expected = new Date(2025, 2, 14, 23, 50, 0).getTime();
            expect(result).toBe(expected);
        });

        test('handles different reminder durations', () => {
            const time15 = AlarmManager.calculateReminderTime('12:00', '2025-06-01', 15);
            const time30 = AlarmManager.calculateReminderTime('12:00', '2025-06-01', 30);
            expect(time15).toBe(new Date(2025, 5, 1, 11, 45, 0).getTime());
            expect(time30).toBe(new Date(2025, 5, 1, 11, 30, 0).getTime());
        });
    });

    describe('calculateGoogleEventReminderTime', () => {
        test('calculates correct time from ISO string', () => {
            const isoStr = '2025-03-15T10:00:00+09:00';
            const eventTime = new Date(isoStr).getTime();
            const result = AlarmManager.calculateGoogleEventReminderTime(isoStr, 5);
            expect(result).toBe(eventTime - 5 * 60 * 1000);
        });

        test('handles various reminder minutes', () => {
            const isoStr = '2025-06-01T14:00:00Z';
            const eventTime = new Date(isoStr).getTime();
            expect(AlarmManager.calculateGoogleEventReminderTime(isoStr, 3))
                .toBe(eventTime - 3 * 60 * 1000);
            expect(AlarmManager.calculateGoogleEventReminderTime(isoStr, 30))
                .toBe(eventTime - 30 * 60 * 1000);
        });
    });

    describe('formatTimeFromDateTime', () => {
        test('extracts HH:mm from ISO string', () => {
            // Use a local time constructor so the output is predictable
            const date = new Date(2025, 2, 15, 14, 30, 0);
            const isoStr = date.toISOString();
            const result = AlarmManager.formatTimeFromDateTime(isoStr);
            expect(result).toBe('14:30');
        });

        test('pads single-digit hours and minutes', () => {
            const date = new Date(2025, 0, 1, 9, 5, 0);
            const isoStr = date.toISOString();
            expect(AlarmManager.formatTimeFromDateTime(isoStr)).toBe('09:05');
        });

        test('handles midnight', () => {
            const date = new Date(2025, 5, 1, 0, 0, 0);
            const isoStr = date.toISOString();
            expect(AlarmManager.formatTimeFromDateTime(isoStr)).toBe('00:00');
        });
    });

    // ---------------------------------------------------------------
    // Async methods
    // ---------------------------------------------------------------
    describe('setReminder', () => {
        test('does nothing when event has no reminder flag', async () => {
            await AlarmManager.setReminder({ id: '1', startTime: '10:00', reminder: false }, '2025-03-15');
            expect(chrome.alarms.create).not.toHaveBeenCalled();
        });

        test('does nothing when event has no startTime', async () => {
            await AlarmManager.setReminder({ id: '1', reminder: true }, '2025-03-15');
            expect(chrome.alarms.create).not.toHaveBeenCalled();
        });

        test('creates alarm for future event', async () => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 1);
            const dateStr = `${futureDate.getFullYear()}-${String(futureDate.getMonth() + 1).padStart(2, '0')}-${String(futureDate.getDate()).padStart(2, '0')}`;

            await AlarmManager.setReminder(
                { id: 'test1', startTime: '12:00', reminder: true },
                dateStr,
                5
            );

            expect(chrome.alarms.clear).toHaveBeenCalled();
            expect(chrome.alarms.create).toHaveBeenCalled();
        });

        test('does not create alarm for past event', async () => {
            await AlarmManager.setReminder(
                { id: 'test1', startTime: '10:00', reminder: true },
                '2020-01-01',
                5
            );
            expect(chrome.alarms.create).not.toHaveBeenCalled();
        });

        test('uses settings when reminderMinutes is null', async () => {
            chrome.storage.sync.set({ reminderMinutes: 10 }, () => {});
            const futureDate = new Date();
            futureDate.setFullYear(futureDate.getFullYear() + 1);
            const dateStr = `${futureDate.getFullYear()}-01-15`;

            await AlarmManager.setReminder(
                { id: 'test1', startTime: '12:00', reminder: true },
                dateStr
            );

            expect(chrome.alarms.create).toHaveBeenCalled();
        });
    });

    describe('clearReminder', () => {
        test('clears alarm with correct name', async () => {
            await AlarmManager.clearReminder('test1', '2025-03-15');
            expect(chrome.alarms.clear).toHaveBeenCalledWith(
                'event_reminder_2025-03-15_test1'
            );
        });
    });

    describe('clearDateReminders', () => {
        test('clears all alarms matching the date prefix', async () => {
            const alarmList = [
                { name: 'event_reminder_2025-03-15_a' },
                { name: 'event_reminder_2025-03-15_b' },
                { name: 'event_reminder_2025-03-16_c' }
            ];
            chrome.alarms.getAll.mockImplementation((callback) => {
                if (callback) { callback(alarmList); return; }
                return Promise.resolve(alarmList);
            });

            await AlarmManager.clearDateReminders('2025-03-15');
            expect(chrome.alarms.clear).toHaveBeenCalledTimes(2);
            expect(chrome.alarms.clear).toHaveBeenCalledWith('event_reminder_2025-03-15_a');
            expect(chrome.alarms.clear).toHaveBeenCalledWith('event_reminder_2025-03-15_b');
        });
    });

    describe('getEventData', () => {
        test('finds event in local storage', async () => {
            const event = { id: 'test1', title: 'Meeting' };
            chrome.storage.local.set({ 'localEvents_2025-03-15': [event] }, () => {});

            const result = await AlarmManager.getEventData('test1', '2025-03-15');
            expect(result).toEqual(event);
        });

        test('checks recurring events when not found in local', async () => {
            const recurringEvent = { id: 'rec1', title: 'Standup' };
            chrome.storage.sync.set({ recurringEvents: [recurringEvent] }, () => {});

            const result = await AlarmManager.getEventData('rec1', '2025-03-15');
            expect(result).toEqual(recurringEvent);
        });

        test('returns null when event not found', async () => {
            const result = await AlarmManager.getEventData('nonexistent', '2025-03-15');
            expect(result).toBeNull();
        });
    });

    describe('setGoogleEventReminder', () => {
        test('skips all-day events (no dateTime)', async () => {
            await AlarmManager.setGoogleEventReminder(
                { id: 'g1', start: { date: '2025-03-15' } },
                '2025-03-15'
            );
            expect(chrome.alarms.create).not.toHaveBeenCalled();
        });

        test('skips events without start', async () => {
            await AlarmManager.setGoogleEventReminder({ id: 'g1' }, '2025-03-15');
            expect(chrome.alarms.create).not.toHaveBeenCalled();
        });
    });

    describe('getGoogleEventData', () => {
        test('retrieves stored Google event data', async () => {
            const data = { id: 'g1', title: 'Meeting' };
            const storageKey = 'googleEventData_google_event_reminder_2025-03-15_g1';
            chrome.storage.local.set({ [storageKey]: data }, () => {});

            const result = await AlarmManager.getGoogleEventData('google_event_reminder_2025-03-15_g1');
            expect(result).toEqual(data);
        });

        test('returns null when no data stored', async () => {
            const result = await AlarmManager.getGoogleEventData('nonexistent');
            expect(result).toBeNull();
        });
    });

    describe('clearGoogleEventReminders', () => {
        test('clears Google alarms and their stored data', async () => {
            const alarmList = [
                { name: 'google_event_reminder_2025-03-15_g1' },
                { name: 'google_event_reminder_2025-03-15_g2' },
                { name: 'event_reminder_2025-03-15_local1' }
            ];
            chrome.alarms.getAll.mockImplementation((callback) => {
                if (callback) { callback(alarmList); return; }
                return Promise.resolve(alarmList);
            });

            // Spy on storage.local.remove
            const removeSpy = jest.fn(chrome.storage.local.remove.bind(chrome.storage.local));
            chrome.storage.local.remove = removeSpy;

            await AlarmManager.clearGoogleEventReminders('2025-03-15');
            expect(chrome.alarms.clear).toHaveBeenCalledTimes(2);
            expect(removeSpy).toHaveBeenCalledTimes(2);
        });
    });

    describe('showReminderNotification', () => {
        test('shows notification for local event', async () => {
            const event = { id: 'test1', title: 'Meeting', startTime: '10:00', reminder: true };
            chrome.storage.local.set({ 'localEvents_2025-03-15': [event] }, () => {});

            await AlarmManager.showReminderNotification('event_reminder_2025-03-15_test1');

            expect(chrome.notifications.create).toHaveBeenCalled();
            const args = chrome.notifications.create.mock.calls[0];
            expect(args[1].title).toBeTruthy();
        });

        test('shows notification for Google event', async () => {
            const data = {
                id: 'g1', title: 'Google Meeting', startTime: '14:00',
                hangoutLink: 'https://meet.google.com/abc'
            };
            const storageKey = 'googleEventData_google_event_reminder_2025-03-15_g1';
            chrome.storage.local.set({ [storageKey]: data }, () => {});

            await AlarmManager.showReminderNotification('google_event_reminder_2025-03-15_g1');

            expect(chrome.notifications.create).toHaveBeenCalled();
            const opts = chrome.notifications.create.mock.calls[0][1];
            // Should have Join Meet button since hangoutLink exists
            expect(opts.buttons[0].title).toMatch(/Meet|Join/i);
        });

        test('does nothing for invalid alarm name format', async () => {
            await AlarmManager.showReminderNotification('event_reminder_bad');
            // Should warn but not create notification
            expect(chrome.notifications.create).not.toHaveBeenCalled();
        });

        test('does nothing when event data not found', async () => {
            await AlarmManager.showReminderNotification('event_reminder_2025-03-15_nonexistent');
            expect(chrome.notifications.create).not.toHaveBeenCalled();
        });

        test('creates notification without Meet link', async () => {
            const event = { id: 'test2', title: 'No Meet', startTime: '11:00', reminder: true };
            chrome.storage.local.set({ 'localEvents_2025-03-15': [event] }, () => {});

            await AlarmManager.showReminderNotification('event_reminder_2025-03-15_test2');

            const opts = chrome.notifications.create.mock.calls[0][1];
            expect(opts.buttons[0].title).toMatch(/Open|SideTimeTable/i);
        });

        test('handles icon error gracefully', async () => {
            const event = { id: 'test3', title: 'Icon Fail', startTime: '12:00', reminder: true };
            chrome.storage.local.set({ 'localEvents_2025-03-15': [event] }, () => {});
            chrome.notifications.create
                .mockRejectedValueOnce(new Error('icon not found'))
                .mockResolvedValueOnce();

            await AlarmManager.showReminderNotification('event_reminder_2025-03-15_test3');

            // Should have been called twice (first with icon, fallback without)
            expect(chrome.notifications.create).toHaveBeenCalledTimes(2);
        });
    });

    describe('setDateReminders', () => {
        test('sets reminders for all events with reminder flag on a date', async () => {
            const events = [
                { id: 'e1', title: 'A', startTime: '23:00', reminder: true },
                { id: 'e2', title: 'B', startTime: '23:30', reminder: false }
            ];
            // Use a future date
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 1);
            const y = futureDate.getFullYear();
            const m = String(futureDate.getMonth() + 1).padStart(2, '0');
            const d = String(futureDate.getDate()).padStart(2, '0');
            const dateStr = `${y}-${m}-${d}`;

            chrome.storage.local.set({ [`localEvents_${dateStr}`]: events }, () => {});
            // Empty recurring
            chrome.storage.sync.set({ recurringEvents: [] }, () => {});

            await AlarmManager.setDateReminders(dateStr);

            // Only e1 has reminder=true
            expect(chrome.alarms.create).toHaveBeenCalled();
        });
    });

    describe('setGoogleEventReminder (future event)', () => {
        test('creates alarm and stores event data for future event', async () => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 1);
            const isoStr = futureDate.toISOString();
            const dateStr = isoStr.slice(0, 10);

            await AlarmManager.setGoogleEventReminder(
                {
                    id: 'g1',
                    summary: 'Future Meeting',
                    start: { dateTime: isoStr },
                    hangoutLink: 'https://meet.google.com/abc'
                },
                dateStr,
                5
            );

            expect(chrome.alarms.create).toHaveBeenCalled();
        });
    });

    describe('setGoogleEventReminders', () => {
        test('calls setGoogleEventReminder for each timed event', async () => {
            const spy = jest.spyOn(AlarmManager, 'setGoogleEventReminder').mockResolvedValue();
            jest.spyOn(AlarmManager, 'clearGoogleEventReminders').mockResolvedValue();

            const events = [
                { id: 'g1', start: { dateTime: '2030-03-15T10:00:00Z' } },
                { id: 'g2', start: { date: '2030-03-15' } }, // all-day, no dateTime
                { id: 'g3', start: { dateTime: '2030-03-15T14:00:00Z' } }
            ];

            await AlarmManager.setGoogleEventReminders(events, '2030-03-15');

            expect(spy).toHaveBeenCalledTimes(2);
            spy.mockRestore();
        });
    });
});
