/**
 * Tests for AlarmManager
 *
 * Behavioral contracts tested:
 * 1. Reminder timing: reminder fires X minutes before event start
 * 2. Past event safety: no reminders set for events that already started
 * 3. Event type awareness: all-day Google events skipped, events without start skipped
 * 4. Notification content: includes event title, has Meet button when link exists
 * 5. Data retrieval: finds events in both local and recurring storage
 * 6. Batch operations: date-based clear/set operates on correct date scope
 * 7. Settings integration: uses stored reminderMinutes when not provided
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
    // Contract 1: Reminder fires exactly X minutes before event
    // ---------------------------------------------------------------
    describe('reminder timing', () => {
        test('5-minute reminder fires 5 minutes before event start', () => {
            const reminderTime = AlarmManager.calculateReminderTime('10:00', '2025-03-15', 5);
            const expected = new Date(2025, 2, 15, 9, 55, 0).getTime();
            expect(reminderTime).toBe(expected);
        });

        test('30-minute reminder for 12:00 event fires at 11:30', () => {
            const reminderTime = AlarmManager.calculateReminderTime('12:00', '2025-06-01', 30);
            expect(reminderTime).toBe(new Date(2025, 5, 1, 11, 30, 0).getTime());
        });

        test('reminder for midnight event fires on the previous day', () => {
            const reminderTime = AlarmManager.calculateReminderTime('00:00', '2025-03-15', 10);
            const expected = new Date(2025, 2, 14, 23, 50, 0).getTime();
            expect(reminderTime).toBe(expected);
        });

        test('Google event reminder subtracts minutes from ISO datetime', () => {
            const isoStr = '2025-06-01T14:00:00Z';
            const eventTime = new Date(isoStr).getTime();
            const result = AlarmManager.calculateGoogleEventReminderTime(isoStr, 5);
            expect(result).toBe(eventTime - 5 * 60 * 1000);
        });
    });

    // ---------------------------------------------------------------
    // Contract 2: Past events never get reminders
    // ---------------------------------------------------------------
    describe('past event safety', () => {
        test('no alarm created for event in the past', async () => {
            await AlarmManager.setReminder(
                { id: 'past1', startTime: '10:00', reminder: true },
                '2020-01-01',
                5
            );
            expect(chrome.alarms.create).not.toHaveBeenCalled();
        });

        test('alarm IS created for event in the future', async () => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const dateStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;

            await AlarmManager.setReminder(
                { id: 'future1', startTime: '12:00', reminder: true },
                dateStr,
                5
            );
            expect(chrome.alarms.create).toHaveBeenCalled();
        });
    });

    // ---------------------------------------------------------------
    // Contract 3: Events without reminders or start times are skipped
    // ---------------------------------------------------------------
    describe('event type awareness', () => {
        test('event with reminder=false is ignored', async () => {
            await AlarmManager.setReminder(
                { id: '1', startTime: '10:00', reminder: false },
                '2030-03-15'
            );
            expect(chrome.alarms.create).not.toHaveBeenCalled();
        });

        test('event without startTime is ignored', async () => {
            await AlarmManager.setReminder({ id: '1', reminder: true }, '2030-03-15');
            expect(chrome.alarms.create).not.toHaveBeenCalled();
        });

        test('Google all-day event (date only, no dateTime) is skipped', async () => {
            await AlarmManager.setGoogleEventReminder(
                { id: 'g1', start: { date: '2030-03-15' } },
                '2030-03-15'
            );
            expect(chrome.alarms.create).not.toHaveBeenCalled();
        });

        test('Google event without start property is skipped', async () => {
            await AlarmManager.setGoogleEventReminder({ id: 'g1' }, '2030-03-15');
            expect(chrome.alarms.create).not.toHaveBeenCalled();
        });
    });

    // ---------------------------------------------------------------
    // Contract 4: Notifications show correct content for the user
    // ---------------------------------------------------------------
    describe('notification content', () => {
        test('notification for event with Meet link offers Join Meet button', async () => {
            const data = {
                id: 'g1', title: 'Team Sync', startTime: '14:00',
                hangoutLink: 'https://meet.google.com/abc'
            };
            chrome.storage.local.set({
                'googleEventData_google_event_reminder_2025-03-15_g1': data
            }, () => {});

            await AlarmManager.showReminderNotification('google_event_reminder_2025-03-15_g1');

            const opts = chrome.notifications.create.mock.calls[0][1];
            expect(opts.buttons[0].title).toMatch(/Meet|Join/i);
            expect(opts.requireInteraction).toBe(true);
        });

        test('notification for event without Meet link offers Open SideTimeTable', async () => {
            const event = { id: 'test1', title: 'Regular Meeting', startTime: '11:00' };
            chrome.storage.local.set({ 'localEvents_2025-03-15': [event] }, () => {});

            await AlarmManager.showReminderNotification('event_reminder_2025-03-15_test1');

            const opts = chrome.notifications.create.mock.calls[0][1];
            expect(opts.buttons[0].title).toMatch(/Open|SideTimeTable/i);
        });

        test('notification is not shown when event data is missing', async () => {
            await AlarmManager.showReminderNotification('event_reminder_2025-03-15_nonexistent');
            expect(chrome.notifications.create).not.toHaveBeenCalled();
        });

        test('notification is not shown for malformed alarm name', async () => {
            await AlarmManager.showReminderNotification('event_reminder_bad');
            expect(chrome.notifications.create).not.toHaveBeenCalled();
        });

        test('notification still appears even if icon fails to load', async () => {
            const event = { id: 'test3', title: 'Icon Fail', startTime: '12:00' };
            chrome.storage.local.set({ 'localEvents_2025-03-15': [event] }, () => {});
            chrome.notifications.create
                .mockRejectedValueOnce(new Error('icon not found'))
                .mockResolvedValueOnce();

            await AlarmManager.showReminderNotification('event_reminder_2025-03-15_test3');

            // Retried without icon
            expect(chrome.notifications.create).toHaveBeenCalledTimes(2);
        });
    });

    // ---------------------------------------------------------------
    // Contract 5: Event data retrieval searches both storage locations
    // ---------------------------------------------------------------
    describe('event data retrieval', () => {
        test('finds event in date-specific local storage', async () => {
            const event = { id: 'local1', title: 'Local Meeting' };
            chrome.storage.local.set({ 'localEvents_2025-03-15': [event] }, () => {});

            const result = await AlarmManager.getEventData('local1', '2025-03-15');
            expect(result.title).toBe('Local Meeting');
        });

        test('falls back to recurring events when not in local storage', async () => {
            const recurringEvent = { id: 'rec1', title: 'Daily Standup' };
            chrome.storage.sync.set({ recurringEvents: [recurringEvent] }, () => {});

            const result = await AlarmManager.getEventData('rec1', '2025-03-15');
            expect(result.title).toBe('Daily Standup');
        });

        test('returns null when event exists in neither storage', async () => {
            const result = await AlarmManager.getEventData('ghost', '2025-03-15');
            expect(result).toBeNull();
        });

        test('retrieves stored Google event data', async () => {
            const data = { id: 'g1', title: 'Google Meeting' };
            chrome.storage.local.set({
                'googleEventData_google_event_reminder_2025-03-15_g1': data
            }, () => {});

            const result = await AlarmManager.getGoogleEventData('google_event_reminder_2025-03-15_g1');
            expect(result.title).toBe('Google Meeting');
        });

        test('returns null for non-existent Google event data', async () => {
            const result = await AlarmManager.getGoogleEventData('nonexistent');
            expect(result).toBeNull();
        });
    });

    // ---------------------------------------------------------------
    // Contract 6: Batch operations scope correctly by date
    // ---------------------------------------------------------------
    describe('date-scoped batch operations', () => {
        test('clearDateReminders only clears alarms for the specified date', async () => {
            chrome.alarms.getAll.mockImplementation((callback) => {
                const list = [
                    { name: 'event_reminder_2025-03-15_a' },
                    { name: 'event_reminder_2025-03-15_b' },
                    { name: 'event_reminder_2025-03-16_c' }  // different date
                ];
                if (callback) { callback(list); return; }
                return Promise.resolve(list);
            });

            await AlarmManager.clearDateReminders('2025-03-15');

            // Should clear 2 alarms for the 15th, not the one for the 16th
            expect(chrome.alarms.clear).toHaveBeenCalledTimes(2);
        });

        test('clearGoogleEventReminders only clears Google alarms, not local ones', async () => {
            chrome.alarms.getAll.mockImplementation((callback) => {
                const list = [
                    { name: 'google_event_reminder_2025-03-15_g1' },
                    { name: 'event_reminder_2025-03-15_local1' }  // local alarm
                ];
                if (callback) { callback(list); return; }
                return Promise.resolve(list);
            });

            await AlarmManager.clearGoogleEventReminders('2025-03-15');

            // Only Google alarm should be cleared
            expect(chrome.alarms.clear).toHaveBeenCalledTimes(1);
            expect(chrome.alarms.clear).toHaveBeenCalledWith('google_event_reminder_2025-03-15_g1');
        });

        test('setGoogleEventReminders processes only timed events, skips all-day', async () => {
            const spy = jest.spyOn(AlarmManager, 'setGoogleEventReminder').mockResolvedValue();
            jest.spyOn(AlarmManager, 'clearGoogleEventReminders').mockResolvedValue();

            const events = [
                { id: 'g1', start: { dateTime: '2030-03-15T10:00:00Z' } },
                { id: 'g2', start: { date: '2030-03-15' } },       // all-day
                { id: 'g3', start: { dateTime: '2030-03-15T14:00:00Z' } }
            ];

            await AlarmManager.setGoogleEventReminders(events, '2030-03-15');

            expect(spy).toHaveBeenCalledTimes(2);
            spy.mockRestore();
        });

        test('setDateReminders only creates alarms for events with reminder=true', async () => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const dateStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;

            chrome.storage.local.set({
                [`localEvents_${dateStr}`]: [
                    { id: 'e1', title: 'With Reminder', startTime: '23:00', reminder: true },
                    { id: 'e2', title: 'No Reminder', startTime: '23:30', reminder: false }
                ]
            }, () => {});
            chrome.storage.sync.set({ recurringEvents: [] }, () => {});

            await AlarmManager.setDateReminders(dateStr);

            // Only e1 should create an alarm
            expect(chrome.alarms.create).toHaveBeenCalledTimes(1);
        });
    });

    // ---------------------------------------------------------------
    // Contract 7: Settings integration
    // ---------------------------------------------------------------
    describe('settings integration', () => {
        test('reads reminderMinutes from settings when not explicitly provided', async () => {
            chrome.storage.sync.set({ reminderMinutes: 15 }, () => {});
            const nextYear = new Date().getFullYear() + 1;
            const dateStr = `${nextYear}-06-15`;

            await AlarmManager.setReminder(
                { id: 'test1', startTime: '12:00', reminder: true },
                dateStr
                // no reminderMinutes argument → should read from settings
            );

            expect(chrome.alarms.create).toHaveBeenCalled();
            // The alarm should fire 15 minutes before 12:00
            const alarmArgs = chrome.alarms.create.mock.calls[0][1];
            const expected = new Date(nextYear, 5, 15, 11, 45, 0).getTime();
            expect(alarmArgs.when).toBe(expected);
        });

        test('defaults to 5 minutes when settings have no reminderMinutes', async () => {
            // No reminderMinutes in storage
            const nextYear = new Date().getFullYear() + 1;
            const dateStr = `${nextYear}-06-15`;

            await AlarmManager.setReminder(
                { id: 'test1', startTime: '12:00', reminder: true },
                dateStr
            );

            const alarmArgs = chrome.alarms.create.mock.calls[0][1];
            const expected = new Date(nextYear, 5, 15, 11, 55, 0).getTime();
            expect(alarmArgs.when).toBe(expected);
        });
    });

    // ---------------------------------------------------------------
    // Time formatting utility
    // ---------------------------------------------------------------
    describe('time formatting', () => {
        test('extracts HH:mm from ISO datetime', () => {
            const date = new Date(2025, 2, 15, 14, 30, 0);
            expect(AlarmManager.formatTimeFromDateTime(date.toISOString())).toBe('14:30');
        });

        test('pads single-digit hours and minutes with zeros', () => {
            const date = new Date(2025, 0, 1, 9, 5, 0);
            expect(AlarmManager.formatTimeFromDateTime(date.toISOString())).toBe('09:05');
        });

        test('formats midnight as 00:00', () => {
            const date = new Date(2025, 5, 1, 0, 0, 0);
            expect(AlarmManager.formatTimeFromDateTime(date.toISOString())).toBe('00:00');
        });
    });
});
