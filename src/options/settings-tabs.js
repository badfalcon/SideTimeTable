/**
 * Settings sections as tabs: the list on the left (a segmented control in a
 * narrow window) shows one panel at a time.
 *
 * Each tab is a `role="tab"` button whose `aria-controls` names its panel;
 * the selected tab has `aria-selected="true"` and the other panels are
 * `hidden`. Arrow keys move between visible tabs and select them (Home and
 * End go to the first and last), and only the selected tab is in the Tab
 * order.
 */

/**
 * @param {HTMLElement} tab
 * @returns {boolean}
 */
function isAvailable(tab) {
    return !tab.hidden;
}

/**
 * Show one tab's panel and hide the others.
 * @param {HTMLElement[]} tabs
 * @param {HTMLElement} selected
 */
export function selectTab(tabs, selected) {
    tabs.forEach(tab => {
        const isSelected = tab === selected;
        tab.setAttribute('aria-selected', String(isSelected));
        tab.tabIndex = isSelected ? 0 : -1;
        const panel = document.getElementById(tab.getAttribute('aria-controls'));
        if (panel) {
            panel.hidden = !isSelected;
        }
    });
}

/**
 * The tab an arrow, Home or End key moves to, among the visible tabs.
 * @param {HTMLElement[]} tabs
 * @param {HTMLElement} current
 * @param {string} key
 * @returns {HTMLElement|null}
 */
export function tabForKey(tabs, current, key) {
    const available = tabs.filter(isAvailable);
    const index = available.indexOf(current);
    if (index === -1 || available.length === 0) return null;
    switch (key) {
        case 'ArrowDown':
        case 'ArrowRight':
            return available[(index + 1) % available.length];
        case 'ArrowUp':
        case 'ArrowLeft':
            return available[(index - 1 + available.length) % available.length];
        case 'Home':
            return available[0];
        case 'End':
            return available[available.length - 1];
        default:
            return null;
    }
}

/**
 * Wire the tabs in a tab list.
 * @param {HTMLElement} tablist - The element with `role="tablist"`
 */
export function setupSettingsTabs(tablist) {
    if (!tablist) return;
    const tabs = [...tablist.querySelectorAll('[role="tab"]')];
    const initial = tabs.find(tab => tab.getAttribute('aria-selected') === 'true') || tabs[0];
    if (initial) {
        selectTab(tabs, initial);
    }

    tabs.forEach(tab => {
        tab.addEventListener('click', () => selectTab(tabs, tab));
    });

    tablist.addEventListener('keydown', (event) => {
        const current = event.target.closest('[role="tab"]');
        if (!current) return;
        const next = tabForKey(tabs, current, event.key);
        if (!next) return;
        event.preventDefault();
        selectTab(tabs, next);
        next.focus();
    });
}
