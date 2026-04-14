/**
 * Jest global setup - Chrome Extension API mocks
 *
 * Provides mock implementations of Chrome extension APIs
 * so that tests can run in a Node/jsdom environment.
 */

// In-memory storage backing stores
const syncStore = {};
const localStore = {};

function createStorageArea(store) {
  function _get(keys) {
    let result = {};
    if (keys === null) {
      Object.assign(result, store);
    } else if (typeof keys === 'string') {
      if (keys in store) result[keys] = store[keys];
    } else if (Array.isArray(keys)) {
      keys.forEach(k => { if (k in store) result[k] = store[k]; });
    } else if (typeof keys === 'object') {
      result = { ...keys };
      Object.keys(store).forEach(k => { if (k in keys) result[k] = store[k]; });
    }
    return result;
  }
  return {
    get(keys, callback) {
      const result = _get(keys);
      if (callback) { callback(result); return; }
      return Promise.resolve(result);
    },
    set(data, callback) {
      Object.assign(store, data);
      if (callback) { callback(); return; }
      return Promise.resolve();
    },
    remove(keys, callback) {
      const keyList = typeof keys === 'string' ? [keys] : keys;
      keyList.forEach(k => delete store[k]);
      if (callback) { callback(); return; }
      return Promise.resolve();
    },
    clear(callback) {
      Object.keys(store).forEach(k => delete store[k]);
      if (callback) { callback(); return; }
      return Promise.resolve();
    },
    getBytesInUse(keys, callback) {
      const size = JSON.stringify(store).length;
      if (callback) { callback(size); return; }
      return Promise.resolve(size);
    },
  };
}

global.chrome = {
  storage: {
    sync: createStorageArea(syncStore),
    local: createStorageArea(localStore),
  },
  runtime: {
    lastError: null,
    sendMessage: jest.fn((message, callback) => {
      if (callback) callback({});
    }),
    getURL: (path) => `chrome-extension://test-id${path}`,
  },
  identity: {
    getAuthToken: jest.fn((options, callback) => {
      callback('mock-token');
    }),
  },
  i18n: {
    getMessage: jest.fn((key) => key),
    getUILanguage: jest.fn(() => 'en'),
  },
  alarms: {
    create: jest.fn(() => Promise.resolve()),
    clear: jest.fn((name, callback) => { if (callback) { callback(true); return; } return Promise.resolve(true); }),
    getAll: jest.fn((callback) => { if (callback) { callback([]); return; } return Promise.resolve([]); }),
    onAlarm: { addListener: jest.fn() },
  },
  notifications: {
    create: jest.fn(),
    clear: jest.fn(),
    onClicked: { addListener: jest.fn() },
  },
};

// Browser API mocks for Node test environment
global.window = global;
global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
global.cancelAnimationFrame = (id) => clearTimeout(id);

/**
 * Helper to reset storage state between tests.
 * Call in beforeEach() when testing storage-dependent code.
 */
global.resetChromeStorage = () => {
  Object.keys(syncStore).forEach(k => delete syncStore[k]);
  Object.keys(localStore).forEach(k => delete localStore[k]);
  chrome.runtime.lastError = null;
};
