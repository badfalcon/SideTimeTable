import { cleanupObsoleteStorageKeys } from '../../src/lib/storage-cleanup.js';
import { StorageHelper } from '../../src/lib/storage-helper.js';

describe('cleanupObsoleteStorageKeys', () => {
    beforeEach(() => {
        resetChromeStorage();
    });

    test('returns empty arrays when no obsolete keys exist', async () => {
        await StorageHelper.set({ openTime: '09:00', language: 'auto' });
        await StorageHelper.setLocal({ memoContent: 'hello' });

        const result = await cleanupObsoleteStorageKeys();

        expect(result.sync.removed).toEqual([]);
        expect(result.local.removed).toEqual([]);
    });

    test('removes obsolete sync keys', async () => {
        await StorageHelper.set({ openTime: '09:00', oldSetting: 'stale', legacyFlag: true });

        const result = await cleanupObsoleteStorageKeys();

        expect(result.sync.removed).toContain('oldSetting');
        expect(result.sync.removed).toContain('legacyFlag');
        // Valid key preserved
        const remaining = await StorageHelper.get(null, {});
        expect(remaining.openTime).toBe('09:00');
        expect(remaining.oldSetting).toBeUndefined();
    });

    test('removes obsolete local keys', async () => {
        await StorageHelper.setLocal({ memoContent: 'keep', unknownKey: 'remove' });

        const result = await cleanupObsoleteStorageKeys();

        expect(result.local.removed).toContain('unknownKey');
        const remaining = await StorageHelper.getLocal(null, {});
        expect(remaining.memoContent).toBe('keep');
        expect(remaining.unknownKey).toBeUndefined();
    });

    test('preserves localEvents_ prefix keys', async () => {
        await StorageHelper.setLocal({
            'localEvents_2025-03-21': [{ id: '1' }],
            'localEvents_2025-01-01': []
        });

        const result = await cleanupObsoleteStorageKeys();

        expect(result.local.removed).toEqual([]);
        const remaining = await StorageHelper.getLocal(null, {});
        expect(remaining['localEvents_2025-03-21']).toEqual([{ id: '1' }]);
        expect(remaining['localEvents_2025-01-01']).toEqual([]);
    });

    test('removes keys with valid prefix but invalid format', async () => {
        await StorageHelper.setLocal({
            'localEvents_not-a-date': 'bad',
            'localEvents_': 'empty',
            'localEvents_2025-03-21': [{ id: '1' }]
        });

        const result = await cleanupObsoleteStorageKeys();

        expect(result.local.removed).toContain('localEvents_not-a-date');
        expect(result.local.removed).toContain('localEvents_');
        const remaining = await StorageHelper.getLocal(null, {});
        expect(remaining['localEvents_2025-03-21']).toEqual([{ id: '1' }]);
        expect(remaining['localEvents_not-a-date']).toBeUndefined();
    });

    test('preserves all valid sync keys', async () => {
        const validSyncData = {
            googleIntegrated: true,
            openTime: '10:00',
            closeTime: '19:00',
            recurringEvents: [{ id: '1' }],
            lastSeenVersion: '1.0.0',
            initialSetupCompleted: true,
            tutorialCompleted: true,
            timeFormat: '24h',
            colorTheme: 'dark',
            darkMode: true
        };
        await StorageHelper.set(validSyncData);

        const result = await cleanupObsoleteStorageKeys();

        expect(result.sync.removed).toEqual([]);
        const remaining = await StorageHelper.get(null, {});
        expect(remaining).toEqual(validSyncData);
    });

    test('preserves all valid local keys', async () => {
        const validLocalData = {
            memoContent: 'test',
            memoCollapsed: false,
            memoHeight: 200,
            lastReminderSyncTime: 12345,
            reviewStats: { count: 1 },
            eventDataMigratedToLocal_v2: true,
            enableDeveloperFeatures: true,
            enableReminderDebug: false
        };
        await StorageHelper.setLocal(validLocalData);

        const result = await cleanupObsoleteStorageKeys();

        expect(result.local.removed).toEqual([]);
        const remaining = await StorageHelper.getLocal(null, {});
        expect(remaining).toEqual(validLocalData);
    });

    test('is idempotent - second run removes nothing', async () => {
        await StorageHelper.set({ openTime: '09:00', obsolete: 'value' });
        await StorageHelper.setLocal({ memoContent: 'hi', staleKey: 42 });

        const first = await cleanupObsoleteStorageKeys();
        expect(first.sync.removed).toContain('obsolete');
        expect(first.local.removed).toContain('staleKey');

        const second = await cleanupObsoleteStorageKeys();
        expect(second.sync.removed).toEqual([]);
        expect(second.local.removed).toEqual([]);
    });

    test('handles mixed valid and invalid keys in both storages', async () => {
        await StorageHelper.set({
            language: 'ja',
            colorTheme: 'dark',
            removedFeature: true,
            anotherOldKey: 'x'
        });
        await StorageHelper.setLocal({
            'localEvents_2025-06-15': [{ id: '1' }],
            memoHeight: 300,
            deprecatedLocal: 'old'
        });

        const result = await cleanupObsoleteStorageKeys();

        expect(result.sync.removed).toEqual(expect.arrayContaining(['removedFeature', 'anotherOldKey']));
        expect(result.sync.removed).toHaveLength(2);
        expect(result.local.removed).toEqual(['deprecatedLocal']);

        const syncRemaining = await StorageHelper.get(null, {});
        expect(syncRemaining.language).toBe('ja');
        expect(syncRemaining.colorTheme).toBe('dark');

        const localRemaining = await StorageHelper.getLocal(null, {});
        expect(localRemaining['localEvents_2025-06-15']).toEqual([{ id: '1' }]);
        expect(localRemaining.memoHeight).toBe(300);
    });
});
