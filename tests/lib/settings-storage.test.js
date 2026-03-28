import {
    saveSettings, loadSettings,
    saveSelectedCalendars, loadSelectedCalendars,
    saveCalendarGroups, loadCalendarGroups
} from '../../src/lib/settings-storage.js';
import { DEFAULT_SETTINGS } from '../../src/lib/constants.js';

describe('settings-storage', () => {
    beforeEach(() => {
        resetChromeStorage();
    });

    describe('saveSettings / loadSettings', () => {
        test('saves and loads settings', async () => {
            await saveSettings({ openTime: '08:00', closeTime: '17:00' });
            const result = await loadSettings();
            expect(result.openTime).toBe('08:00');
            expect(result.closeTime).toBe('17:00');
        });

        test('loadSettings returns defaults when nothing saved', async () => {
            const result = await loadSettings();
            expect(result.openTime).toBe(DEFAULT_SETTINGS.openTime);
            expect(result.closeTime).toBe(DEFAULT_SETTINGS.closeTime);
            expect(result.googleIntegrated).toBe(false);
        });

        test('saved values override defaults', async () => {
            await saveSettings({ googleIntegrated: true });
            const result = await loadSettings();
            expect(result.googleIntegrated).toBe(true);
        });

        test('accepts custom default settings', async () => {
            const custom = { myKey: 'myValue' };
            const result = await loadSettings(custom);
            expect(result.myKey).toBe('myValue');
        });
    });

    describe('saveSelectedCalendars / loadSelectedCalendars', () => {
        test('saves and loads calendar IDs', async () => {
            await saveSelectedCalendars(['cal1', 'cal2']);
            const result = await loadSelectedCalendars();
            expect(result).toEqual(['cal1', 'cal2']);
        });

        test('returns empty array when nothing saved', async () => {
            const result = await loadSelectedCalendars();
            expect(result).toEqual([]);
        });

        test('filters out non-string values', async () => {
            await saveSelectedCalendars(['cal1', 123, null, 'cal2']);
            const result = await loadSelectedCalendars();
            expect(result).toEqual(['cal1', 'cal2']);
        });

        test('returns empty array when stored value is not an array', async () => {
            await saveSettings({ selectedCalendars: 'not-an-array' });
            const result = await loadSelectedCalendars();
            expect(result).toEqual([]);
        });
    });

    describe('saveCalendarGroups / loadCalendarGroups', () => {
        test('saves and loads valid groups', async () => {
            const groups = [
                { id: 'g1', name: 'Work', calendarIds: ['cal1'], collapsed: false },
                { id: 'g2', name: 'Personal', calendarIds: ['cal2', 'cal3'], collapsed: true }
            ];
            await saveCalendarGroups(groups);
            const result = await loadCalendarGroups();
            expect(result).toEqual(groups);
        });

        test('returns empty array when nothing saved', async () => {
            const result = await loadCalendarGroups();
            expect(result).toEqual([]);
        });

        test('sanitizes malformed group data', async () => {
            // Directly save malformed data via StorageHelper
            await saveCalendarGroups([
                null,
                { id: 'g1', name: 123, calendarIds: 'bad' },
                { name: 'no-id' },
                { id: 'g2', name: 'OK', calendarIds: ['c1', 42], collapsed: 'yes' }
            ]);
            const result = await loadCalendarGroups();
            expect(result.length).toBe(2);
            // First valid: id=g1, name should be stringified or default
            expect(result[0].id).toBe('g1');
            expect(result[0].name).toBe('Group'); // non-string name → 'Group'
            expect(result[0].calendarIds).toEqual([]); // non-array → []
            expect(result[0].collapsed).toBe(false); // non-boolean → false
            // Second valid
            expect(result[1].id).toBe('g2');
            expect(result[1].name).toBe('OK');
            expect(result[1].calendarIds).toEqual(['c1']); // 42 filtered
            expect(result[1].collapsed).toBe(false); // 'yes' → false
        });

        test('truncates long group names', async () => {
            const longName = 'x'.repeat(100);
            await saveCalendarGroups([
                { id: 'g1', name: longName, calendarIds: [], collapsed: false }
            ]);
            const result = await loadCalendarGroups();
            expect(result[0].name.length).toBe(50);
        });
    });
});
