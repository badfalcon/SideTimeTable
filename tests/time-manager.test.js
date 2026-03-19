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

    test('ignores event missing only startTime', () => {
      manager.registerEvent({
        id: 'e1',
        endTime: new Date(2025, 5, 15, 11, 0),
        element: mockElement(),
      });
      expect(manager.events).toHaveLength(0);
    });

    test('ignores event missing only endTime', () => {
      manager.registerEvent({
        id: 'e1',
        startTime: new Date(2025, 5, 15, 10, 0),
        element: mockElement(),
      });
      expect(manager.events).toHaveLength(0);
    });

    test('ignores event missing only element', () => {
      manager.registerEvent({
        id: 'e1',
        startTime: new Date(2025, 5, 15, 10, 0),
        endTime: new Date(2025, 5, 15, 11, 0),
      });
      expect(manager.events).toHaveLength(0);
    });

    test('ignores event missing id', () => {
      manager.registerEvent({
        startTime: new Date(2025, 5, 15, 10, 0),
        endTime: new Date(2025, 5, 15, 11, 0),
        element: mockElement(),
      });
      expect(manager.events).toHaveLength(0);
    });

    test('preserves extra properties on update', () => {
      const event1 = createEvent('e1', 10, 0, 11, 0);
      event1.type = 'google';
      event1.calendarId = 'cal1';
      manager.registerEvent(event1);

      const event2 = createEvent('e1', 10, 0, 12, 0);
      event2.title = 'Updated';
      manager.registerEvent(event2);

      // Should merge: keep calendarId from original, add title from update
      expect(manager.events[0].calendarId).toBe('cal1');
      expect(manager.events[0].title).toBe('Updated');
    });

    test('registers multiple events with different ids', () => {
      manager.registerEvent(createEvent('e1', 9, 0, 10, 0));
      manager.registerEvent(createEvent('e2', 10, 0, 11, 0));
      manager.registerEvent(createEvent('e3', 11, 0, 12, 0));
      expect(manager.events).toHaveLength(3);
    });

    test('removes one event from multiple and preserves the rest', () => {
      manager.registerEvent(createEvent('e1', 9, 0, 10, 0));
      manager.registerEvent(createEvent('e2', 10, 0, 11, 0));
      manager.registerEvent(createEvent('e3', 11, 0, 12, 0));

      manager.removeEvent('e2');
      expect(manager.events).toHaveLength(2);
      expect(manager.events.map(e => e.id)).toEqual(['e1', 'e3']);
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

    test('detects identical time events as overlapping', () => {
      const e1 = createEvent('e1', 10, 0, 11, 0);
      const e2 = createEvent('e2', 10, 0, 11, 0);
      expect(manager._areEventsOverlapping(e1, e2)).toBe(true);
    });

    test('event does not overlap with itself if zero duration', () => {
      // Zero-duration: start === end, so start1 < end2 is false
      const e1 = createEvent('e1', 10, 0, 10, 0);
      const e2 = createEvent('e2', 10, 0, 10, 0);
      expect(manager._areEventsOverlapping(e1, e2)).toBe(false);
    });

    test('detects partial overlap at the start', () => {
      const e1 = createEvent('e1', 10, 0, 11, 0);
      const e2 = createEvent('e2', 9, 30, 10, 30);
      expect(manager._areEventsOverlapping(e1, e2)).toBe(true);
    });

    test('does not overlap when completely before', () => {
      const e1 = createEvent('e1', 8, 0, 9, 0);
      const e2 = createEvent('e2', 10, 0, 11, 0);
      expect(manager._areEventsOverlapping(e1, e2)).toBe(false);
    });

    test('overlap is symmetric', () => {
      const e1 = createEvent('e1', 10, 0, 11, 0);
      const e2 = createEvent('e2', 10, 30, 11, 30);
      expect(manager._areEventsOverlapping(e1, e2)).toBe(true);
      expect(manager._areEventsOverlapping(e2, e1)).toBe(true);
    });

    test('zero-duration event overlaps with spanning normal event', () => {
      // Zero-duration at 10:00 vs normal 9:00-11:00
      // start1=600, end1=600, start2=540, end2=660
      // 600 < 660 && 540 < 600 → true
      const e1 = createEvent('e1', 10, 0, 10, 0);
      const e2 = createEvent('e2', 9, 0, 11, 0);
      expect(manager._areEventsOverlapping(e1, e2)).toBe(true);
    });

    test('zero-duration event at boundary does not overlap with adjacent event', () => {
      // Zero-duration at 11:00 vs normal 10:00-11:00
      // start1=660, end1=660, start2=600, end2=660
      // 660 < 660 → false
      const e1 = createEvent('e1', 11, 0, 11, 0);
      const e2 = createEvent('e2', 10, 0, 11, 0);
      expect(manager._areEventsOverlapping(e1, e2)).toBe(false);
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

    test('single event forms a single group', () => {
      manager.registerEvent(createEvent('e1', 10, 0, 11, 0));
      const groups = manager._groupOverlappingEvents();
      expect(groups).toHaveLength(1);
      expect(groups[0]).toHaveLength(1);
    });

    test('all events overlapping forms one group', () => {
      manager.registerEvent(createEvent('e1', 10, 0, 13, 0));
      manager.registerEvent(createEvent('e2', 10, 30, 12, 0));
      manager.registerEvent(createEvent('e3', 11, 0, 13, 30));
      const groups = manager._groupOverlappingEvents();
      expect(groups).toHaveLength(1);
      expect(groups[0]).toHaveLength(3);
    });

    test('all events independent forms separate groups', () => {
      manager.registerEvent(createEvent('e1', 8, 0, 9, 0));
      manager.registerEvent(createEvent('e2', 10, 0, 11, 0));
      manager.registerEvent(createEvent('e3', 12, 0, 13, 0));
      manager.registerEvent(createEvent('e4', 14, 0, 15, 0));
      const groups = manager._groupOverlappingEvents();
      expect(groups).toHaveLength(4);
      groups.forEach(g => expect(g).toHaveLength(1));
    });

    test('multiple separate overlap groups', () => {
      // Group 1: e1 and e2 overlap
      manager.registerEvent(createEvent('e1', 9, 0, 10, 0));
      manager.registerEvent(createEvent('e2', 9, 30, 10, 30));
      // Group 2: e3 and e4 overlap
      manager.registerEvent(createEvent('e3', 14, 0, 15, 0));
      manager.registerEvent(createEvent('e4', 14, 30, 15, 30));

      const groups = manager._groupOverlappingEvents();
      expect(groups).toHaveLength(2);
      groups.forEach(g => expect(g).toHaveLength(2));
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

    test('assigns 3+ lanes when many events overlap', () => {
      const e1 = createEvent('e1', 10, 0, 11, 0);
      const e2 = createEvent('e2', 10, 0, 11, 0);
      const e3 = createEvent('e3', 10, 0, 11, 0);
      const result = manager._assignLanesToGroup([e1, e2, e3]);
      const uniqueLanes = new Set(result.map(e => e.lane));
      expect(uniqueLanes.size).toBe(3);
      expect(result[0].totalLanes).toBe(3);
    });

    test('sorts events by start time before assigning lanes', () => {
      // Pass events in reverse order
      const e1 = createEvent('e1', 12, 0, 13, 0);
      const e2 = createEvent('e2', 10, 0, 11, 0);
      const e3 = createEvent('e3', 11, 0, 12, 0);
      const result = manager._assignLanesToGroup([e1, e2, e3]);
      // Result should be sorted by start time
      expect(result[0].id).toBe('e2');
      expect(result[1].id).toBe('e3');
      expect(result[2].id).toBe('e1');
    });

    test('all events get consistent totalLanes', () => {
      const e1 = createEvent('e1', 10, 0, 12, 0);
      const e2 = createEvent('e2', 10, 0, 11, 0);
      const e3 = createEvent('e3', 11, 0, 12, 0);
      const result = manager._assignLanesToGroup([e1, e2, e3]);
      const totalLanes = result[0].totalLanes;
      result.forEach(e => expect(e.totalLanes).toBe(totalLanes));
    });

    test('does not mutate the original group array', () => {
      const e1 = createEvent('e1', 12, 0, 13, 0);
      const e2 = createEvent('e2', 10, 0, 11, 0);
      const group = [e1, e2];
      manager._assignLanesToGroup(group);
      // Original array order should be preserved
      expect(group[0].id).toBe('e1');
      expect(group[1].id).toBe('e2');
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

      // maxWidth=200, 2 lanes, gap=5 → laneWidth = (200 - 5) / 2 = 97.5
      // lane 0: left = 40, lane 1: left = 40 + 97.5 + 5 = 142.5
      expect(e1.element.style.left).toBe('40px');
      expect(e2.element.style.left).toBe('142.5px');
      expect(e1.element.style.width).toBe('97.5px');
      expect(e2.element.style.width).toBe('97.5px');
    });

    test('sets zIndex for single event layout', () => {
      const e1 = createEvent('e1', 10, 0, 11, 0);
      manager.registerEvent(e1);
      manager.calculateLayout();
      expect(e1.element.style.zIndex).toBe(21); // LAYOUT_CONSTANTS.Z_INDEX
    });

    test('sets higher zIndex for later-starting overlapping events', () => {
      const e1 = createEvent('e1', 10, 0, 12, 0);
      const e2 = createEvent('e2', 11, 0, 12, 0);
      manager.registerEvent(e1);
      manager.registerEvent(e2);
      manager.calculateLayout();
      // e2 starts at 11:00 (660 min), e1 at 10:00 (600 min)
      expect(e2.element.style.zIndex).toBeGreaterThan(e1.element.style.zIndex);
    });

    test('removes compact/micro/narrow-display classes for single event', () => {
      const e1 = createEvent('e1', 10, 0, 11, 0);
      e1.element.classList.add('compact');
      e1.element.classList.add('micro');
      e1.element.classList.add('narrow-display');
      manager.registerEvent(e1);
      manager.calculateLayout();
      expect(e1.element.classList.has('compact')).toBe(false);
      expect(e1.element.classList.has('micro')).toBe(false);
      expect(e1.element.classList.has('narrow-display')).toBe(false);
    });

    test('handles event with null element gracefully in single layout', () => {
      const e1 = createEvent('e1', 10, 0, 11, 0);
      e1.element = null;
      manager.events.push(e1); // bypass registerEvent validation
      expect(() => manager.calculateLayout()).not.toThrow();
    });

    test('handles event with null element gracefully in multi layout', () => {
      const e1 = createEvent('e1', 10, 0, 11, 0);
      const e2 = createEvent('e2', 10, 0, 11, 0);
      e2.element = null;
      manager.events.push(e1, e2);
      expect(() => manager.calculateLayout()).not.toThrow();
    });

    test('applies compact class for 3-4 lane groups', () => {
      // Create 3 fully overlapping events -> 3 lanes
      const e1 = createEvent('e1', 10, 0, 11, 0);
      const e2 = createEvent('e2', 10, 0, 11, 0);
      const e3 = createEvent('e3', 10, 0, 11, 0);
      manager.registerEvent(e1);
      manager.registerEvent(e2);
      manager.registerEvent(e3);
      manager.calculateLayout();
      // 3 lanes: laneCount(3) > COMPACT(2) and laneCount(3) <= MICRO(4) -> compact class
      [e1, e2, e3].forEach(e => {
        expect(e.element.classList.has('compact')).toBe(true);
        expect(e.element.classList.has('micro')).toBe(false);
      });
    });

    test('applies micro class for 5+ lane groups', () => {
      const events = [];
      for (let i = 0; i < 5; i++) {
        const e = createEvent(`e${i}`, 10, 0, 11, 0);
        events.push(e);
        manager.registerEvent(e);
      }
      manager.calculateLayout();
      // 5 lanes > MICRO(4) -> micro class
      events.forEach(e => {
        expect(e.element.classList.has('micro')).toBe(true);
        expect(e.element.classList.has('compact')).toBe(false);
      });
    });

    test('populates layoutGroups after calculateLayout', () => {
      manager.registerEvent(createEvent('e1', 10, 0, 11, 0));
      manager.registerEvent(createEvent('e2', 14, 0, 15, 0));
      manager.calculateLayout();
      expect(manager.layoutGroups).toHaveLength(2);
    });

    test('disableTransitions adds no-transition class to elements', () => {
      // Mock requestAnimationFrame
      global.requestAnimationFrame = (cb) => cb();

      const e1 = createEvent('e1', 10, 0, 11, 0);
      const e2 = createEvent('e2', 10, 0, 11, 0);
      manager.registerEvent(e1);
      manager.registerEvent(e2);
      manager.calculateLayout(true);

      // After requestAnimationFrame callback, no-transition should be removed
      expect(e1.element.classList.has('no-transition')).toBe(false);
      expect(e2.element.classList.has('no-transition')).toBe(false);

      delete global.requestAnimationFrame;
    });

    test('disableTransitions skips null elements without error', () => {
      global.requestAnimationFrame = (cb) => cb();

      const e1 = createEvent('e1', 10, 0, 11, 0);
      e1.element = null;
      manager.events.push(e1);

      expect(() => manager.calculateLayout(true)).not.toThrow();

      delete global.requestAnimationFrame;
    });

    test('2-lane group does not get compact or micro class', () => {
      const e1 = createEvent('e1', 10, 0, 11, 0);
      const e2 = createEvent('e2', 10, 0, 11, 0);
      manager.registerEvent(e1);
      manager.registerEvent(e2);
      manager.calculateLayout();
      // 2 lanes <= COMPACT(2) → no compact, no micro
      [e1, e2].forEach(e => {
        expect(e.element.classList.has('compact')).toBe(false);
        expect(e.element.classList.has('micro')).toBe(false);
      });
    });

    test('4-lane group gets compact class (MICRO boundary)', () => {
      const events = [];
      for (let i = 0; i < 4; i++) {
        const e = createEvent(`e${i}`, 10, 0, 11, 0);
        events.push(e);
        manager.registerEvent(e);
      }
      manager.calculateLayout();
      // 4 lanes: laneCount(4) > COMPACT(2) and laneCount(4) <= MICRO(4) → compact
      events.forEach(e => {
        expect(e.element.classList.has('compact')).toBe(true);
        expect(e.element.classList.has('micro')).toBe(false);
      });
    });

    test('narrow-display class applied when laneWidth < MIN_DISPLAY_WIDTH', () => {
      // DEFAULT_WIDTH=200, 2 lanes, gap=5 → laneWidth = (200 - 5) / 2 = 97.5 < 100
      const e1 = createEvent('e1', 10, 0, 11, 0);
      const e2 = createEvent('e2', 10, 0, 11, 0);
      manager.registerEvent(e1);
      manager.registerEvent(e2);
      manager.calculateLayout();
      expect(e1.element.classList.has('narrow-display')).toBe(true);
      expect(e2.element.classList.has('narrow-display')).toBe(true);
    });

    test('narrow-display not applied when laneWidth >= MIN_DISPLAY_WIDTH', () => {
      // Use baseElement with wide width so single event gets full width
      const e1 = createEvent('e1', 10, 0, 11, 0);
      manager.registerEvent(e1);
      manager.calculateLayout();
      // Single event layout doesn't go through _applyMultiEventLayout,
      // and removes narrow-display
      expect(e1.element.classList.has('narrow-display')).toBe(false);
    });

    test('padding is reset to empty string on layout', () => {
      const e1 = createEvent('e1', 10, 0, 11, 0);
      e1.element.style.padding = '20px';
      manager.registerEvent(e1);
      manager.calculateLayout();
      expect(e1.element.style.padding).toBe('');
    });

    test('register → layout → remove → register new → re-layout works correctly', () => {
      // Step 1: Two overlapping events
      const e1 = createEvent('e1', 10, 0, 11, 0);
      const e2 = createEvent('e2', 10, 0, 11, 0);
      manager.registerEvent(e1);
      manager.registerEvent(e2);
      manager.calculateLayout();
      expect(e1.element.style.width).toBe('97.5px'); // 2-lane

      // Step 2: Remove e2, add non-overlapping e3
      manager.removeEvent('e2');
      const e3 = createEvent('e3', 14, 0, 15, 0);
      manager.registerEvent(e3);
      manager.calculateLayout();

      // e1 is now alone → full width
      expect(e1.element.style.width).toBe('200px');
      // e3 is also alone → full width
      expect(e3.element.style.width).toBe('200px');
      expect(manager.layoutGroups).toHaveLength(2);
    });
  });

  describe('updateBaseElement', () => {
    test('updates maxWidth based on new element', () => {
      global.window = { ResizeObserver: undefined };
      const baseElement = {
        getBoundingClientRect: () => ({ width: 500 }),
      };
      manager.updateBaseElement(baseElement);
      // availableWidth = 500 - 40 - 5 = 455
      expect(manager.maxWidth).toBe(455);
      expect(manager.baseElement).toBe(baseElement);
      delete global.window;
    });

    test('recalculates layout when events exist', () => {
      global.window = { ResizeObserver: undefined };
      const e1 = createEvent('e1', 10, 0, 11, 0);
      manager.registerEvent(e1);
      manager.calculateLayout();
      expect(e1.element.style.width).toBe('200px'); // DEFAULT_WIDTH

      const baseElement = {
        getBoundingClientRect: () => ({ width: 500 }),
      };
      manager.updateBaseElement(baseElement);
      // Should recalculate: single event gets full maxWidth = 455
      expect(e1.element.style.width).toBe('455px');
      delete global.window;
    });

    test('does not recalculate layout when no events', () => {
      global.window = { ResizeObserver: undefined };
      const baseElement = {
        getBoundingClientRect: () => ({ width: 500 }),
      };
      // Should not throw even with no events
      expect(() => manager.updateBaseElement(baseElement)).not.toThrow();
      delete global.window;
    });
  });

  describe('_handleResize', () => {
    test('recalculates layout when width changes by more than 5px', () => {
      global.window = { ResizeObserver: undefined };
      const widthHolder = { width: 400 };
      const baseElement = {
        getBoundingClientRect: () => ({ width: widthHolder.width }),
      };
      const m = new EventLayoutManager(baseElement);
      const e1 = createEvent('e1', 10, 0, 11, 0);
      m.registerEvent(e1);
      m.calculateLayout();

      // Change width by more than 5px
      widthHolder.width = 500;
      m._handleResize();
      // New maxWidth = 500 - 40 - 5 = 455
      expect(m.maxWidth).toBe(455);
      expect(e1.element.style.width).toBe('455px');
      m.destroy();
      delete global.window;
    });

    test('does not recalculate layout when width changes by less than 5px', () => {
      global.window = { ResizeObserver: undefined };
      const widthHolder = { width: 400 };
      const baseElement = {
        getBoundingClientRect: () => ({ width: widthHolder.width }),
      };
      const m = new EventLayoutManager(baseElement);
      const e1 = createEvent('e1', 10, 0, 11, 0);
      m.registerEvent(e1);
      m.calculateLayout();
      const originalWidth = e1.element.style.width;

      // Change width by less than 5px
      widthHolder.width = 403;
      m._handleResize();
      // Layout should NOT be recalculated
      expect(e1.element.style.width).toBe(originalWidth);
      m.destroy();
      delete global.window;
    });
  });

  describe('_getCachedTimeValue', () => {
    test('returns minutes since midnight', () => {
      const time = new Date(2025, 5, 15, 14, 30);
      expect(manager._getCachedTimeValue(time)).toBe(14 * 60 + 30);
    });

    test('returns cached value on second call', () => {
      const time = new Date(2025, 5, 15, 10, 0);
      const first = manager._getCachedTimeValue(time);
      const second = manager._getCachedTimeValue(time);
      expect(first).toBe(second);
      expect(manager.timeValueCache.size).toBe(1);
    });

    test('handles midnight (0:00)', () => {
      const time = new Date(2025, 5, 15, 0, 0);
      expect(manager._getCachedTimeValue(time)).toBe(0);
    });

    test('handles end of day (23:59)', () => {
      const time = new Date(2025, 5, 15, 23, 59);
      expect(manager._getCachedTimeValue(time)).toBe(23 * 60 + 59);
    });
  });

  describe('_calculateMaxWidth', () => {
    test('returns DEFAULT_WIDTH when no baseElement', () => {
      expect(manager.maxWidth).toBe(200);
    });

    test('calculates width from baseElement', () => {
      // Mock window for ResizeObserver check
      global.window = { ResizeObserver: undefined };
      const baseElement = {
        getBoundingClientRect: () => ({ width: 400 }),
      };
      const m = new EventLayoutManager(baseElement);
      // availableWidth = 400 - 40 (BASE_LEFT) - 5 (RESERVED_SPACE_MARGIN) = 355
      expect(m.maxWidth).toBe(355);
      m.destroy();
      delete global.window;
    });

    test('enforces MIN_WIDTH for narrow baseElement', () => {
      global.window = { ResizeObserver: undefined };
      const baseElement = {
        getBoundingClientRect: () => ({ width: 50 }),
      };
      const m = new EventLayoutManager(baseElement);
      // availableWidth = 50 - 40 - 5 = 5, but MIN_WIDTH = 100
      expect(m.maxWidth).toBe(100);
      m.destroy();
      delete global.window;
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

    test('clears the time value cache', () => {
      const e1 = createEvent('e1', 10, 0, 11, 0);
      manager.registerEvent(e1);
      manager._getCachedTimeValue(e1.startTime);
      expect(manager.timeValueCache.size).toBeGreaterThan(0);
      manager.clearAllEvents();
      expect(manager.timeValueCache.size).toBe(0);
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

    test('can be called twice without error (idempotent)', () => {
      manager.registerEvent(createEvent('e1', 10, 0, 11, 0));
      manager.destroy();
      expect(() => manager.destroy()).not.toThrow();
    });

    test('clears timeValueCache', () => {
      const e1 = createEvent('e1', 10, 0, 11, 0);
      manager.registerEvent(e1);
      manager._getCachedTimeValue(e1.startTime);
      manager.destroy();
      expect(manager.timeValueCache.size).toBe(0);
    });
  });
});
