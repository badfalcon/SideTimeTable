import { EventLayoutManager } from '../src/side_panel/time-manager.js';

// Mock DOM element with classList matching the real DOM API
function mockElement() {
  return {
    style: {},
    classList: {
      _classes: new Set(),
      add(...cls) { cls.forEach(c => this._classes.add(c)); },
      remove(...cls) { cls.forEach(c => this._classes.delete(c)); },
      contains(cls) { return this._classes.has(cls); },
    },
  };
}

// Helper to create event objects on a fixed date (June 15, 2025)
function createEvent(id, startHour, startMin, endHour, endMin) {
  return {
    id,
    startTime: new Date(2025, 5, 15, startHour, startMin),
    endTime: new Date(2025, 5, 15, endHour, endMin),
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

    test('zero-duration events at the same time overlap (should display side by side)', () => {
      const e1 = createEvent('e1', 10, 0, 10, 0);
      const e2 = createEvent('e2', 10, 0, 10, 0);
      expect(manager._areEventsOverlapping(e1, e2)).toBe(true);
    });

    test('zero-duration events at different times do not overlap', () => {
      const e1 = createEvent('e1', 10, 0, 10, 0);
      const e2 = createEvent('e2', 11, 0, 11, 0);
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

      // Overlap is transitive: A-B overlap + B-C overlap → all three in one group
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

    test('assigns correct lanes regardless of input order', () => {
      // Pass events in reverse chronological order
      const e1 = createEvent('e1', 12, 0, 13, 0);
      const e2 = createEvent('e2', 10, 0, 11, 0);
      const e3 = createEvent('e3', 11, 0, 12, 0);
      const result = manager._assignLanesToGroup([e1, e2, e3]);
      // No overlaps → all should get lane 0, totalLanes 1
      result.forEach(e => {
        expect(e.lane).toBe(0);
        expect(e.totalLanes).toBe(1);
      });
    });

    test('all events in a group share the same totalLanes value', () => {
      const e1 = createEvent('e1', 10, 0, 12, 0);
      const e2 = createEvent('e2', 10, 0, 11, 0);
      const e3 = createEvent('e3', 11, 0, 12, 0);
      const result = manager._assignLanesToGroup([e1, e2, e3]);
      const totalLanes = result[0].totalLanes;
      result.forEach(e => expect(e.totalLanes).toBe(totalLanes));
    });

    test('reuses lanes correctly when partial overlaps do not overlap each other', () => {
      // A spans full period, B overlaps only the start, C overlaps only the end
      // B and C do NOT overlap each other → C should reuse B's lane
      const eA = createEvent('eA', 10, 0, 12, 0); // full span
      const eB = createEvent('eB', 10, 0, 10, 30); // overlaps A at start only
      const eC = createEvent('eC', 11, 30, 12, 0); // overlaps A at end only

      const result = manager._assignLanesToGroup([eA, eB, eC]);
      // A must be in a different lane from B and C
      expect(result.find(e => e.id === 'eA').lane).not.toBe(result.find(e => e.id === 'eB').lane);
      expect(result.find(e => e.id === 'eA').lane).not.toBe(result.find(e => e.id === 'eC').lane);
      // B and C don't overlap, so they CAN share a lane → totalLanes should be 2
      expect(result[0].totalLanes).toBe(2);
    });

    test('handles empty group', () => {
      const result = manager._assignLanesToGroup([]);
      expect(result).toEqual([]);
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

    test('single event uses the full available width', () => {
      const e1 = createEvent('e1', 10, 0, 11, 0);
      manager.registerEvent(e1);
      manager.calculateLayout();
      expect(parseFloat(e1.element.style.width)).toBe(manager.maxWidth);
    });

    test('overlapping events share width equally', () => {
      const e1 = createEvent('e1', 10, 0, 11, 0);
      const e2 = createEvent('e2', 10, 0, 11, 0);
      manager.registerEvent(e1);
      manager.registerEvent(e2);
      manager.calculateLayout();

      const w1 = parseFloat(e1.element.style.width);
      const w2 = parseFloat(e2.element.style.width);
      // Both events should have equal width
      expect(w1).toBe(w2);
      // Each should be less than full width
      expect(w1).toBeLessThan(manager.maxWidth);
      // Events should not overlap horizontally
      const left1 = parseFloat(e1.element.style.left);
      const left2 = parseFloat(e2.element.style.left);
      expect(Math.abs(left1 - left2)).toBeGreaterThan(0);
    });

    test('later-starting overlapping events have higher zIndex', () => {
      const e1 = createEvent('e1', 10, 0, 12, 0);
      const e2 = createEvent('e2', 11, 0, 12, 0);
      manager.registerEvent(e1);
      manager.registerEvent(e2);
      manager.calculateLayout();
      expect(e2.element.style.zIndex).toBeGreaterThan(e1.element.style.zIndex);
    });

    test('removes compact/micro/narrow-display classes for single event', () => {
      const e1 = createEvent('e1', 10, 0, 11, 0);
      e1.element.classList.add('compact');
      e1.element.classList.add('micro');
      e1.element.classList.add('narrow-display');
      manager.registerEvent(e1);
      manager.calculateLayout();
      expect(e1.element.classList.contains('compact')).toBe(false);
      expect(e1.element.classList.contains('micro')).toBe(false);
      expect(e1.element.classList.contains('narrow-display')).toBe(false);
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
      // 3 overlapping events → moderately crowded → compact styling
      [e1, e2, e3].forEach(e => {
        expect(e.element.classList.contains('compact')).toBe(true);
        expect(e.element.classList.contains('micro')).toBe(false);
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
      // 5 overlapping events → very crowded → micro styling
      events.forEach(e => {
        expect(e.element.classList.contains('micro')).toBe(true);
        expect(e.element.classList.contains('compact')).toBe(false);
      });
    });

    test('populates layoutGroups after calculateLayout', () => {
      manager.registerEvent(createEvent('e1', 10, 0, 11, 0));
      manager.registerEvent(createEvent('e2', 14, 0, 15, 0));
      manager.calculateLayout();
      expect(manager.layoutGroups).toHaveLength(2);
    });

    test('disableTransitions adds then removes no-transition class via requestAnimationFrame', () => {
      // Override the global RAF to capture callback for manual control
      let rafCallback = null;
      const origRAF = global.requestAnimationFrame;
      global.requestAnimationFrame = (cb) => { rafCallback = cb; };

      const e1 = createEvent('e1', 10, 0, 11, 0);
      const e2 = createEvent('e2', 10, 0, 11, 0);
      manager.registerEvent(e1);
      manager.registerEvent(e2);
      manager.calculateLayout(true);

      // Before requestAnimationFrame fires, no-transition should be present
      expect(e1.element.classList.contains('no-transition')).toBe(true);
      expect(e2.element.classList.contains('no-transition')).toBe(true);

      // Simulate requestAnimationFrame callback
      rafCallback();

      // After callback, no-transition should be removed
      expect(e1.element.classList.contains('no-transition')).toBe(false);
      expect(e2.element.classList.contains('no-transition')).toBe(false);

      global.requestAnimationFrame = origRAF;
    });

    test('disableTransitions skips null elements without error', () => {
      const e1 = createEvent('e1', 10, 0, 11, 0);
      e1.element = null;
      manager.events.push(e1);

      expect(() => manager.calculateLayout(true)).not.toThrow();
    });

    test('2-lane group does not get compact or micro class', () => {
      const e1 = createEvent('e1', 10, 0, 11, 0);
      const e2 = createEvent('e2', 10, 0, 11, 0);
      manager.registerEvent(e1);
      manager.registerEvent(e2);
      manager.calculateLayout();
      // 2 overlapping events → not crowded enough for compact/micro
      [e1, e2].forEach(e => {
        expect(e.element.classList.contains('compact')).toBe(false);
        expect(e.element.classList.contains('micro')).toBe(false);
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
      // 4 overlapping events → crowded but not extreme → compact (not micro)
      events.forEach(e => {
        expect(e.element.classList.contains('compact')).toBe(true);
        expect(e.element.classList.contains('micro')).toBe(false);
      });
    });

    test('narrow-display class applied when events are too narrow for full content', () => {
      // With default width and 2 overlapping events, each lane is narrow
      const e1 = createEvent('e1', 10, 0, 11, 0);
      const e2 = createEvent('e2', 10, 0, 11, 0);
      manager.registerEvent(e1);
      manager.registerEvent(e2);
      manager.calculateLayout();
      expect(e1.element.classList.contains('narrow-display')).toBe(true);
      expect(e2.element.classList.contains('narrow-display')).toBe(true);
    });

    test('narrow-display not applied when laneWidth >= MIN_DISPLAY_WIDTH', () => {
      // Use baseElement with wide width so single event gets full width
      const e1 = createEvent('e1', 10, 0, 11, 0);
      manager.registerEvent(e1);
      manager.calculateLayout();
      // Single event layout doesn't go through _applyMultiEventLayout,
      // and removes narrow-display
      expect(e1.element.classList.contains('narrow-display')).toBe(false);
    });

    test('padding is reset to empty string on layout', () => {
      const e1 = createEvent('e1', 10, 0, 11, 0);
      e1.element.style.padding = '20px';
      manager.registerEvent(e1);
      manager.calculateLayout();
      expect(e1.element.style.padding).toBe('');
    });

    test('re-layout after removing an overlapping event restores full width', () => {
      // Step 1: Two overlapping events → each gets partial width
      const e1 = createEvent('e1', 10, 0, 11, 0);
      const e2 = createEvent('e2', 10, 0, 11, 0);
      manager.registerEvent(e1);
      manager.registerEvent(e2);
      manager.calculateLayout();
      const partialWidth = parseFloat(e1.element.style.width);
      expect(partialWidth).toBeLessThan(manager.maxWidth);

      // Step 2: Remove e2, add non-overlapping e3 → each gets full width
      manager.removeEvent('e2');
      const e3 = createEvent('e3', 14, 0, 15, 0);
      manager.registerEvent(e3);
      manager.calculateLayout();

      expect(parseFloat(e1.element.style.width)).toBe(manager.maxWidth);
      expect(parseFloat(e3.element.style.width)).toBe(manager.maxWidth);
      expect(manager.layoutGroups).toHaveLength(2);
    });
  });

  describe('updateBaseElement', () => {
    const savedWindow = global.window;
    beforeEach(() => { global.window = { ResizeObserver: undefined }; });
    afterEach(() => { global.window = savedWindow; });

    test('updates maxWidth based on new element', () => {
      const oldMaxWidth = manager.maxWidth;
      const baseElement = {
        getBoundingClientRect: () => ({ width: 500 }),
      };
      manager.updateBaseElement(baseElement);
      expect(manager.maxWidth).toBeGreaterThan(oldMaxWidth);
      expect(manager.baseElement).toBe(baseElement);
    });

    test('recalculates event widths when base element changes', () => {
      const e1 = createEvent('e1', 10, 0, 11, 0);
      manager.registerEvent(e1);
      manager.calculateLayout();
      const widthBefore = parseFloat(e1.element.style.width);

      const baseElement = {
        getBoundingClientRect: () => ({ width: 500 }),
      };
      manager.updateBaseElement(baseElement);
      const widthAfter = parseFloat(e1.element.style.width);
      // Wider container → wider events
      expect(widthAfter).toBeGreaterThan(widthBefore);
    });

    test('does not recalculate layout when no events', () => {
      const baseElement = {
        getBoundingClientRect: () => ({ width: 500 }),
      };
      // Should not throw even with no events
      expect(() => manager.updateBaseElement(baseElement)).not.toThrow();
    });
  });

  describe('_handleResize', () => {
    const savedWindow = global.window;
    beforeEach(() => { global.window = { ResizeObserver: undefined }; });
    afterEach(() => { global.window = savedWindow; });

    test('recalculates layout when width changes significantly', () => {
      const widthHolder = { width: 400 };
      const baseElement = {
        getBoundingClientRect: () => ({ width: widthHolder.width }),
      };
      const m = new EventLayoutManager(baseElement);
      const e1 = createEvent('e1', 10, 0, 11, 0);
      m.registerEvent(e1);
      m.calculateLayout();
      const originalWidth = parseFloat(e1.element.style.width);

      // Significant width change
      widthHolder.width = 500;
      m._handleResize();
      expect(parseFloat(e1.element.style.width)).toBeGreaterThan(originalWidth);
      m.destroy();
    });

    test('does not recalculate layout when width changes by exactly 5px', () => {
      const widthHolder = { width: 400 };
      const baseElement = {
        getBoundingClientRect: () => ({ width: widthHolder.width }),
      };
      const m = new EventLayoutManager(baseElement);
      const e1 = createEvent('e1', 10, 0, 11, 0);
      m.registerEvent(e1);
      m.calculateLayout();
      const originalWidth = e1.element.style.width;

      widthHolder.width = 405; // Exactly 5px
      m._handleResize();
      expect(e1.element.style.width).toBe(originalWidth);
      m.destroy();
    });

    test('does not recalculate layout when width changes by less than 5px', () => {
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
    });
  });

  describe('maxWidth calculation', () => {
    const savedWindow = global.window;
    afterEach(() => { global.window = savedWindow; });

    test('uses a sensible default when no base element is provided', () => {
      expect(manager.maxWidth).toBeGreaterThan(0);
    });

    test('wider base element produces wider maxWidth', () => {
      global.window = { ResizeObserver: undefined };
      const narrow = new EventLayoutManager({ getBoundingClientRect: () => ({ width: 200 }) });
      const wide = new EventLayoutManager({ getBoundingClientRect: () => ({ width: 600 }) });
      expect(wide.maxWidth).toBeGreaterThan(narrow.maxWidth);
      narrow.destroy();
      wide.destroy();
    });

    test('enforces a minimum width even for very narrow containers', () => {
      global.window = { ResizeObserver: undefined };
      const tiny = new EventLayoutManager({ getBoundingClientRect: () => ({ width: 10 }) });
      expect(tiny.maxWidth).toBeGreaterThanOrEqual(100);
      tiny.destroy();
    });
  });

  describe('clearAllEvents', () => {
    test('clears all events and layout groups', () => {
      manager.registerEvent(createEvent('e1', 10, 0, 11, 0));
      manager.registerEvent(createEvent('e2', 11, 0, 12, 0));
      manager.calculateLayout();
      // Verify populated before clearing
      expect(manager.events).toHaveLength(2);
      expect(manager.layoutGroups.length).toBeGreaterThan(0);

      manager.clearAllEvents();
      expect(manager.events).toHaveLength(0);
      expect(manager.layoutGroups).toHaveLength(0);
    });

    test('after clearing, new layout calculation works from clean state', () => {
      manager.registerEvent(createEvent('e1', 10, 0, 11, 0));
      manager.registerEvent(createEvent('e2', 10, 0, 11, 0));
      manager.calculateLayout();

      manager.clearAllEvents();

      // Register fresh events and verify layout works correctly
      const e3 = createEvent('e3', 14, 0, 15, 0);
      manager.registerEvent(e3);
      manager.calculateLayout();
      expect(manager.events).toHaveLength(1);
      expect(parseFloat(e3.element.style.width)).toBe(manager.maxWidth);
    });
  });

  describe('destroy', () => {
    test('releases all events and layout state', () => {
      manager.registerEvent(createEvent('e1', 10, 0, 11, 0));
      manager.destroy();
      expect(manager.events).toHaveLength(0);
      expect(manager.layoutGroups).toHaveLength(0);
    });

    test('can be called multiple times without error (idempotent)', () => {
      manager.registerEvent(createEvent('e1', 10, 0, 11, 0));
      manager.destroy();
      expect(() => manager.destroy()).not.toThrow();
    });
  });
});
