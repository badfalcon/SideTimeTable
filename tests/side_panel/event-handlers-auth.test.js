/**
 * Tests for GoogleEventManager — auth expiry behavior
 *
 * These tests describe WHAT the manager does from its callers' perspective,
 * not HOW it tracks state internally.
 */

jest.mock('../../src/lib/settings-storage.js', () => ({
  loadSettings: jest.fn(),
  loadSelectedCalendars: jest.fn(),
}));
jest.mock('../../src/lib/chrome-messaging.js', () => ({
  sendMessage: jest.fn(),
}));
jest.mock('../../src/lib/demo-data.js', () => ({
  isDemoMode: jest.fn(() => false),
  getDemoEvents: jest.fn(),
  getDemoLocalEvents: jest.fn(),
}));
jest.mock('../../src/lib/utils.js', () => ({
  logError: jest.fn(),
}));
jest.mock('../../src/lib/event-storage.js', () => ({
  loadLocalEvents: jest.fn(),
  loadLocalEventsForDate: jest.fn(),
}));
jest.mock('../../src/side_panel/event-element-factory.js', () => ({
  EVENT_STYLING: { DEFAULT_VALUES: { ZERO_DURATION_MINUTES: 30 } },
  onClickOnly: jest.fn(),
  resolveLocaleSettings: jest.fn().mockResolvedValue(['en', '12h']),
  EventElementFactory: { createEventElement: jest.fn(), createPrimaryLine: jest.fn() },
}));

import { GoogleEventManager } from '../../src/side_panel/event-handlers.js';
import { loadSettings } from '../../src/lib/settings-storage.js';
import { sendMessage } from '../../src/lib/chrome-messaging.js';

function createManager() {
  return new GoogleEventManager(
    { innerHTML: '', appendChild: jest.fn() },
    null
  );
}

function mockGoogleIntegrated() {
  loadSettings.mockResolvedValue({
    googleIntegrated: true,
    useGoogleCalendarColors: true,
  });
}

describe('GoogleEventManager — auth expiry behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------
  // SPEC: Auth Expiry Detection
  // - authExpired: true → calls onAuthExpired
  // - non-auth error → does NOT call onAuthExpired
  // ---------------------------------------------------------------
  test('notifies the caller when authentication expires', async () => {
    const manager = createManager();
    mockGoogleIntegrated();
    sendMessage.mockResolvedValue({ error: 'Token revoked', authExpired: true });

    const onAuthExpired = jest.fn();
    manager.onAuthExpired = onAuthExpired;

    await manager.fetchEvents(new Date());

    expect(onAuthExpired).toHaveBeenCalledTimes(1);
  });

  test('does not notify when the error is not auth-related', async () => {
    const manager = createManager();
    mockGoogleIntegrated();
    sendMessage.mockResolvedValue({ error: 'Timeout', authExpired: false });

    const onAuthExpired = jest.fn();
    manager.onAuthExpired = onAuthExpired;

    await manager.fetchEvents(new Date());

    expect(onAuthExpired).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------
  // SPEC: Fetch Suppression
  // - After auth expiry → stops fetching
  // - Not integrated → does not fetch
  // ---------------------------------------------------------------
  test('stops fetching Google events after auth expiry is detected', async () => {
    const manager = createManager();
    mockGoogleIntegrated();
    sendMessage.mockResolvedValue({ error: 'Revoked', authExpired: true });
    manager.onAuthExpired = jest.fn();

    await manager.fetchEvents(new Date());
    sendMessage.mockClear();

    // Subsequent fetch should not contact the API
    await manager.fetchEvents(new Date());
    expect(sendMessage).not.toHaveBeenCalled();
  });

  test('does not fetch when Google Calendar is not integrated', async () => {
    const manager = createManager();
    loadSettings.mockResolvedValue({ googleIntegrated: false });

    await manager.fetchEvents(new Date());

    expect(sendMessage).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------
  // SPEC: Recovery — resetAuthState() resumes fetching
  // ---------------------------------------------------------------
  test('resumes fetching after resetAuthState is called', async () => {
    const manager = createManager();
    mockGoogleIntegrated();
    sendMessage
      .mockResolvedValueOnce({ error: 'Revoked', authExpired: true })
      .mockResolvedValueOnce({ events: [] });
    manager.onAuthExpired = jest.fn();

    // Auth expires
    await manager.fetchEvents(new Date());

    // User reconnects
    manager.resetAuthState();
    manager.lastFetchDate = null; // clear same-date dedup
    sendMessage.mockClear();

    await manager.fetchEvents(new Date());
    expect(sendMessage).toHaveBeenCalled();
  });
});
