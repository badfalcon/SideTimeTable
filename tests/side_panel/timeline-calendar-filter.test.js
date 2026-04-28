/**
 * Tests for TimelineCalendarFilter — group toggle behaviour with calendars
 * that belong to multiple groups.
 *
 * Regression: switching groups must not leak calendars whose only reason for
 * being selected is membership in a partially-selected sibling group.
 */

jest.mock('../../src/lib/chrome-messaging.js', () => ({
  sendMessage: jest.fn(),
}));
jest.mock('../../src/lib/settings-storage.js', () => ({
  loadSelectedCalendars: jest.fn(),
  saveSelectedCalendars: jest.fn().mockResolvedValue(undefined),
  loadCalendarGroups: jest.fn(),
}));
jest.mock('../../src/lib/demo-data.js', () => ({
  isDemoMode: jest.fn(() => false),
  getDemoCalendarGroups: jest.fn(),
}));

beforeAll(() => {
  global.window = global.window || {};
  global.document = global.document || {};
  global.document.createElement = jest.fn(() => ({
    className: '',
    style: {},
    dataset: {},
    setAttribute: jest.fn(),
    appendChild: jest.fn(),
    addEventListener: jest.fn(),
  }));
  global.document.getElementById = jest.fn(() => null);
});

import { TimelineCalendarFilter } from '../../src/side_panel/components/timeline/timeline-calendar-filter.js';
import { saveSelectedCalendars } from '../../src/lib/settings-storage.js';

const CAL_X = { id: 'cal-x', summary: 'X', primary: false };
const CAL_Y = { id: 'cal-y', summary: 'Y', primary: false };
const CAL_Z = { id: 'cal-z', summary: 'Z', primary: false };

const GROUP_A = { id: 'group-a', name: 'A', calendarIds: ['cal-x', 'cal-y'] };
const GROUP_B = { id: 'group-b', name: 'B', calendarIds: ['cal-y', 'cal-z'] };

function buildFilter({ selectedIds, groups = [GROUP_A, GROUP_B], calendars = [CAL_X, CAL_Y, CAL_Z] }) {
  const onCalendarChange = jest.fn();
  const filter = new TimelineCalendarFilter({ onCalendarChange });
  filter.calendars = calendars;
  filter.selectedIds = [...selectedIds];
  filter.calendarGroups = groups;
  // Stub the renderer so re-render attempts don't touch DOM.
  filter.renderer = { renderCalendarList: jest.fn() };
  return { filter, onCalendarChange };
}

describe('TimelineCalendarFilter._handleGroupToggle', () => {
  beforeEach(() => {
    saveSelectedCalendars.mockClear();
    saveSelectedCalendars.mockResolvedValue(undefined);
  });

  test('checking a group adds all its members', async () => {
    const { filter, onCalendarChange } = buildFilter({ selectedIds: [] });

    await filter._handleGroupToggle(GROUP_A, [], true);

    expect([...filter.selectedIds].sort()).toEqual(['cal-x', 'cal-y']);
    expect(onCalendarChange).toHaveBeenCalledWith({
      addedIds: ['cal-x', 'cal-y'],
      removedIds: [],
    });
  });

  test('unchecking a group removes its members when no other group is fully checked', async () => {
    // Bug repro: Y is in both A and B. After only checking A and unchecking it,
    // Y must be removed (Group B was never activated).
    const { filter, onCalendarChange } = buildFilter({ selectedIds: ['cal-x', 'cal-y'] });

    await filter._handleGroupToggle(GROUP_A, [], false);

    expect(filter.selectedIds).toEqual([]);
    expect(onCalendarChange).toHaveBeenCalledWith({
      addedIds: [],
      removedIds: ['cal-x', 'cal-y'],
    });
  });

  test('unchecking a group keeps cross-group calendars when the sibling group is fully checked', async () => {
    // Both A and B fully checked → Y must remain after unchecking A,
    // because Group B (still checked) requires Y.
    const { filter, onCalendarChange } = buildFilter({ selectedIds: ['cal-x', 'cal-y', 'cal-z'] });

    await filter._handleGroupToggle(GROUP_A, [], false);

    expect([...filter.selectedIds].sort()).toEqual(['cal-y', 'cal-z']);
    expect(onCalendarChange).toHaveBeenCalledWith({
      addedIds: [],
      removedIds: ['cal-x'],
    });
  });

  test('sequentially unchecking both groups leaves nothing selected', async () => {
    const { filter, onCalendarChange } = buildFilter({ selectedIds: ['cal-x', 'cal-y', 'cal-z'] });

    await filter._handleGroupToggle(GROUP_A, [], false);
    await filter._handleGroupToggle(GROUP_B, [], false);

    expect(filter.selectedIds).toEqual([]);
    expect(onCalendarChange).toHaveBeenLastCalledWith({
      addedIds: [],
      removedIds: ['cal-y', 'cal-z'],
    });
  });

  test('primary calendar is never removed by a group toggle', async () => {
    const primary = { id: 'cal-primary', summary: 'Primary', primary: true };
    const groupWithPrimary = { id: 'group-p', name: 'P', calendarIds: ['cal-primary', 'cal-x'] };
    const { filter } = buildFilter({
      selectedIds: ['cal-primary', 'cal-x'],
      groups: [groupWithPrimary],
      calendars: [primary, CAL_X],
    });

    await filter._handleGroupToggle(groupWithPrimary, [], false);

    expect(filter.selectedIds).toEqual(['cal-primary']);
  });

  test('save failure rolls back selectedIds', async () => {
    saveSelectedCalendars.mockRejectedValueOnce(new Error('boom'));
    const { filter, onCalendarChange } = buildFilter({ selectedIds: ['cal-x', 'cal-y'] });

    await filter._handleGroupToggle(GROUP_A, [], false);

    expect(filter.selectedIds).toEqual(['cal-x', 'cal-y']);
    expect(onCalendarChange).not.toHaveBeenCalled();
  });
});
