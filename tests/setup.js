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
  return {
    get(keys, callback) {
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
      callback(result);
    },
    set(data, callback) {
      Object.assign(store, data);
      if (callback) callback();
    },
    remove(keys, callback) {
      const keyList = typeof keys === 'string' ? [keys] : keys;
      keyList.forEach(k => delete store[k]);
      if (callback) callback();
    },
    clear(callback) {
      Object.keys(store).forEach(k => delete store[k]);
      if (callback) callback();
    },
    getBytesInUse(keys, callback) {
      callback(JSON.stringify(store).length);
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
    create: jest.fn(),
    clear: jest.fn((name, callback) => { if (callback) callback(true); }),
    getAll: jest.fn((callback) => callback([])),
    onAlarm: { addListener: jest.fn() },
  },
  notifications: {
    create: jest.fn(),
    clear: jest.fn(),
    onClicked: { addListener: jest.fn() },
  },
};

// Browser API mocks for Node test environment
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
