/**
 * Tests for GoogleEventManager — date navigation race protection
 *
 * Rapid date navigation can make an older, slower fetch resolve AFTER a
 * newer one. The stale response must be dropped, never rendered over the
 * newer date's events.
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
import { loadSettings, loadSelectedCalendars } from '../../src/lib/settings-storage.js';
import { sendMessage } from '../../src/lib/chrome-messaging.js';

function createGoogleEventsDiv() {
  return { innerHTML: '', appendChild: jest.fn() };
}

function mockGoogleIntegrated() {
  loadSettings.mockResolvedValue({
    googleIntegrated: true,
    useGoogleCalendarColors: true,
  });
}

describe('GoogleEventManager — fetchEvents date race', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGoogleIntegrated();
  });

  test('a stale response for a previous date is dropped, not rendered', async () => {
    const manager = new GoogleEventManager(createGoogleEventsDiv(), null);
    const processSpy = jest.spyOn(manager, '_processEvents').mockResolvedValue();

    // Date A's fetch hangs until we resolve it manually
    let resolveA;
    sendMessage.mockImplementationOnce(
      () => new Promise((resolve) => { resolveA = resolve; })
    );

    const promiseA = manager.fetchEvents(new Date(2026, 6, 22));

    // Date B's fetch resolves immediately with its own events
    const eventsB = [{ id: 'evt-b', start: { dateTime: '2026-07-23T10:00:00+09:00' } }];
    sendMessage.mockResolvedValueOnce({ events: eventsB });
    await manager.fetchEvents(new Date(2026, 6, 23));

    // Now the stale date-A response arrives late
    resolveA({ events: [{ id: 'evt-a', start: { dateTime: '2026-07-22T10:00:00+09:00' } }] });
    await promiseA;

    // Only date B's events were processed; the stale A payload was dropped
    expect(processSpy).toHaveBeenCalledTimes(1);
    expect(processSpy).toHaveBeenCalledWith(eventsB);
  });

  test('a stale response does not clear the newer render from the DOM', async () => {
    const googleEventsDiv = createGoogleEventsDiv();
    const manager = new GoogleEventManager(googleEventsDiv, null);
    jest.spyOn(manager, '_processEvents').mockResolvedValue();

    let resolveA;
    sendMessage.mockImplementationOnce(
      () => new Promise((resolve) => { resolveA = resolve; })
    );
    const promiseA = manager.fetchEvents(new Date(2026, 6, 22));

    sendMessage.mockResolvedValueOnce({ events: [] });
    await manager.fetchEvents(new Date(2026, 6, 23));

    // Simulate date B's render having populated the container
    googleEventsDiv.innerHTML = '<div>date-b-events</div>';

    resolveA({ events: [{ id: 'evt-a' }] });
    await promiseA;

    expect(googleEventsDiv.innerHTML).toBe('<div>date-b-events</div>');
  });

  test('a normal single fetch still renders its events', async () => {
    const manager = new GoogleEventManager(createGoogleEventsDiv(), null);
    const processSpy = jest.spyOn(manager, '_processEvents').mockResolvedValue();

    const events = [{ id: 'evt-1' }];
    sendMessage.mockResolvedValueOnce({ events });

    await manager.fetchEvents(new Date(2026, 6, 23));

    expect(processSpy).toHaveBeenCalledWith(events);
  });
});

describe('GoogleEventManager — fetchEventsForCalendars date race', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGoogleIntegrated();
  });

  test('a calendar toggle started on the previous day does not append to the new day', async () => {
    loadSelectedCalendars.mockResolvedValue(['cal-1']);
    const manager = new GoogleEventManager(createGoogleEventsDiv(), null);
    const processSpy = jest.spyOn(manager, '_processEvents').mockResolvedValue();

    // The toggle's fetch hangs until we resolve it manually
    let resolveToggle;
    sendMessage.mockImplementationOnce(
      () => new Promise((resolve) => { resolveToggle = resolve; })
    );
    const togglePromise = manager.fetchEventsForCalendars(
      new Date(2026, 5, 22), ['cal-1']
    );

    // The user navigates to the next day while the toggle is in flight
    sendMessage.mockResolvedValueOnce({ events: [] });
    await manager.fetchEvents(new Date(2026, 5, 23));
    processSpy.mockClear();

    resolveToggle({ events: [{ id: 'evt-jun22', calendarId: 'cal-1' }] });
    await togglePromise;

    expect(processSpy).not.toHaveBeenCalled();
  });

  test('a toggle with no date change still renders its events', async () => {
    loadSelectedCalendars.mockResolvedValue(['cal-1']);
    const manager = new GoogleEventManager(createGoogleEventsDiv(), null);
    const processSpy = jest.spyOn(manager, '_processEvents').mockResolvedValue();

    const events = [{ id: 'evt-1', calendarId: 'cal-1' }];
    sendMessage.mockResolvedValueOnce({ events });

    await manager.fetchEventsForCalendars(new Date(2026, 5, 23), ['cal-1']);

    expect(processSpy).toHaveBeenCalled();
  });
});
