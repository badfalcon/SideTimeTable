/**
 * Tests for GoogleEventManager auth-expiry handling
 */

// Mock dependencies before importing the module under test
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

describe('GoogleEventManager auth state', () => {
  let manager;
  let mockGoogleEventsDiv;

  beforeEach(() => {
    mockGoogleEventsDiv = {
      innerHTML: '',
      appendChild: jest.fn(),
    };
    manager = new GoogleEventManager(mockGoogleEventsDiv, null);
    jest.clearAllMocks();
  });

  test('_authExpiredKnown is initially false', () => {
    expect(manager._authExpiredKnown).toBe(false);
  });

  test('resetAuthState() clears the auth expired flag', () => {
    manager._authExpiredKnown = true;
    manager.resetAuthState();
    expect(manager._authExpiredKnown).toBe(false);
  });

  test('fetchEvents skips API call when _authExpiredKnown is true', async () => {
    manager._authExpiredKnown = true;
    loadSettings.mockResolvedValue({ googleIntegrated: true });

    await manager.fetchEvents(new Date());

    expect(sendMessage).not.toHaveBeenCalled();
  });

  test('fetchEvents skips API call when googleIntegrated is false', async () => {
    loadSettings.mockResolvedValue({ googleIntegrated: false });

    await manager.fetchEvents(new Date());

    expect(sendMessage).not.toHaveBeenCalled();
  });

  test('sets _authExpiredKnown and calls onAuthExpired on auth error', async () => {
    loadSettings.mockResolvedValue({
      googleIntegrated: true,
      useGoogleCalendarColors: true,
    });
    sendMessage.mockResolvedValue({
      error: 'Token revoked',
      authExpired: true,
    });

    const onAuthExpired = jest.fn();
    manager.onAuthExpired = onAuthExpired;

    await manager.fetchEvents(new Date());

    expect(manager._authExpiredKnown).toBe(true);
    expect(onAuthExpired).toHaveBeenCalledTimes(1);
  });

  test('does not call onAuthExpired on non-auth errors', async () => {
    loadSettings.mockResolvedValue({
      googleIntegrated: true,
      useGoogleCalendarColors: true,
    });
    sendMessage.mockResolvedValue({
      error: 'Network timeout',
      authExpired: false,
    });

    const onAuthExpired = jest.fn();
    manager.onAuthExpired = onAuthExpired;

    await manager.fetchEvents(new Date());

    expect(manager._authExpiredKnown).toBe(false);
    expect(onAuthExpired).not.toHaveBeenCalled();
  });

  test('subsequent fetchEvents are skipped after auth expiry', async () => {
    loadSettings.mockResolvedValue({
      googleIntegrated: true,
      useGoogleCalendarColors: true,
    });
    sendMessage.mockResolvedValue({
      error: 'Token revoked',
      authExpired: true,
    });
    manager.onAuthExpired = jest.fn();

    // First call — detects auth expiry
    await manager.fetchEvents(new Date());
    expect(sendMessage).toHaveBeenCalledTimes(1);

    // Second call — should skip entirely
    await manager.fetchEvents(new Date());
    expect(sendMessage).toHaveBeenCalledTimes(1); // no new call
  });

  test('fetchEvents resumes after resetAuthState', async () => {
    loadSettings.mockResolvedValue({
      googleIntegrated: true,
      useGoogleCalendarColors: true,
    });
    sendMessage
      .mockResolvedValueOnce({ error: 'Token revoked', authExpired: true })
      .mockResolvedValueOnce({ events: [] });
    manager.onAuthExpired = jest.fn();

    await manager.fetchEvents(new Date());
    expect(manager._authExpiredKnown).toBe(true);

    manager.resetAuthState();
    manager.lastFetchDate = null; // clear dedup guard

    await manager.fetchEvents(new Date());
    expect(sendMessage).toHaveBeenCalledTimes(2);
  });
});
