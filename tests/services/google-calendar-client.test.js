import { AuthenticationError, GoogleCalendarClient } from '../../src/services/google-calendar-client.js';

// ── AuthenticationError ────────────────────────────────────────────

describe('AuthenticationError', () => {
  test('can be distinguished from generic errors via instanceof', () => {
    const authErr = new AuthenticationError('token revoked');
    const genericErr = new Error('network timeout');

    expect(authErr).toBeInstanceOf(Error);
    expect(authErr).toBeInstanceOf(AuthenticationError);
    expect(genericErr).not.toBeInstanceOf(AuthenticationError);
  });

  test('carries the error name for serialization across message boundaries', () => {
    const err = new AuthenticationError('expired');
    expect(err.name).toBe('AuthenticationError');
    expect(err.message).toBe('expired');
  });
});

// ── API response error classification ──────────────────────────────

describe('API response error classification', () => {
  let client;

  beforeEach(() => {
    client = new GoogleCalendarClient();
  });

  function mockResponse(status) {
    return {
      ok: status >= 200 && status < 300,
      status,
      statusText: status === 401 ? 'Unauthorized' : status === 403 ? 'Forbidden' : 'Error',
      text: jest.fn().mockResolvedValue(''),
    };
  }

  test('successful responses are accepted without error', async () => {
    await expect(client._checkResponse(mockResponse(200), 'API'))
      .resolves.toBeUndefined();
  });

  test('401 Unauthorized is classified as an authentication error', async () => {
    await expect(client._checkResponse(mockResponse(401), 'API'))
      .rejects.toThrow(AuthenticationError);
  });

  test('403 Forbidden is classified as an authentication error', async () => {
    await expect(client._checkResponse(mockResponse(403), 'API'))
      .rejects.toThrow(AuthenticationError);
  });

  test('server errors (e.g. 500) are not classified as authentication errors', async () => {
    await expect(client._checkResponse(mockResponse(500), 'API'))
      .rejects.toThrow(Error);
    await expect(client._checkResponse(mockResponse(500), 'API'))
      .rejects.not.toThrow(AuthenticationError);
  });

  test('error message includes the API label and HTTP status', async () => {
    await expect(client._checkResponse(mockResponse(401), 'CalendarList API'))
      .rejects.toThrow(/CalendarList API error: 401/);
  });
});

// ── checkAuth (token validation) ───────────────────────────────────

describe('checkAuth', () => {
  let client;
  let originalFetch;

  beforeEach(() => {
    client = new GoogleCalendarClient();
    originalFetch = global.fetch;
    chrome.identity.getAuthToken.mockReset();
    chrome.identity.removeCachedAuthToken = jest.fn((opts, cb) => cb && cb());
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test('reports authenticated when the token is valid', async () => {
    chrome.identity.getAuthToken.mockImplementation((opts, cb) => cb('valid-token'));
    global.fetch = jest.fn().mockResolvedValue({ status: 200, ok: true });

    expect(await client.checkAuth()).toBe(true);
  });

  test('reports unauthenticated when no token exists', async () => {
    chrome.identity.getAuthToken.mockImplementation((opts, cb) => {
      chrome.runtime.lastError = { message: 'No token' };
      cb(null);
      chrome.runtime.lastError = null;
    });

    expect(await client.checkAuth()).toBe(false);
  });

  test('reports unauthenticated when the token is revoked (401)', async () => {
    chrome.identity.getAuthToken.mockImplementation((opts, cb) => cb('stale-token'));
    global.fetch = jest.fn().mockResolvedValue({ status: 401, ok: false });

    expect(await client.checkAuth()).toBe(false);
  });

  test('clears the stale cached token on revocation', async () => {
    chrome.identity.getAuthToken.mockImplementation((opts, cb) => cb('stale-token'));
    global.fetch = jest.fn().mockResolvedValue({ status: 401, ok: false });

    await client.checkAuth();

    expect(chrome.identity.removeCachedAuthToken)
      .toHaveBeenCalledWith({ token: 'stale-token' }, expect.any(Function));
  });

  test('reports unauthenticated on network failure without throwing', async () => {
    chrome.identity.getAuthToken.mockImplementation((opts, cb) => cb('token'));
    global.fetch = jest.fn().mockRejectedValue(new Error('Network failure'));

    expect(await client.checkAuth()).toBe(false);
  });

  test('does not prompt the user for login (non-interactive)', async () => {
    chrome.identity.getAuthToken.mockImplementation((opts, cb) => cb('token'));
    global.fetch = jest.fn().mockResolvedValue({ status: 200, ok: true });

    await client.checkAuth();

    expect(chrome.identity.getAuthToken).toHaveBeenCalledWith(
      { interactive: false },
      expect.any(Function)
    );
  });
});
