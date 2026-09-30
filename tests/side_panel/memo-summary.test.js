/**
 * Tests for the line shown in the collapsed memo bar.
 */
import { summarizeMemo } from '../../src/side_panel/components/memo/memo-summary.js';

describe('summarizeMemo', () => {
  test('takes the first line that has text', () => {
    expect(summarizeMemo('\n\n  📋 本日のTODO\n・資料を準備')).toBe('📋 本日のTODO');
  });

  test.each([
    ['# Today', 'Today'],
    ['### Notes', 'Notes'],
    ['- Buy milk', 'Buy milk'],
    ['* item', 'item'],
    ['1. First', 'First'],
    ['- [ ] Open task', 'Open task'],
    ['- [x] Done task', 'Done task'],
    ['> quoted', 'quoted'],
  ])('drops the Markdown marker in %p', (input, expected) => {
    expect(summarizeMemo(input)).toBe(expected);
  });

  test('keeps text that only looks like a marker without a space', () => {
    expect(summarizeMemo('#hashtag')).toBe('#hashtag');
    expect(summarizeMemo('-5度')).toBe('-5度');
  });

  test('skips lines that are only a marker', () => {
    expect(summarizeMemo('- \n## \nReal line')).toBe('Real line');
  });

  test('an empty memo gives an empty string', () => {
    expect(summarizeMemo('')).toBe('');
    expect(summarizeMemo('  \n \n')).toBe('');
    expect(summarizeMemo(undefined)).toBe('');
  });
});
