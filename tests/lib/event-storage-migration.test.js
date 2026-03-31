/**
 * Tests for event-storage.js migrateEventDataToLocal and save functions
 * (Supplements the existing event-storage coverage in utils.test.js)
 */
import {
    migrateEventDataToLocal,
    saveLocalEventsForDate,
    loadLocalEventsForDate,
    loadRecurringEvents,
    saveRecurringEvents,
    addRecurringEventException,
    deleteRecurringEvent,
    loadLocalEvents
} from '../../src/lib/event-storage.js';
import { StorageHelper } from '../../src/lib/storage-helper.js';

describe('event-storage (migration & CRUD)', () => {
    beforeEach(() => {
        resetChromeStorage();
    });

    // ---------------------------------------------------------------
    // SPEC: Migration (v2)
    // - Moves localEvents_* from sync to local (one-time)
    // - Restores recurringEvents from local to sync if sync empty
    // - Does NOT overwrite existing sync recurring events
    // - Sets flag to prevent re-running
    // ---------------------------------------------------------------
    describe('SPEC: migrateEventDataToLocal', () => {
        test('migrates sync localEvents_ keys to local storage', async () => {
            // Set up per-date events in sync storage
            await StorageHelper.set({
                'localEvents_2025-03-15': [{ id: '1', title: 'A' }],
                'localEvents_2025-03-16': [{ id: '2', title: 'B' }]
            });

            await migrateEventDataToLocal();

            // Should be in local now
            const local15 = await StorageHelper.getLocal(['localEvents_2025-03-15'], {});
            expect(local15['localEvents_2025-03-15']).toEqual([{ id: '1', title: 'A' }]);

            // Should be removed from sync
            const sync15 = await StorageHelper.get(['localEvents_2025-03-15'], {});
            expect(sync15['localEvents_2025-03-15']).toBeUndefined();
        });

        test('does not migrate twice', async () => {
            await StorageHelper.set({
                'localEvents_2025-03-15': [{ id: '1', title: 'A' }]
            });

            await migrateEventDataToLocal();
            // Clear local event data but keep migration flag
            await StorageHelper.setLocal({ 'localEvents_2025-03-15': [] });

            // Add new data to sync
            await StorageHelper.set({
                'localEvents_2025-03-17': [{ id: '3', title: 'C' }]
            });

            // Run migration again
            await migrateEventDataToLocal();

            // New data should NOT have been migrated
            const local17 = await StorageHelper.getLocal(['localEvents_2025-03-17'], {});
            expect(local17['localEvents_2025-03-17']).toBeUndefined();
        });

        test('restores recurring events from local to sync if sync is empty', async () => {
            const recurring = [{ id: 'r1', title: 'Standup', recurrence: { type: 'daily' } }];
            await StorageHelper.setLocal({ recurringEvents: recurring });

            await migrateEventDataToLocal();

            // Should be in sync now
            const syncData = await StorageHelper.get(['recurringEvents'], {});
            expect(syncData.recurringEvents).toEqual(recurring);
        });

        test('does not overwrite sync recurring events if they exist', async () => {
            const syncRecurring = [{ id: 'sr1', title: 'Sync Standup' }];
            const localRecurring = [{ id: 'lr1', title: 'Local Standup' }];
            await StorageHelper.set({ recurringEvents: syncRecurring });
            await StorageHelper.setLocal({ recurringEvents: localRecurring });

            await migrateEventDataToLocal();

            const syncData = await StorageHelper.get(['recurringEvents'], {});
            expect(syncData.recurringEvents).toEqual(syncRecurring);
        });

        test('handles empty storage gracefully', async () => {
            await expect(migrateEventDataToLocal()).resolves.toBeUndefined();
        });
    });

    // ---------------------------------------------------------------
    // SPEC: Storage Locations — date-specific in local, recurring in sync
    // ---------------------------------------------------------------
    describe('SPEC: date-specific event storage', () => {
        test('saves and loads date-specific events', async () => {
            const date = new Date(2025, 2, 15);
            const events = [{ id: 'e1', title: 'Event1' }];
            await saveLocalEventsForDate(events, date);

            // Loading includes recurring events too, mock empty recurring
            await StorageHelper.set({ recurringEvents: [] });
            const loaded = await loadLocalEventsForDate(date);
            expect(loaded.find(e => e.id === 'e1')).toBeTruthy();
        });
    });

    describe('loadLocalEvents', () => {
        test('loads events for today', async () => {
            // Just ensure it doesn't throw
            await StorageHelper.set({ recurringEvents: [] });
            const result = await loadLocalEvents();
            expect(Array.isArray(result)).toBe(true);
        });
    });

    // ---------------------------------------------------------------
    // SPEC: Exceptions
    // - If target date is in exceptions → event does not appear
    // - Adding same exception twice → only stored once
    // ---------------------------------------------------------------
    describe('SPEC: recurring event exceptions', () => {
        test('adds exception date to recurring event', async () => {
            const events = [{
                id: 'r1',
                title: 'Daily',
                recurrence: { type: 'daily', startDate: '2025-03-01' }
            }];
            await StorageHelper.set({ recurringEvents: events });

            await addRecurringEventException('r1', '2025-03-15');

            const updated = await loadRecurringEvents();
            expect(updated[0].recurrence.exceptions).toContain('2025-03-15');
        });

        test('does not add duplicate exception', async () => {
            const events = [{
                id: 'r1',
                title: 'Daily',
                recurrence: { type: 'daily', startDate: '2025-03-01', exceptions: ['2025-03-15'] }
            }];
            await StorageHelper.set({ recurringEvents: events });

            await addRecurringEventException('r1', '2025-03-15');

            const updated = await loadRecurringEvents();
            expect(updated[0].recurrence.exceptions.filter(e => e === '2025-03-15').length).toBe(1);
        });

        test('does nothing for nonexistent event', async () => {
            await StorageHelper.set({ recurringEvents: [] });
            await expect(addRecurringEventException('noexist', '2025-03-15')).resolves.toBeUndefined();
        });
    });

    describe('SPEC: deleteRecurringEvent', () => {
        test('removes event by id', async () => {
            const events = [
                { id: 'r1', title: 'A' },
                { id: 'r2', title: 'B' }
            ];
            await StorageHelper.set({ recurringEvents: events });

            await deleteRecurringEvent('r1');

            const updated = await loadRecurringEvents();
            expect(updated.length).toBe(1);
            expect(updated[0].id).toBe('r2');
        });
    });

    describe('SPEC: recurring events round-trip', () => {
        test('round-trips recurring events', async () => {
            const events = [{ id: 'r1', title: 'Standup', recurrence: { type: 'daily' } }];
            await saveRecurringEvents(events);
            const loaded = await loadRecurringEvents();
            expect(loaded).toEqual(events);
        });

        test('returns empty array when nothing stored', async () => {
            const loaded = await loadRecurringEvents();
            expect(loaded).toEqual([]);
        });
    });
});
