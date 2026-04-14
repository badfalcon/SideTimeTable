import { AuthenticationError, GoogleCalendarClient } from '../../src/services/google-calendar-client.js';

// ── AuthenticationError ────────────────────────────────────────────

describe('AuthenticationError', () => {
  test('is an instance of Error', () => {
    const err = new AuthenticationError('token revoked');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AuthenticationError);
  });

  test('has name "AuthenticationError"', () => {
    const err = new AuthenticationError('msg');
    expect(err.name).toBe('AuthenticationError');
  });

  test('preserves the message', () => {
    const err = new AuthenticationError('token expired');
    expect(err.message).toBe('token expired');
  });
});

// ── _checkResponse ─────────────────────────────────────────────────

describe('GoogleCalendarClient._checkResponse', () => {
  let client;

  beforeEach(() => {
    client = new GoogleCalendarClient();
  });

  function mockResponse(status, ok = status >= 200 && status < 300) {
    return {
      ok,
      status,
      statusText: ok ? 'OK' : 'Error',
      text: jest.fn().mockResolvedValue('error body'),
    };
  }

  test('does nothing for a successful response', async () => {
    const res = mockResponse(200);
    await expect(client._checkResponse(res, 'Test')).resolves.toBeUndefined();
  });

  test('throws AuthenticationError for 401', async () => {
    const res = mockResponse(401);
    await expect(client._checkResponse(res, 'API'))
      .rejects.toThrow(AuthenticationError);
  });

  test('throws AuthenticationError for 403', async () => {
    const res = mockResponse(403);
    await expect(client._checkResponse(res, 'API'))
      .rejects.toThrow(AuthenticationError);
  });

  test('throws generic Error for other failures (e.g. 500)', async () => {
    const res = mockResponse(500);
    await expect(client._checkResponse(res, 'API'))
      .rejects.toThrow(Error);
    await expect(client._checkResponse(res, 'API'))
      .rejects.not.toThrow(AuthenticationError);
  });

  test('includes label and status in the error message', async () => {
    const res = mockResponse(401);
    await expect(client._checkResponse(res, 'CalendarList API'))
      .rejects.toThrow(/CalendarList API error: 401/);
  });
});

// ── checkAuth ──────────────────────────────────────────────────────

describe('GoogleCalendarClient.checkAuth', () => {
  let client;
  let originalFetch;

  beforeEach(() => {
    client = new GoogleCalendarClient();
    originalFetch = global.fetch;
    // Reset Chrome identity mock
    chrome.identity.getAuthToken.mockReset();
    chrome.identity.removeCachedAuthToken = jest.fn((opts, cb) => cb && cb());
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test('returns true when token is valid', async () => {
    chrome.identity.getAuthToken.mockImplementation((opts, cb) => cb('valid-token'));
    global.fetch = jest.fn().mockResolvedValue({ status: 200, ok: true });

    expect(await client.checkAuth()).toBe(true);
  });

  test('returns false when no token is available', async () => {
    chrome.identity.getAuthToken.mockImplementation((opts, cb) => {
      chrome.runtime.lastError = { message: 'No token' };
      cb(null);
      chrome.runtime.lastError = null;
    });

    expect(await client.checkAuth()).toBe(false);
  });

  test('returns false and clears token on 401', async () => {
    chrome.identity.getAuthToken.mockImplementation((opts, cb) => cb('stale-token'));
    global.fetch = jest.fn().mockResolvedValue({ status: 401, ok: false });

    expect(await client.checkAuth()).toBe(false);
    expect(chrome.identity.removeCachedAuthToken)
      .toHaveBeenCalledWith({ token: 'stale-token' }, expect.any(Function));
  });

  test('returns false and clears token on 403', async () => {
    chrome.identity.getAuthToken.mockImplementation((opts, cb) => cb('stale-token'));
    global.fetch = jest.fn().mockResolvedValue({ status: 403, ok: false });

    expect(await client.checkAuth()).toBe(false);
    expect(chrome.identity.removeCachedAuthToken).toHaveBeenCalled();
  });

  test('returns false on network error', async () => {
    chrome.identity.getAuthToken.mockImplementation((opts, cb) => cb('token'));
    global.fetch = jest.fn().mockRejectedValue(new Error('Network failure'));

    expect(await client.checkAuth()).toBe(false);
  });

  test('uses non-interactive token request', async () => {
    chrome.identity.getAuthToken.mockImplementation((opts, cb) => cb('token'));
    global.fetch = jest.fn().mockResolvedValue({ status: 200, ok: true });

    await client.checkAuth();

    expect(chrome.identity.getAuthToken).toHaveBeenCalledWith(
      { interactive: false },
      expect.any(Function)
    );
  });
});
