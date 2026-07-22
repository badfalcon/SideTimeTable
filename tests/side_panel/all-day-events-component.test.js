/**
 * Tests for AllDayEventsComponent
 */

// Minimal DOM mock for node test environment
function mockElement(tag = 'div') {
  const children = [];
  const el = {
    tagName: tag.toUpperCase(),
    id: '',
    className: '',
    style: {},
    children,
    childNodes: children,
    innerHTML: '',
    appendChild(child) { children.push(child); return child; },
    contains(child) { return children.includes(child); },
    querySelectorAll(sel) {
      if (sel === '.all-day-events-container') {
        return children.filter(c => c.className === 'all-day-events-container');
      }
      return [];
    },
    remove() {},
    parentNode: null,
  };
  // Make innerHTML = '' clear children
  Object.defineProperty(el, 'innerHTML', {
    get() { return children.length > 0 ? '<children>' : ''; },
    set(val) { if (val === '') children.length = 0; },
  });
  return el;
}

const createdElements = [];
beforeAll(() => {
  global.document = {
    getElementById: jest.fn(() => null),
    createElement: jest.fn(() => {
      const el = mockElement();
      createdElements.push(el);
      return el;
    }),
  };
});

afterAll(() => {
  delete global.document;
});

import { AllDayEventsComponent } from '../../src/side_panel/components/timeline/all-day-events-component.js';

describe('AllDayEventsComponent', () => {
  let component;

  beforeEach(() => {
    jest.clearAllMocks();
    createdElements.length = 0;
    component = new AllDayEventsComponent();
    component.createElement();
  });

  afterEach(() => {
    component.destroy();
  });

  // -------------------------------------------------------------------
  // SPEC: Initial state
  // -------------------------------------------------------------------

  test('starts hidden', () => {
    expect(component.element.style.display).toBe('none');
  });

  test('creates an inner container with correct class', () => {
    expect(component.container).toBeTruthy();
    expect(component.container.className).toBe('all-day-events-container');
    expect(component.element.contains(component.container)).toBe(true);
  });

  test('getContainer returns the inner container', () => {
    expect(component.getContainer()).toBe(component.container);
  });

  // -------------------------------------------------------------------
  // SPEC: clear()
  // -------------------------------------------------------------------

  test('clear removes all children and hides the section', () => {
    component.container.appendChild(mockElement());
    component.show();

    component.clear();

    expect(component.container.children.length).toBe(0);
    expect(component.element.style.display).toBe('none');
  });

  // -------------------------------------------------------------------
  // SPEC: updateVisibility()
  // -------------------------------------------------------------------

  test('updateVisibility shows the section when container has children', () => {
    component.container.appendChild(mockElement());

    component.updateVisibility();

    expect(component.element.style.display).toBe('');
  });

  test('updateVisibility hides the section when container is empty', () => {
    component.show();

    component.updateVisibility();

    expect(component.element.style.display).toBe('none');
  });

  // -------------------------------------------------------------------
  // SPEC: createElement idempotency
  // -------------------------------------------------------------------

  test('calling createElement twice does not create duplicate containers', () => {
    const firstContainer = component.container;

    component.createElement();

    expect(component.container).toBe(firstContainer);
  });

  // -------------------------------------------------------------------
  // SPEC: destroy
  // -------------------------------------------------------------------

  test('destroy nulls out the container reference', () => {
    component.destroy();

    expect(component.container).toBeNull();
    expect(component.element).toBeNull();
  });
});
