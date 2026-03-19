import { EventLayoutManager } from '../src/side_panel/time-manager.js';

// Mock DOM element
function mockElement() {
  return {
    style: {},
    classList: {
      _classes: new Set(),
      add(...cls) { cls.forEach(c => this._classes.add(c)); },
      remove(...cls) { cls.forEach(c => this._classes.delete(c)); },
      has(cls) { return this._classes.has(cls); },
    },
  };
}

// Helper to create event objects
function createEvent(id, startHour, startMin, endHour, endMin) {
  const base = new Date(2025, 5, 15);
  return {
    id,
    startTime: new Date(base.getFullYear(), base.getMonth(), base.getDate(), startHour, startMin),
    endTime: new Date(base.getFullYear(), base.getMonth(), base.getDate(), endHour, endMin),
    element: mockElement(),
  };
}

describe('EventLayoutManager', () => {
  let manager;

  beforeEach(() => {
    manager = new EventLayoutManager(null);
  });

  afterEach(() => {
    manager.destroy();
  });

  describe('registerEvent / removeEvent', () => {
    test('registers and removes events', () => {
      const event = createEvent('e1', 10, 0, 11, 0);
      manager.registerEvent(event);
      expect(manager.events).toHaveLength(1);

      const removed = manager.removeEvent('e1');
      expect(removed).toBe(true);
      expect(manager.events).toHaveLength(0);
    });

    test('returns false when removing non-existent event', () => {
      expect(manager.removeEvent('nonexistent')).toBe(false);
    });

    test('updates existing event with same id', () => {
      const event1 = createEvent('e1', 10, 0, 11, 0);
      event1.title = 'Original';
      manager.registerEvent(event1);

      const event2 = createEvent('e1', 10, 0, 12, 0);
      event2.title = 'Updated';
      manager.registerEvent(event2);

      expect(manager.events).toHaveLength(1);
      expect(manager.events[0].title).toBe('Updated');
    });

    test('ignores events without required fields', () => {
      manager.registerEvent({ id: 'e1' }); // missing startTime, endTime, element
      expect(manager.events).toHaveLength(0);
    });
  });

  describe('clearAllEvents', () => {
    test('clears all events and cache', () => {
      manager.registerEvent(createEvent('e1', 10, 0, 11, 0));
      manager.registerEvent(createEvent('e2', 11, 0, 12, 0));
      manager.clearAllEvents();
      expect(manager.events).toHaveLength(0);
      expect(manager.layoutGroups).toHaveLength(0);
    });
  });

  describe('_areEventsOverlapping', () => {
    test('detects overlapping events', () => {
      const e1 = createEvent('e1', 10, 0, 11, 0);
      const e2 = createEvent('e2', 10, 30, 11, 30);
      manager.registerEvent(e1);
      manager.registerEvent(e2);
      expect(manager._areEventsOverlapping(e1, e2)).toBe(true);
    });

    test('detects non-overlapping events', () => {
      const e1 = createEvent('e1', 10, 0, 11, 0);
      const e2 = createEvent('e2', 11, 0, 12, 0);
      expect(manager._areEventsOverlapping(e1, e2)).toBe(false);
    });

    test('detects containment as overlap', () => {
      const e1 = createEvent('e1', 9, 0, 12, 0);
      const e2 = createEvent('e2', 10, 0, 11, 0);
      expect(manager._areEventsOverlapping(e1, e2)).toBe(true);
    });
  });

  describe('_groupOverlappingEvents', () => {
    test('returns empty array for no events', () => {
      expect(manager._groupOverlappingEvents()).toEqual([]);
    });

    test('groups overlapping events together', () => {
      manager.registerEvent(createEvent('e1', 10, 0, 11, 0));
      manager.registerEvent(createEvent('e2', 10, 30, 11, 30));
      manager.registerEvent(createEvent('e3', 14, 0, 15, 0));

      const groups = manager._groupOverlappingEvents();
      expect(groups).toHaveLength(2);
      // One group with 2 overlapping events, one with 1
      const sizes = groups.map(g => g.length).sort();
      expect(sizes).toEqual([1, 2]);
    });

    test('handles transitive overlap (A-B overlap, B-C overlap, A-C dont)', () => {
      manager.registerEvent(createEvent('e1', 10, 0, 11, 0));  // A
      manager.registerEvent(createEvent('e2', 10, 30, 11, 30)); // B overlaps A and C
      manager.registerEvent(createEvent('e3', 11, 0, 12, 0));   // C (doesn't overlap A directly)

      // B overlaps both A and C, so via Union-Find all three should be in one group
      const groups = manager._groupOverlappingEvents();
      expect(groups).toHaveLength(1);
      expect(groups[0]).toHaveLength(3);
    });
  });

  describe('_assignLanesToGroup', () => {
    test('assigns single event to lane 0', () => {
      const e1 = createEvent('e1', 10, 0, 11, 0);
      const result = manager._assignLanesToGroup([e1]);
      expect(result[0].lane).toBe(0);
      expect(result[0].totalLanes).toBe(1);
    });

    test('assigns overlapping events to different lanes', () => {
      const e1 = createEvent('e1', 10, 0, 11, 0);
      const e2 = createEvent('e2', 10, 30, 11, 30);
      const result = manager._assignLanesToGroup([e1, e2]);
      expect(result[0].lane).not.toBe(result[1].lane);
      expect(result[0].totalLanes).toBe(2);
    });

    test('reuses lanes for non-overlapping events', () => {
      const e1 = createEvent('e1', 10, 0, 11, 0);
      const e2 = createEvent('e2', 10, 0, 11, 0); // same time as e1
      const e3 = createEvent('e3', 11, 0, 12, 0); // after both

      // e3 should reuse lane 0 since e1 is done
      const result = manager._assignLanesToGroup([e1, e2, e3]);
      const lanes = result.map(e => e.lane);
      // e1 and e2 overlap -> different lanes, e3 can reuse lane 0
      expect(new Set(lanes).size).toBeLessThanOrEqual(2);
    });
  });

  describe('calculateLayout', () => {
    test('does nothing with no events', () => {
      expect(() => manager.calculateLayout()).not.toThrow();
    });

    test('applies single event layout', () => {
      const e1 = createEvent('e1', 10, 0, 11, 0);
      manager.registerEvent(e1);
      manager.calculateLayout();
      expect(e1.element.style.left).toBe('40px');
      expect(e1.element.style.width).toBe('200px'); // DEFAULT_WIDTH
    });

    test('applies multi-event layout with correct left positions', () => {
      const e1 = createEvent('e1', 10, 0, 11, 0);
      const e2 = createEvent('e2', 10, 0, 11, 0);
      manager.registerEvent(e1);
      manager.registerEvent(e2);
      manager.calculateLayout();

      // Both should have left set, and they should differ
      expect(e1.element.style.left).toBeDefined();
      expect(e2.element.style.left).toBeDefined();
      expect(e1.element.style.left).not.toBe(e2.element.style.left);
    });
  });

  describe('destroy', () => {
    test('cleans up all resources', () => {
      manager.registerEvent(createEvent('e1', 10, 0, 11, 0));
      manager.destroy();
      expect(manager.events).toHaveLength(0);
      expect(manager.layoutGroups).toHaveLength(0);
      expect(manager.resizeObserver).toBeNull();
    });
  });
});
