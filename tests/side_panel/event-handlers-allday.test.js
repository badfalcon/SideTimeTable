/**
 * Tests for GoogleEventManager — all-day event handling
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
  EventElementFactory: {
    createEventElement: jest.fn(() => ({
      eventDiv: { style: {}, dataset: {}, classList: { add: jest.fn() }, appendChild: jest.fn(), innerHTML: '' },
      duration: 60
    })),
    createPrimaryLine: jest.fn(() => ({ className: '' })),
  },
}));

import { GoogleEventManager } from '../../src/side_panel/event-handlers.js';
import { onClickOnly } from '../../src/side_panel/event-element-factory.js';

// Mock DOM and window APIs needed by _createAllDayEventElement
beforeAll(() => {
  global.window = global.window || {};
  global.window.getLocalizedMessage = jest.fn((key) => {
    const messages = { allDay: 'All day', outOfOffice: 'Out of office', multiDayProgress: 'Day $1/$2' };
    return messages[key] || key;
  });
  global.window.formatTime = jest.fn((t) => t);
  global.document = global.document || {};
  global.document.createElement = jest.fn(() => {
    const children = [];
    return {
      className: '',
      title: '',
      textContent: '',
      style: {},
      dataset: {},
      children,
      appendChild: jest.fn((child) => { children.push(child); return child; }),
    };
  });
});

function createManager() {
  return new GoogleEventManager(
    { innerHTML: '', appendChild: jest.fn() },
    null
  );
}

function mockAllDayContainer() {
  const container = {
    innerHTML: '',
    appendChild: jest.fn(),
    querySelectorAll: jest.fn(() => []),
    children: [],
  };
  return container;
}

function allDayEvent(overrides = {}) {
  return {
    id: 'ev-1',
    summary: 'Company Holiday',
    start: { date: '2025-06-01' },
    end: { date: '2025-06-02' },
    eventType: 'default',
    calendarId: 'primary',
    calendarBackgroundColor: '#3F51B5',
    calendarForegroundColor: '#FFFFFF',
    ...overrides,
  };
}

function timedEvent(overrides = {}) {
  return {
    id: 'ev-2',
    summary: 'Team Meeting',
    start: { dateTime: '2025-06-01T09:00:00Z' },
    end: { dateTime: '2025-06-01T10:00:00Z' },
    eventType: 'default',
    calendarId: 'primary',
    calendarBackgroundColor: '#3F51B5',
    calendarForegroundColor: '#FFFFFF',
    ...overrides,
  };
}

describe('GoogleEventManager — all-day event routing', () => {
  let manager;
  let allDayContainer;

  beforeEach(() => {
    jest.clearAllMocks();
    manager = createManager();
    manager.useGoogleCalendarColors = true;
    allDayContainer = mockAllDayContainer();
    manager.setAllDayEventsContainer(allDayContainer);
  });

  // -------------------------------------------------------------------
  // SPEC: _processEvents routes all-day events to the all-day container
  // -------------------------------------------------------------------

  test('all-day event with eventType "default" creates a chip in the all-day container', async () => {
    await manager._processEvents([allDayEvent()]);

    expect(allDayContainer.appendChild).toHaveBeenCalledTimes(1);
    const chip = allDayContainer.appendChild.mock.calls[0][0];
    expect(chip.className).toBe('all-day-event-chip');
    expect(chip.textContent).toBe('Company Holiday');
  });

  test('all-day event with undefined eventType still creates a chip (API may omit the field)', async () => {
    await manager._processEvents([allDayEvent({ eventType: undefined })]);

    expect(allDayContainer.appendChild).toHaveBeenCalledTimes(1);
    const chip = allDayContainer.appendChild.mock.calls[0][0];
    expect(chip.textContent).toBe('Company Holiday');
  });

  test('all-day outOfOffice event creates a chip with OOO styling', async () => {
    await manager._processEvents([allDayEvent({ eventType: 'outOfOffice', summary: 'PTO' })]);

    expect(allDayContainer.appendChild).toHaveBeenCalledTimes(1);
    const chip = allDayContainer.appendChild.mock.calls[0][0];
    expect(chip.className).toBe('all-day-event-chip all-day-event-chip-ooo');
    expect(chip.textContent).toBe('PTO');
  });

  test('all-day outOfOffice event without summary falls back to localized "Out of office"', async () => {
    await manager._processEvents([allDayEvent({ eventType: 'outOfOffice', summary: '' })]);

    const chip = allDayContainer.appendChild.mock.calls[0][0];
    expect(chip.textContent).toBe('Out of office');
  });

  test('timed event does NOT create a chip in the all-day container', async () => {
    await manager._processEvents([timedEvent()]);

    expect(allDayContainer.appendChild).not.toHaveBeenCalled();
  });

  test('workingLocation and focusTime events are skipped regardless of all-day status', async () => {
    await manager._processEvents([
      allDayEvent({ eventType: 'workingLocation' }),
      allDayEvent({ eventType: 'focusTime' }),
    ]);

    expect(allDayContainer.appendChild).not.toHaveBeenCalled();
  });

  test('mixed events: all-day and timed are routed correctly', async () => {
    await manager._processEvents([
      allDayEvent({ id: 'ad-1' }),
      timedEvent({ id: 'tm-1' }),
      allDayEvent({ id: 'ad-2', summary: 'Off-site' }),
    ]);

    // Two all-day chips
    expect(allDayContainer.appendChild).toHaveBeenCalledTimes(2);
    expect(allDayContainer.appendChild.mock.calls[0][0].textContent).toBe('Company Holiday');
    expect(allDayContainer.appendChild.mock.calls[1][0].textContent).toBe('Off-site');
  });

  // -------------------------------------------------------------------
  // SPEC: Chip element properties
  // -------------------------------------------------------------------

  test('chip has data-calendar-id attribute for calendar filtering', async () => {
    await manager._processEvents([allDayEvent({ calendarId: 'work@team.com' })]);

    const chip = allDayContainer.appendChild.mock.calls[0][0];
    expect(chip.dataset.calendarId).toBe('work@team.com');
  });

  test('chip applies Google Calendar colors when enabled', async () => {
    manager.useGoogleCalendarColors = true;
    await manager._processEvents([allDayEvent({
      calendarBackgroundColor: '#FF0000',
      calendarForegroundColor: '#FFFFFF',
    })]);

    const chip = allDayContainer.appendChild.mock.calls[0][0];
    expect(chip.style.backgroundColor).toBe('#FF0000');
    expect(chip.style.color).toBe('#FFFFFF');
  });

  test('chip does not apply colors when useGoogleCalendarColors is false', async () => {
    manager.useGoogleCalendarColors = false;
    await manager._processEvents([allDayEvent()]);

    const chip = allDayContainer.appendChild.mock.calls[0][0];
    expect(chip.style.backgroundColor).toBeUndefined();
  });

  test('chip registers a click handler via onClickOnly', async () => {
    await manager._processEvents([allDayEvent()]);

    expect(onClickOnly).toHaveBeenCalledTimes(1);
    const chip = onClickOnly.mock.calls[0][0];
    expect(chip).toBe(allDayContainer.appendChild.mock.calls[0][0]);
  });

  // -------------------------------------------------------------------
  // SPEC: Multi-day badge
  // -------------------------------------------------------------------

  test('single-day event does not show a day count badge', async () => {
    await manager._processEvents([allDayEvent({
      start: { date: '2025-06-01' },
      end: { date: '2025-06-02' },  // 1 day (end is exclusive)
    })]);

    const chip = allDayContainer.appendChild.mock.calls[0][0];
    expect(chip.children.length).toBe(0);
  });

  test('multi-day event shows a day progress badge (Day X/Y)', async () => {
    // Viewing June 2nd, event spans June 1-3
    manager._currentTargetDate = new Date(2025, 5, 2);
    await manager._processEvents([allDayEvent({
      start: { date: '2025-06-01' },
      end: { date: '2025-06-04' },  // 3 days (end is exclusive)
    })]);

    const chip = allDayContainer.appendChild.mock.calls[0][0];
    expect(chip.appendChild).toHaveBeenCalledTimes(1);
    const badge = chip.appendChild.mock.calls[0][0];
    expect(badge.className).toBe('all-day-event-chip-days');
    expect(badge.textContent).toBe('Day 2/3');
  });

  test('multi-day event on first day shows Day 1/Y', async () => {
    manager._currentTargetDate = new Date(2025, 5, 1);
    await manager._processEvents([allDayEvent({
      start: { date: '2025-06-01' },
      end: { date: '2025-06-04' },
    })]);

    const badge = allDayContainer.appendChild.mock.calls[0][0].appendChild.mock.calls[0][0];
    expect(badge.textContent).toBe('Day 1/3');
  });

  // -------------------------------------------------------------------
  // SPEC: setAllDayEventsContainer / guard
  // -------------------------------------------------------------------

  test('all-day events are silently skipped when container is not set', async () => {
    manager.setAllDayEventsContainer(null);

    await manager._processEvents([allDayEvent()]);

    // No error thrown, no chip created
    expect(allDayContainer.appendChild).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------
  // SPEC: removeEventsForCalendars removes all-day chips
  // -------------------------------------------------------------------

  test('removeEventsForCalendars removes all-day chips matching the calendar IDs', () => {
    const chipA = { dataset: { calendarId: 'cal-a' }, remove: jest.fn() };
    const chipB = { dataset: { calendarId: 'cal-b' }, remove: jest.fn() };
    allDayContainer.querySelectorAll.mockReturnValue([chipA, chipB]);

    manager.removeEventsForCalendars(['cal-a']);

    expect(chipA.remove).toHaveBeenCalled();
    expect(chipB.remove).not.toHaveBeenCalled();
  });

  test('removeEventsForCalendars preserves chips from unaffected calendars', () => {
    const chip = { dataset: { calendarId: 'cal-x' }, remove: jest.fn() };
    allDayContainer.querySelectorAll.mockReturnValue([chip]);

    manager.removeEventsForCalendars(['cal-y']);

    expect(chip.remove).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------
  // SPEC: destroy cleans up all-day container
  // -------------------------------------------------------------------

  test('destroy clears the all-day container', () => {
    manager.destroy();

    expect(allDayContainer.innerHTML).toBe('');
  });
});
