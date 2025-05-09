const chromeMock = {
  runtime: {
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    },
    getURL: jest.fn(path => `chrome-extension://mock-extension-id/${path}`)
  },
  storage: {
    sync: {
      get: jest.fn(),
      set: jest.fn()
    },
    local: {
      get: jest.fn(),
      set: jest.fn()
    }
  },
  identity: {
    getAuthToken: jest.fn(),
    removeCachedAuthToken: jest.fn()
  },
  sidePanel: {
    open: jest.fn(),
    setOptions: jest.fn()
  }
};

module.exports = chromeMock;
