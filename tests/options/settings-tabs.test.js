import { tabForKey } from '../../src/options/settings-tabs.js';

describe('settings-tabs', () => {
    // ---------------------------------------------------------------
    // SPEC: Keyboard movement between the settings sections
    // - Arrow keys move to the next / previous visible tab, wrapping around
    // - Home / End go to the first / last visible tab
    // - Hidden tabs (the developer section when it is off) are skipped
    // - Other keys do nothing
    // ---------------------------------------------------------------
    const tab = (id, hidden = false) => ({ id, hidden });
    const google = tab('google');
    const display = tab('display');
    const general = tab('general');
    const developer = tab('developer', true);
    const tabs = [google, display, general, developer];

    test('ArrowDown and ArrowRight move to the next tab', () => {
        expect(tabForKey(tabs, google, 'ArrowDown')).toBe(display);
        expect(tabForKey(tabs, display, 'ArrowRight')).toBe(general);
    });

    test('ArrowUp and ArrowLeft move to the previous tab', () => {
        expect(tabForKey(tabs, general, 'ArrowUp')).toBe(display);
        expect(tabForKey(tabs, display, 'ArrowLeft')).toBe(google);
    });

    test('wraps around, skipping a hidden tab', () => {
        expect(tabForKey(tabs, general, 'ArrowDown')).toBe(google);
        expect(tabForKey(tabs, google, 'ArrowUp')).toBe(general);
    });

    test('a shown developer tab is reachable', () => {
        const shown = [google, display, general, tab('developer')];
        expect(tabForKey(shown, general, 'ArrowDown')).toBe(shown[3]);
        expect(tabForKey(shown, google, 'End')).toBe(shown[3]);
    });

    test('Home and End go to the first and last visible tab', () => {
        expect(tabForKey(tabs, general, 'Home')).toBe(google);
        expect(tabForKey(tabs, google, 'End')).toBe(general);
    });

    test('other keys and unknown tabs do nothing', () => {
        expect(tabForKey(tabs, google, 'Enter')).toBeNull();
        expect(tabForKey(tabs, tab('other'), 'ArrowDown')).toBeNull();
    });
});
