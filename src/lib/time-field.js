/**
 * A time field written in the extension's language and 12/24-hour setting.
 *
 * Chrome draws `<input type="time">` in Chrome's own language, so a Japanese
 * extension in an English Chrome showed "04:30 PM" in its time fields while
 * the rest of the panel said "午後4:30". This field is a text box that shows
 * the time the way the event blocks write it ("09:00", "9:00 AM",
 * "午前9:00"), takes what people type ("930", "9:30pm", "21時30分"), and
 * offers a list of times every 15 minutes, like Google Calendar's.
 *
 * The element is still an `<input>` (labels, focus, `disabled`, `required`
 * and `change` events work as before), and its `value` keeps the contract of
 * a time input: it reads and writes "HH:MM" (24-hour), or "" when empty.
 */
import { formatClockTime } from './time-utils.js';
import { getDisplayPrefs } from './display-prefs.js';

const LIST_MAX_HEIGHT = 224;
const VIEWPORT_MARGIN = 8;

/**
 * Read a time someone typed. Accepts "9", "930", "0930", "9:30", "9.30",
 * "21:30", "9:30 pm", "9p", "12am", "午前9:30", "午後9時", "21時30分",
 * "9時半" and full-width digits.
 * @param {string} text
 * @returns {string|null} "HH:MM", or null when it is not a time
 */
export function parseTimeText(text) {
    if (typeof text !== 'string') return null;
    let s = text.normalize('NFKC').trim().toLowerCase();
    if (!s) return null;

    let meridiem = null;
    if (s.includes('午前')) {
        meridiem = 'am';
        s = s.replace('午前', '');
    } else if (s.includes('午後')) {
        meridiem = 'pm';
        s = s.replace('午後', '');
    }

    const marker = s.match(/\s*([ap])\.?\s*(m\.?)?$/);
    if (marker) {
        if (meridiem) return null;
        meridiem = marker[1] === 'a' ? 'am' : 'pm';
        s = s.slice(0, marker.index);
    }

    s = s.trim()
        .replace(/時半$/, ':30')
        .replace(/分$/, '')
        .replace('時', ':')
        .replace(/:$/, '');

    let hour;
    let minute;
    let match;
    if ((match = s.match(/^(\d{1,2})(?:[:.h](\d{1,2}))?$/))) {
        hour = Number(match[1]);
        minute = match[2] === undefined ? 0 : Number(match[2]);
    } else if ((match = s.match(/^(\d{1,2})(\d{2})$/))) {
        hour = Number(match[1]);
        minute = Number(match[2]);
    } else {
        return null;
    }

    if (meridiem) {
        if (hour > 12) {
            if (meridiem === 'am') return null;
        } else if (hour === 12) {
            hour = meridiem === 'am' ? 0 : 12;
        } else if (meridiem === 'pm') {
            hour += 12;
        }
    }

    if (hour > 23 || minute > 59) return null;
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/**
 * Write a time the way the timeline does: "09:00", "9:00 AM" or "午前9:00".
 * @param {string} hhmm - "HH:MM"
 * @param {{locale: string, timeFormat: string}} prefs
 * @returns {string}
 */
export function formatTimeText(hhmm, prefs) {
    if (!/^\d{2}:\d{2}$/.test(hhmm || '')) return '';
    return formatClockTime(hhmm, prefs.timeFormat, prefs.locale);
}

/**
 * The times the list offers.
 * @param {number} [step=15] - Minutes between them
 * @returns {string[]} "00:00", "00:15", … "23:45"
 */
export function buildTimeOptions(step = 15) {
    const times = [];
    for (let minutes = 0; minutes < 24 * 60; minutes += step) {
        times.push(`${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`);
    }
    return times;
}

/**
 * The option to highlight for a time: the same time, or the next one after
 * it (the last one for times after it).
 * @param {string[]} times - From buildTimeOptions
 * @param {string} hhmm
 * @returns {number} Index, or -1 for no time
 */
export function nearestTimeIndex(times, hhmm) {
    if (!hhmm) return -1;
    const index = times.findIndex(time => time >= hhmm);
    return index === -1 ? times.length - 1 : index;
}

let fieldCount = 0;

/**
 * Create a time field.
 * @param {Object} [options]
 * @param {string} [options.id]
 * @param {string} [options.className] - Classes for the look of the page
 * @param {Function} [options.getPrefs] - Returns {locale, timeFormat}
 * @param {number} [options.step=15] - Minutes between the listed times
 * @param {string} [options.defaultTime='09:00'] - Highlighted in the list when empty
 * @returns {HTMLInputElement}
 */
export function createTimeField({ id, className = '', getPrefs = getDisplayPrefs, step = 15, defaultTime = '09:00' } = {}) {
    const native = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
    const input = document.createElement('input');
    input.type = 'text';
    if (id) input.id = id;
    input.className = `time-field ${className}`.trim();
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-autocomplete', 'none');
    input.setAttribute('aria-haspopup', 'listbox');
    input.setAttribute('aria-expanded', 'false');

    const listId = `${id || `time-field-${++fieldCount}`}-options`;
    input.setAttribute('aria-controls', listId);

    const times = buildTimeOptions(step);
    let committed = '';
    let notified = '';
    let dispatching = false;
    let list = null;
    let activeIndex = -1;
    let justFocused = false;

    const readText = () => native.get.call(input);
    const writeText = (text) => native.set.call(input, text);
    const show = () => writeText(committed ? formatTimeText(committed, getPrefs()) : '');

    // Typed text that is not a time leaves the last time in place
    const commit = () => {
        const text = readText();
        const parsed = parseTimeText(text);
        if (parsed) {
            committed = parsed;
        } else if (!text.trim()) {
            committed = '';
        }
        show();
    };

    // Tell listeners once per actual change
    const notify = () => {
        commit();
        if (committed === notified) return;
        notified = committed;
        dispatching = true;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        dispatching = false;
    };

    Object.defineProperty(input, 'value', {
        configurable: true,
        get() {
            return parseTimeText(readText()) || '';
        },
        set(value) {
            committed = parseTimeText(String(value ?? '')) || '';
            notified = committed;
            show();
        }
    });

    // ----- The list -----

    const isOpen = () => !!list && list.matches(':popover-open');

    const setActive = (index, { center = false } = {}) => {
        activeIndex = index;
        [...list.children].forEach((option, i) => {
            option.classList.toggle('is-active', i === index);
            option.setAttribute('aria-selected', String(i === index));
        });
        const option = list.children[index];
        if (!option) {
            input.removeAttribute('aria-activedescendant');
            return;
        }
        input.setAttribute('aria-activedescendant', option.id);
        if (center) {
            list.scrollTop = option.offsetTop - (list.clientHeight - option.offsetHeight) / 2;
        } else {
            option.scrollIntoView({ block: 'nearest' });
        }
    };

    const close = () => {
        if (!isOpen()) return;
        list.hidePopover();
        input.setAttribute('aria-expanded', 'false');
        input.removeAttribute('aria-activedescendant');
        window.removeEventListener('resize', close);
        document.removeEventListener('scroll', onScroll, true);
    };

    const onScroll = (event) => {
        if (event.target !== list) close();
    };

    const pick = (index) => {
        const time = times[index];
        if (!time) return;
        writeText(formatTimeText(time, getPrefs()));
        notify();
        close();
        input.select();
    };

    const ensureList = () => {
        if (!list) {
            list = document.createElement('ul');
            list.id = listId;
            list.className = 'time-field-list';
            list.setAttribute('role', 'listbox');
            list.popover = 'manual';
            // Keep the focus in the field
            list.addEventListener('pointerdown', (event) => event.preventDefault());
            list.addEventListener('click', (event) => {
                const option = event.target.closest('.time-field-option');
                if (option) pick(Number(option.dataset.index));
            });
        }
        if (list.previousElementSibling !== input) {
            input.after(list);
        }
        const prefs = getPrefs();
        list.replaceChildren(...times.map((time, index) => {
            const option = document.createElement('li');
            option.id = `${listId}-${index}`;
            option.className = 'time-field-option';
            option.setAttribute('role', 'option');
            option.setAttribute('aria-selected', 'false');
            option.dataset.index = String(index);
            option.classList.toggle('is-selected', time === committed);
            option.textContent = formatTimeText(time, prefs);
            return option;
        }));
    };

    const place = () => {
        const rect = input.getBoundingClientRect();
        const below = window.innerHeight - rect.bottom - VIEWPORT_MARGIN;
        const above = rect.top - VIEWPORT_MARGIN;
        const downward = below >= Math.min(LIST_MAX_HEIGHT, 160) || below >= above;
        list.style.minWidth = `${Math.round(rect.width)}px`;
        list.style.left = `${Math.round(rect.left)}px`;
        list.style.maxHeight = `${Math.max(96, Math.min(LIST_MAX_HEIGHT, (downward ? below : above) - 4))}px`;
        if (downward) {
            list.style.top = `${Math.round(rect.bottom + 4)}px`;
        } else {
            list.style.top = `${Math.round(rect.top - 4 - list.offsetHeight)}px`;
        }
        // Keep it inside a narrow panel
        const overflow = list.getBoundingClientRect().right - (window.innerWidth - VIEWPORT_MARGIN);
        if (overflow > 0) {
            list.style.left = `${Math.max(VIEWPORT_MARGIN, Math.round(rect.left - overflow))}px`;
        }
    };

    const open = () => {
        if (isOpen() || input.disabled || input.readOnly || !input.isConnected) return;
        ensureList();
        list.showPopover();
        input.setAttribute('aria-expanded', 'true');
        place();
        const current = parseTimeText(readText()) || committed;
        setActive(nearestTimeIndex(times, current || defaultTime), { center: true });
        window.addEventListener('resize', close);
        document.addEventListener('scroll', onScroll, true);
    };

    // ----- The field -----

    // The browser's own change (on blur or Enter): tidy the text and pass it
    // on only if the time really changed. Events sent from code — ours after
    // a pick, or a caller's — go through as they are.
    input.addEventListener('change', (event) => {
        if (!event.isTrusted) return;
        commit();
        if (committed === notified) {
            event.stopImmediatePropagation();
            return;
        }
        notified = committed;
    });

    input.addEventListener('keydown', (event) => {
        if (event.isComposing) return;
        const openNow = isOpen();
        switch (event.key) {
            case 'ArrowDown':
            case 'ArrowUp':
                event.preventDefault();
                if (!openNow) {
                    open();
                } else {
                    const delta = event.key === 'ArrowDown' ? 1 : -1;
                    setActive(Math.min(times.length - 1, Math.max(0, activeIndex + delta)));
                }
                return;
            case 'PageDown':
            case 'PageUp':
                if (!openNow) return;
                event.preventDefault();
                setActive(Math.min(times.length - 1, Math.max(0, activeIndex + (event.key === 'PageDown' ? 4 : -4))));
                return;
            case 'Enter':
                if (openNow && activeIndex >= 0) {
                    event.preventDefault();
                    pick(activeIndex);
                } else {
                    notify();
                }
                return;
            case 'Escape':
                // Close the list, not the dialog
                if (openNow) {
                    event.preventDefault();
                    event.stopPropagation();
                    close();
                }
                return;
            case 'Tab':
                close();
                return;
            default:
        }
    });

    input.addEventListener('input', () => {
        if (dispatching || !isOpen()) return;
        const parsed = parseTimeText(readText());
        if (parsed) setActive(nearestTimeIndex(times, parsed), { center: true });
    });

    input.addEventListener('focus', () => {
        justFocused = true;
        input.select();
    });

    input.addEventListener('click', () => {
        if (justFocused) {
            // The click that focused the field would otherwise place the caret
            input.select();
            justFocused = false;
            open();
            return;
        }
        if (isOpen()) {
            close();
        } else {
            open();
        }
    });

    input.addEventListener('blur', () => {
        justFocused = false;
        close();
    });

    return input;
}
