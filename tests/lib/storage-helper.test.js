import { StorageHelper } from '../../src/lib/storage-helper.js';

describe('StorageHelper', () => {
  beforeEach(() => {
    resetChromeStorage();
  });

  describe('sync storage (get/set/remove/clear)', () => {
    test('set and get data', async () => {
      await StorageHelper.set({ key1: 'value1', key2: 42 });
      const result = await StorageHelper.get(['key1', 'key2'], {});
      expect(result.key1).toBe('value1');
      expect(result.key2).toBe(42);
    });

    test('get returns defaults for missing keys', async () => {
      const result = await StorageHelper.get(['missing'], { missing: 'default' });
      expect(result.missing).toBe('default');
    });

    test('get merges stored data over defaults', async () => {
      await StorageHelper.set({ key1: 'stored' });
      const result = await StorageHelper.get(['key1'], { key1: 'default' });
      expect(result.key1).toBe('stored');
    });

    test('remove deletes specified keys', async () => {
      await StorageHelper.set({ a: 1, b: 2, c: 3 });
      await StorageHelper.remove(['a', 'c']);
      const result = await StorageHelper.get(null, {});
      expect(result.a).toBeUndefined();
      expect(result.b).toBe(2);
      expect(result.c).toBeUndefined();
    });

    test('remove accepts a single string key', async () => {
      await StorageHelper.set({ a: 1 });
      await StorageHelper.remove('a');
      const result = await StorageHelper.get(['a'], {});
      expect(result.a).toBeUndefined();
    });

    test('clear removes all data', async () => {
      await StorageHelper.set({ a: 1, b: 2 });
      await StorageHelper.clear();
      const result = await StorageHelper.get(null, {});
      expect(Object.keys(result)).toHaveLength(0);
    });

    test('get with null keys returns all data', async () => {
      await StorageHelper.set({ x: 10, y: 20 });
      const result = await StorageHelper.get(null, {});
      expect(result.x).toBe(10);
      expect(result.y).toBe(20);
    });

    test('set overwrites existing keys', async () => {
      await StorageHelper.set({ key: 'old' });
      await StorageHelper.set({ key: 'new' });
      const result = await StorageHelper.get(['key'], {});
      expect(result.key).toBe('new');
    });

    test('handles complex objects', async () => {
      const data = { nested: { arr: [1, 2, 3], bool: true } };
      await StorageHelper.set(data);
      const result = await StorageHelper.get(['nested'], {});
      expect(result.nested).toEqual({ arr: [1, 2, 3], bool: true });
    });
  });

  describe('local storage (getLocal/setLocal)', () => {
    test('setLocal and getLocal data', async () => {
      await StorageHelper.setLocal({ localKey: 'localValue' });
      const result = await StorageHelper.getLocal(['localKey'], {});
      expect(result.localKey).toBe('localValue');
    });

    test('getLocal returns defaults for missing keys', async () => {
      const result = await StorageHelper.getLocal(['missing'], { missing: 'fallback' });
      expect(result.missing).toBe('fallback');
    });

    test('sync and local storage are independent', async () => {
      await StorageHelper.set({ shared: 'sync' });
      await StorageHelper.setLocal({ shared: 'local' });

      const syncResult = await StorageHelper.get(['shared'], {});
      const localResult = await StorageHelper.getLocal(['shared'], {});

      expect(syncResult.shared).toBe('sync');
      expect(localResult.shared).toBe('local');
    });

    test('get does not return data stored only in local', async () => {
      await StorageHelper.setLocal({ onlyLocal: 'value' });
      const result = await StorageHelper.get(['onlyLocal'], {});
      expect(result.onlyLocal).toBeUndefined();
    });

    test('getLocal does not return data stored only in sync', async () => {
      await StorageHelper.set({ onlySync: 'value' });
      const result = await StorageHelper.getLocal(['onlySync'], {});
      expect(result.onlySync).toBeUndefined();
    });
  });

  describe('getBytesInUse', () => {
    test('returns a number', async () => {
      await StorageHelper.set({ data: 'test' });
      const bytes = await StorageHelper.getBytesInUse();
      expect(typeof bytes).toBe('number');
      expect(bytes).toBeGreaterThan(0);
    });
  });

  describe('error handling', () => {
    afterEach(() => { chrome.runtime.lastError = null; });

    test('get rejects when chrome.runtime.lastError is set', async () => {
      chrome.runtime.lastError = { message: 'Storage error' };
      await expect(StorageHelper.get(['key'], {})).rejects.toEqual({ message: 'Storage error' });
    });

    test('set rejects when chrome.runtime.lastError is set', async () => {
      chrome.runtime.lastError = { message: 'Quota exceeded' };
      await expect(StorageHelper.set({ key: 'value' })).rejects.toEqual({ message: 'Quota exceeded' });
    });

    test('remove rejects when chrome.runtime.lastError is set', async () => {
      chrome.runtime.lastError = { message: 'Permission denied' };
      await expect(StorageHelper.remove(['key'])).rejects.toEqual({ message: 'Permission denied' });
    });

    test('clear rejects when chrome.runtime.lastError is set', async () => {
      chrome.runtime.lastError = { message: 'Storage error' };
      await expect(StorageHelper.clear()).rejects.toEqual({ message: 'Storage error' });
    });

    test('getBytesInUse rejects when chrome.runtime.lastError is set', async () => {
      chrome.runtime.lastError = { message: 'Quota error' };
      await expect(StorageHelper.getBytesInUse()).rejects.toEqual({ message: 'Quota error' });
    });

    test('getLocal rejects when chrome.runtime.lastError is set', async () => {
      chrome.runtime.lastError = { message: 'Local storage error' };
      await expect(StorageHelper.getLocal(['key'], {})).rejects.toEqual({ message: 'Local storage error' });
    });

    test('setLocal rejects when chrome.runtime.lastError is set', async () => {
      chrome.runtime.lastError = { message: 'Local quota exceeded' };
      await expect(StorageHelper.setLocal({ key: 'value' })).rejects.toEqual({ message: 'Local quota exceeded' });
    });
  });
});
