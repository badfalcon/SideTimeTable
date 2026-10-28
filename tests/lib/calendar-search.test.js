/**
 * Tests for calendar search matching.
 *
 * SPEC: the calendar picker in the group create/edit modal must find a
 * calendar by its display name OR by its address (email), because shared
 * calendars are often remembered by the owner's address rather than the
 * name Google shows for them.
 */

import { calendarMatchesSearch } from '../../src/lib/calendar-search.js';

const CALENDAR = { id: 'tanaka@example.com', summary: '田中 太郎' };

describe('calendarMatchesSearch', () => {
  test('matches on the display name', () => {
    expect(calendarMatchesSearch(CALENDAR, '田中')).toBe(true);
  });

  test('matches on the email address', () => {
    expect(calendarMatchesSearch(CALENDAR, 'tanaka@')).toBe(true);
    expect(calendarMatchesSearch(CALENDAR, 'example.com')).toBe(true);
  });

  test('matches the email address case-insensitively', () => {
    expect(calendarMatchesSearch(CALENDAR, 'TANAKA')).toBe(true);
    expect(calendarMatchesSearch({ id: 'TANAKA@EXAMPLE.COM' }, 'tanaka')).toBe(true);
  });

  test('matches the display name case-insensitively', () => {
    expect(calendarMatchesSearch({ id: 'x@example.com', summary: 'Work Calendar' }, 'work')).toBe(true);
  });

  test('ignores surrounding whitespace in the term', () => {
    expect(calendarMatchesSearch(CALENDAR, '  tanaka  ')).toBe(true);
  });

  test('does not match an unrelated term', () => {
    expect(calendarMatchesSearch(CALENDAR, 'suzuki')).toBe(false);
  });

  test('does not match across the name/address boundary', () => {
    expect(calendarMatchesSearch(CALENDAR, '太郎 tanaka')).toBe(false);
  });

  test('matches everything for an empty or whitespace-only term', () => {
    expect(calendarMatchesSearch(CALENDAR, '')).toBe(true);
    expect(calendarMatchesSearch(CALENDAR, '   ')).toBe(true);
    expect(calendarMatchesSearch(CALENDAR, null)).toBe(true);
    expect(calendarMatchesSearch(CALENDAR, undefined)).toBe(true);
  });

  test('handles calendars missing a summary or id', () => {
    expect(calendarMatchesSearch({ id: 'noname@example.com' }, 'noname')).toBe(true);
    expect(calendarMatchesSearch({ summary: 'No address' }, 'address')).toBe(true);
    expect(calendarMatchesSearch({}, 'anything')).toBe(false);
    expect(calendarMatchesSearch(null, 'anything')).toBe(false);
  });
});
