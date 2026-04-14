import { AuthenticationError, GoogleCalendarClient } from '../../src/services/google-calendar-client.js';

// ---------------------------------------------------------------
// SPEC: AuthenticationError
// - Extends Error, name is "AuthenticationError"
// ---------------------------------------------------------------
describe('SPEC: AuthenticationError', () => {
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

// ---------------------------------------------------------------
// SPEC: API Response Error Classification
// - 401/403 → AuthenticationError, 500 → generic Error
// ---------------------------------------------------------------
describe('SPEC: API response error classification', () => {
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

// ---------------------------------------------------------------
// SPEC: checkAuth()
// - true when token valid, false on no token / revoked / network failure
// - Non-interactive mode, clears stale token on revocation
// ---------------------------------------------------------------
describe('SPEC: checkAuth', () => {
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

// ---------------------------------------------------------------
// SPEC: respondToEvent(calendarId, eventId, response)
// - Required parameters: calendarId, eventId, response — all must be truthy
// - Missing any → throws Error("Missing required parameters")
// - Valid response values: "accepted", "declined", "tentative"
// - Invalid response → throws Error("Invalid response status")
// - Self attendee not found → throws Error("Self attendee not found in event")
// ---------------------------------------------------------------
describe('SPEC: respondToEvent', () => {
  let client;
  let originalFetch;

  beforeEach(() => {
    client = new GoogleCalendarClient();
    originalFetch = global.fetch;
    chrome.identity.getAuthToken.mockReset();
    chrome.identity.getAuthToken.mockImplementation((opts, cb) => cb('test-token'));
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('parameter validation', () => {
    test.each([
      { calendarId: null, eventId: 'e1', response: 'accepted', label: 'missing calendarId' },
      { calendarId: 'c1', eventId: null, response: 'accepted', label: 'missing eventId' },
      { calendarId: 'c1', eventId: 'e1', response: null, label: 'missing response' },
      { calendarId: '', eventId: 'e1', response: 'accepted', label: 'empty calendarId' },
      { calendarId: 'c1', eventId: '', response: 'accepted', label: 'empty eventId' },
      { calendarId: 'c1', eventId: 'e1', response: '', label: 'empty response' },
    ])('throws "Missing required parameters" when $label', async ({ calendarId, eventId, response }) => {
      await expect(client.respondToEvent(calendarId, eventId, response))
        .rejects.toThrow('Missing required parameters');
    });
  });

  describe('response status validation', () => {
    test.each(['accepted', 'declined', 'tentative'])(
      'accepts valid response "%s"', async (status) => {
        global.fetch = jest.fn()
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({
              attendees: [{ self: true, responseStatus: 'needsAction' }],
            }),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ attendees: [{ self: true, responseStatus: status }] }),
          });

        await expect(client.respondToEvent('cal1', 'evt1', status)).resolves.toBeDefined();
      }
    );

    test.each(['maybe', 'yes', 'no', 'ACCEPTED', 'Declined'])(
      'throws "Invalid response status" for "%s"', async (status) => {
        await expect(client.respondToEvent('cal1', 'evt1', status))
          .rejects.toThrow('Invalid response status');
      }
    );
  });

  test('throws when self attendee is not found in event', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        attendees: [{ email: 'other@example.com', responseStatus: 'accepted' }],
      }),
    });

    await expect(client.respondToEvent('cal1', 'evt1', 'accepted'))
      .rejects.toThrow('Self attendee not found in event');
  });

  test('throws when event has no attendees', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    });

    await expect(client.respondToEvent('cal1', 'evt1', 'accepted'))
      .rejects.toThrow('Self attendee not found in event');
  });
});
