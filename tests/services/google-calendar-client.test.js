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

// ---------------------------------------------------------------
// SPEC: createEvent
// - POSTs to /calendars/{id}/events with a JSON body
// - Requires summary, start and end
// - Defaults to the 'primary' calendar when no id is given
// - 401/403 → AuthenticationError
// ---------------------------------------------------------------
describe('SPEC: createEvent', () => {
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

  const validResource = () => ({
    summary: 'Team sync',
    start: { dateTime: '2026-07-22T09:00:00+09:00' },
    end: { dateTime: '2026-07-22T10:00:00+09:00' },
  });

  describe('parameter validation', () => {
    test.each([
      { resource: null, label: 'null resource' },
      { resource: {}, label: 'empty resource' },
      { resource: { start: {}, end: {} }, label: 'missing summary' },
      { resource: { summary: 'x', end: {} }, label: 'missing start' },
      { resource: { summary: 'x', start: {} }, label: 'missing end' },
    ])('throws "Missing required parameters" when $label', async ({ resource }) => {
      await expect(client.createEvent('cal1', resource))
        .rejects.toThrow('Missing required parameters');
    });
  });

  test('POSTs the event resource to the target calendar', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ id: 'new-evt', htmlLink: 'https://cal' }),
    });

    const resource = validResource();
    const result = await client.createEvent('work@example.com', resource);

    expect(result).toEqual({ id: 'new-evt', htmlLink: 'https://cal' });
    expect(global.fetch).toHaveBeenCalledTimes(1);

    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toBe('https://www.googleapis.com/calendar/v3/calendars/work%40example.com/events');
    expect(options.method).toBe('POST');
    expect(options.headers['Content-Type']).toBe('application/json');
    expect(options.headers.Authorization).toBe('Bearer test-token');
    expect(JSON.parse(options.body)).toEqual(resource);
  });

  test('defaults to the primary calendar when no calendarId is given', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ id: 'new-evt' }),
    });

    await client.createEvent(null, validResource());

    const [url] = global.fetch.mock.calls[0];
    expect(url).toBe('https://www.googleapis.com/calendar/v3/calendars/primary/events');
  });

  test('does not add conferenceDataVersion when the event has no conferenceData', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true, status: 200, json: () => Promise.resolve({ id: 'e' }),
    });

    await client.createEvent('cal1', validResource());

    const [url] = global.fetch.mock.calls[0];
    expect(url).not.toContain('conferenceDataVersion');
  });

  test('sends conferenceDataVersion=1 when the event requests a Google Meet', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true, status: 200, json: () => Promise.resolve({ id: 'e', hangoutLink: 'https://meet' }),
    });

    const resource = {
      ...validResource(),
      conferenceData: {
        createRequest: { requestId: 'r1', conferenceSolutionKey: { type: 'hangoutsMeet' } },
      },
    };
    await client.createEvent('cal1', resource);

    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toBe('https://www.googleapis.com/calendar/v3/calendars/cal1/events?conferenceDataVersion=1');
    expect(JSON.parse(options.body).conferenceData.createRequest.conferenceSolutionKey.type).toBe('hangoutsMeet');
  });

  test('classifies a 403 response as an authentication error', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      text: () => Promise.resolve(''),
    });

    await expect(client.createEvent('cal1', validResource()))
      .rejects.toThrow(AuthenticationError);
  });

  test('classifies a 500 response as a generic error', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Server Error',
      text: () => Promise.resolve(''),
    });

    await expect(client.createEvent('cal1', validResource()))
      .rejects.toThrow(/Insert Event API error: 500/);
  });
});

// ---------------------------------------------------------------
// SPEC: patchEvent(calendarId, eventId, patchResource)
// - PATCHes to /calendars/{id}/events/{eventId} with a JSON body
// - Requires calendarId, eventId and a patch resource
// - 401/403 → AuthenticationError, others → generic Error
// ---------------------------------------------------------------
describe('SPEC: patchEvent', () => {
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

  const patchBody = () => ({
    summary: 'Renamed sync',
    start: { dateTime: '2026-07-23T09:00:00+09:00' },
    end: { dateTime: '2026-07-23T10:00:00+09:00' },
    description: '',
    location: 'Room B',
  });

  describe('parameter validation', () => {
    test.each([
      { calendarId: null, eventId: 'e1', resource: {}, label: 'missing calendarId' },
      { calendarId: 'c1', eventId: null, resource: {}, label: 'missing eventId' },
      { calendarId: 'c1', eventId: 'e1', resource: null, label: 'missing resource' },
      { calendarId: '', eventId: 'e1', resource: {}, label: 'empty calendarId' },
      { calendarId: 'c1', eventId: '', resource: {}, label: 'empty eventId' },
    ])('throws "Missing required parameters" when $label', async ({ calendarId, eventId, resource }) => {
      await expect(client.patchEvent(calendarId, eventId, resource))
        .rejects.toThrow('Missing required parameters');
    });
  });

  test('PATCHes the resource to the target event URL', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ id: 'evt1', summary: 'Renamed sync' }),
    });

    const resource = patchBody();
    const result = await client.patchEvent('work@example.com', 'evt/1', resource);

    expect(result).toEqual({ id: 'evt1', summary: 'Renamed sync' });
    expect(global.fetch).toHaveBeenCalledTimes(1);

    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toBe('https://www.googleapis.com/calendar/v3/calendars/work%40example.com/events/evt%2F1');
    expect(options.method).toBe('PATCH');
    expect(options.headers['Content-Type']).toBe('application/json');
    expect(options.headers.Authorization).toBe('Bearer test-token');
    expect(JSON.parse(options.body)).toEqual(resource);
  });

  test('classifies a 403 response as an authentication error', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      text: () => Promise.resolve(''),
    });

    await expect(client.patchEvent('cal1', 'evt1', patchBody()))
      .rejects.toThrow(AuthenticationError);
  });

  test('classifies a 500 response as a generic error', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Server Error',
      text: () => Promise.resolve(''),
    });

    await expect(client.patchEvent('cal1', 'evt1', patchBody()))
      .rejects.toThrow(/Update Event API error: 500/);
  });

  test('errors carry the HTTP status (used to tell 403 permission-denied from auth expiry)', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      text: () => Promise.resolve(''),
    });

    await expect(client.patchEvent('cal1', 'evt1', patchBody()))
      .rejects.toMatchObject({ status: 403 });
  });

  test('an empty patch object is accepted and sent as-is (no-op update)', () => {
    // Spec-pin: validation only rejects a missing resource, not an empty one.
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ id: 'evt1' }),
    });

    return client.patchEvent('cal1', 'evt1', {}).then(() => {
      const [, options] = global.fetch.mock.calls[0];
      expect(options.body).toBe('{}');
    });
  });
});

// ---------------------------------------------------------------
// SPEC: deleteEvent(calendarId, eventId)
// - DELETEs /calendars/{id}/events/{eventId}
// - The API returns 204 No Content — the response body is never parsed
// - Requires calendarId and eventId
// - 401/403 → AuthenticationError, others → generic Error
// ---------------------------------------------------------------
describe('SPEC: deleteEvent', () => {
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
      { calendarId: null, eventId: 'e1', label: 'missing calendarId' },
      { calendarId: 'c1', eventId: null, label: 'missing eventId' },
      { calendarId: '', eventId: 'e1', label: 'empty calendarId' },
      { calendarId: 'c1', eventId: '', label: 'empty eventId' },
    ])('throws "Missing required parameters" when $label', async ({ calendarId, eventId }) => {
      await expect(client.deleteEvent(calendarId, eventId))
        .rejects.toThrow('Missing required parameters');
    });
  });

  test('DELETEs the target event URL and tolerates a 204 empty body', async () => {
    // No json() on the mock: parsing the body of a 204 would throw
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 204,
      statusText: 'No Content',
    });

    await expect(client.deleteEvent('work@example.com', 'evt/1')).resolves.toBeUndefined();

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toBe('https://www.googleapis.com/calendar/v3/calendars/work%40example.com/events/evt%2F1');
    expect(options.method).toBe('DELETE');
    expect(options.headers.Authorization).toBe('Bearer test-token');
  });

  test('classifies a 403 response as an authentication error', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      text: () => Promise.resolve(''),
    });

    await expect(client.deleteEvent('cal1', 'evt1'))
      .rejects.toThrow(AuthenticationError);
  });

  test('classifies a 500 response as a generic error', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Server Error',
      text: () => Promise.resolve(''),
    });

    await expect(client.deleteEvent('cal1', 'evt1'))
      .rejects.toThrow(/Delete Event API error: 500/);
  });

  test.each([404, 410])(
    'treats %i (event already deleted elsewhere) as success', async (status) => {
      // The user wanted the event gone and it is — reporting failure would
      // leave a phantom event on the timeline and invite retries.
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status,
        statusText: status === 404 ? 'Not Found' : 'Gone',
        text: () => Promise.resolve(''),
      });

      await expect(client.deleteEvent('cal1', 'evt1')).resolves.toBeUndefined();
    }
  );
});

// ---------------------------------------------------------------
// SPEC: getCalendarList
// - Maps each calendar to {id, summary, primary, accessRole, colors}.
//   accessRole is load-bearing: the entire writable-calendar feature
//   (create destination picker, edit/delete gating) filters on it.
// - Calendars with accessRole 'none' (or missing) are dropped.
// ---------------------------------------------------------------
describe('SPEC: getCalendarList', () => {
  let client;
  let originalFetch;

  beforeEach(() => {
    resetChromeStorage();
    client = new GoogleCalendarClient();
    originalFetch = global.fetch;
    chrome.identity.getAuthToken.mockReset();
    chrome.identity.getAuthToken.mockImplementation((opts, cb) => cb('test-token'));
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test('maps accessRole through for each calendar and drops inaccessible ones', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        items: [
          { id: 'own@x.com', summary: 'Mine', primary: true, accessRole: 'owner', backgroundColor: '#a', foregroundColor: '#b' },
          { id: 'team@x.com', summary: 'Team', accessRole: 'writer' },
          { id: 'holidays@x.com', summary: 'Holidays', accessRole: 'reader' },
          { id: 'hidden@x.com', summary: 'Hidden', accessRole: 'none' },
          { id: 'broken@x.com', summary: 'Broken' },
        ],
      }),
    });

    const calendars = await client.getCalendarList();

    expect(calendars).toEqual([
      { id: 'own@x.com', summary: 'Mine', primary: true, accessRole: 'owner', backgroundColor: '#a', foregroundColor: '#b' },
      { id: 'team@x.com', summary: 'Team', primary: false, accessRole: 'writer', backgroundColor: undefined, foregroundColor: undefined },
      { id: 'holidays@x.com', summary: 'Holidays', primary: false, accessRole: 'reader', backgroundColor: undefined, foregroundColor: undefined },
    ]);
  });
});
