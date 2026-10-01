/**
 * Tests for CalendarFilterRenderer — the popover's layout: title and
 * refresh, search only for long lists, rows as colour / name / checkbox,
 * group headers, and the settings link.
 *
 * Jest runs without a DOM here, so a minimal element stand-in records what
 * the renderer builds.
 */

import { CalendarFilterRenderer, SEARCH_MIN_CALENDARS } from '../../src/side_panel/components/timeline/calendar-filter-renderer.js';

function makeElement(tagName) {
  const el = {
    tagName: tagName.toUpperCase(),
    children: [],
    parentNode: null,
    className: '',
    textContent: '',
    attributes: {},
    dataset: {},
    listeners: {},
    style: {
      props: {},
      setProperty(name, value) { this.props[name] = value; },
    },
    appendChild(child) {
      child.parentNode = el;
      el.children.push(child);
      return child;
    },
    setAttribute(name, value) { el.attributes[name] = String(value); },
    getAttribute(name) { return name in el.attributes ? el.attributes[name] : null; },
    addEventListener(type, fn) { (el.listeners[type] ||= []).push(fn); },
    fire(type) { (el.listeners[type] || []).forEach(fn => fn({ target: el })); },
    get nextElementSibling() {
      const siblings = el.parentNode ? el.parentNode.children : [];
      return siblings[siblings.indexOf(el) + 1] || null;
    },
    classList: {
      _list: () => el.className.split(/\s+/).filter(Boolean),
      add(...names) { el.className = [...new Set([...this._list(), ...names])].join(' '); },
      remove(...names) { el.className = this._list().filter(n => !names.includes(n)).join(' '); },
      contains(name) { return this._list().includes(name); },
      toggle(name) {
        if (this.contains(name)) { this.remove(name); return false; }
        this.add(name);
        return true;
      },
    },
  };
  Object.defineProperty(el, 'innerHTML', {
    get: () => '',
    set: () => { el.children = []; },
  });
  return el;
}

function all(root, className) {
  const found = [];
  const walk = (node) => {
    node.children.forEach((child) => {
      if (child.className.split(/\s+/).includes(className)) found.push(child);
      walk(child);
    });
  };
  walk(root);
  return found;
}

const one = (root, className) => all(root, className)[0];

beforeAll(() => {
  global.window = global.window || {};
  global.window.getLocalizedMessage = (key) => key;
  global.document = global.document || {};
  global.document.createElement = makeElement;
});

function calendars(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: `cal-${i}`,
    summary: `Calendar ${String(i).padStart(2, '0')}`,
    backgroundColor: '#3f51b5',
    primary: i === 0,
  }));
}

function render({ cals = calendars(3), selected = ['cal-0'], groups = [], searchTerm = '', onManageClick = jest.fn() } = {}) {
  const callbacks = {
    onSearchInput: jest.fn(),
    onRefreshClick: jest.fn(),
    onCalendarToggle: jest.fn(),
    onGroupToggle: jest.fn(),
    onManageClick,
  };
  const renderer = new CalendarFilterRenderer(callbacks);
  const dropdown = makeElement('div');
  const refs = renderer.renderDropdownContent(dropdown, searchTerm, cals, selected, groups);
  return { renderer, dropdown, refs, callbacks };
}

describe('CalendarFilterRenderer', () => {
  test('lays out title and refresh, list, then the settings link', () => {
    const { dropdown, refs } = render();

    expect(dropdown.children.map(c => c.className)).toEqual([
      'timeline-calendar-filter-head',
      'timeline-calendar-filter-list',
      'timeline-calendar-filter-footer',
    ]);
    expect(one(dropdown, 'timeline-calendar-filter-title').textContent).toBe('calendarFilterTitle');
    expect(refs.refreshBtn.className).toBe('timeline-calendar-filter-refresh-btn');
    expect(one(dropdown, 'timeline-calendar-filter-manage').textContent).toBe('calendarFilterManage');
  });

  test('a row is the colour, the name, then the checkbox', () => {
    const { dropdown } = render();
    const row = all(dropdown, 'timeline-calendar-filter-item')[1];

    expect(row.tagName).toBe('LABEL');
    expect(row.children.map(c => c.className)).toEqual([
      'timeline-calendar-filter-color',
      'timeline-calendar-filter-name',
      'timeline-calendar-filter-checkbox',
    ]);
    expect(row.children[0].style.props['--calendar-color']).toBe('#3f51b5');
  });

  test('the main calendar stays checked and cannot be unchecked', () => {
    const { dropdown } = render({ selected: [] });
    const row = all(dropdown, 'timeline-calendar-filter-item')[0];
    const checkbox = row.children[2];

    expect(checkbox.checked).toBe(true);
    expect(checkbox.disabled).toBe(true);
    expect(row.classList.contains('is-locked')).toBe(true);
  });

  test('toggling a row reports the calendar and its new state', () => {
    const { dropdown, callbacks } = render();
    const checkbox = all(dropdown, 'timeline-calendar-filter-item')[2].children[2];

    checkbox.checked = true;
    checkbox.fire('change');

    expect(callbacks.onCalendarToggle).toHaveBeenCalledWith('cal-2', true);
  });

  test('the search box only appears for long lists', () => {
    expect(render({ cals: calendars(SEARCH_MIN_CALENDARS - 1) }).refs.searchInput).toBeNull();

    const { dropdown, refs } = render({ cals: calendars(SEARCH_MIN_CALENDARS) });
    expect(refs.searchInput).not.toBeNull();
    expect(dropdown.children[1]).toBe(refs.searchInput);
  });

  test('a search in progress keeps its box even on a short list', () => {
    const { refs } = render({ searchTerm: 'cal' });
    expect(refs.searchInput.value).toBe('cal');
  });

  test('no settings link without a handler for it', () => {
    const { dropdown } = render({ onManageClick: null });
    expect(one(dropdown, 'timeline-calendar-filter-footer')).toBeUndefined();
  });

  test('the settings link calls its handler', () => {
    const { dropdown, callbacks } = render();
    one(dropdown, 'timeline-calendar-filter-manage').fire('click');
    expect(callbacks.onManageClick).toHaveBeenCalledTimes(1);
  });

  test('a group header folds its calendars and has its checkbox on the right', () => {
    const group = { id: 'g1', name: 'Team', calendarIds: ['cal-1', 'cal-2'] };
    const { dropdown, callbacks } = render({ groups: [group], selected: ['cal-0', 'cal-1'] });
    const [header, ungroupedHeader] = all(dropdown, 'timeline-calendar-filter-group-header');
    const [toggle, checkbox] = header.children;

    expect(header.dataset.groupId).toBe('g1');
    expect(toggle.tagName).toBe('BUTTON');
    expect(one(toggle, 'group-name').textContent).toBe('Team');
    expect(checkbox.indeterminate).toBe(true);
    expect(checkbox.getAttribute('aria-checked')).toBe('mixed');

    toggle.fire('click');
    expect(header.nextElementSibling.classList.contains('collapsed')).toBe(true);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');

    checkbox.checked = true;
    checkbox.fire('change');
    expect(callbacks.onGroupToggle).toHaveBeenCalledWith(group, expect.any(Array), true);

    // The ungrouped section folds too, but has no checkbox
    expect(ungroupedHeader.children.map(c => c.tagName)).toEqual(['BUTTON']);
    expect(one(ungroupedHeader, 'group-name').textContent).toBe('ungrouped');
  });

  test('a status keeps the title and the settings link around it', () => {
    const renderer = new CalendarFilterRenderer({ onRefreshClick: jest.fn(), onManageClick: jest.fn() });
    const dropdown = makeElement('div');

    const { refreshBtn } = renderer.renderStatus(dropdown, 'Loading', { busy: true });

    expect(dropdown.children.map(c => c.className)).toEqual([
      'timeline-calendar-filter-head',
      'timeline-calendar-filter-status',
      'timeline-calendar-filter-footer',
    ]);
    expect(dropdown.children[1].getAttribute('role')).toBe('status');
    expect(refreshBtn.disabled).toBe(true);
    expect(refreshBtn.children[0].className).toContain('fa-spin');

    const idle = renderer.renderStatus(dropdown, 'Failed');
    expect(idle.refreshBtn.disabled).toBe(false);
    expect(renderer.calendarList).toBeNull();
  });
});
