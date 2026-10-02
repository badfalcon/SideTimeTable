/**
 * A date field and a month calendar written in the extension's language.
 *
 * Chrome draws `<input type="date">` and its picker in Chrome's own language,
 * so a Japanese extension in an English Chrome asked for "mm/dd/yyyy". This
 * field is a text box that shows the date the way the header writes it
 * ("10月31日(土)", "Sat, Oct 31"), takes what people type ("10/31",
 * "2026-10-31", "10月31日", "Oct 31"), and opens a month calendar.
 *
 * Like the time field it is still an `<input>` (labels, focus, `disabled`
 * and `change` events work as before), and its `value` keeps the contract of
 * a date input: it reads and writes "YYYY-MM-DD", or "" when empty. Its `min`
 * ("YYYY-MM-DD") greys out the earlier days in the calendar.
 *
 * The calendar on its own (createDateCalendar) is also what the header's
 * date label opens.
 */
import { formatHeaderDate } from './time-utils.js';
import { getDisplayPrefs } from './display-prefs.js';

const VIEWPORT_MARGIN = 8;
const MONTH_NAMES = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'
];

const pad = (number) => String(number).padStart(2, '0');
const intlLocale = (locale) => (locale === 'ja' ? 'ja-JP' : 'en-US');

/**
 * @param {Date} date
 * @returns {string} "YYYY-MM-DD" in local time
 */
export function toYmd(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * @param {number} year
 * @param {number} month - 1 to 12
 * @param {number} day
 * @returns {string|null} "YYYY-MM-DD", or null when there is no such day
 */
function makeYmd(year, month, day) {
    if (year < 1000 || year > 9999 || month < 1 || month > 12 || day < 1) return null;
    if (day > new Date(year, month, 0).getDate()) return null;
    return `${year}-${pad(month)}-${pad(day)}`;
}

/**
 * @param {string} ymd - "YYYY-MM-DD"
 * @returns {Date|null} Local midnight of that day, or null when it is not one
 */
export function fromYmd(ymd) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(typeof ymd === 'string' ? ymd : '');
    if (!match) return null;
    const [year, month, day] = match.slice(1).map(Number);
    if (!makeYmd(year, month, day)) return null;
    return new Date(year, month - 1, day);
}

/**
 * @param {string} ymd
 * @param {number} days
 * @returns {string}
 */
export function addDays(ymd, days) {
    const date = fromYmd(ymd);
    date.setDate(date.getDate() + days);
    return toYmd(date);
}

/**
 * The same day some months later or earlier, or the last day of a shorter
 * month (Jan 31 + 1 month = Feb 28).
 * @param {string} ymd
 * @param {number} months
 * @returns {string}
 */
export function addMonths(ymd, months) {
    const date = fromYmd(ymd);
    const first = new Date(date.getFullYear(), date.getMonth() + months, 1);
    const lastDay = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    return toYmd(new Date(first.getFullYear(), first.getMonth(), Math.min(date.getDate(), lastDay)));
}

/**
 * @param {string} word - "oct", "october", "sept"…
 * @returns {number} 1 to 12, or 0 when it is not a month
 */
function monthFromWord(word) {
    if (word.length < 3) return 0;
    return MONTH_NAMES.findIndex(name => name.startsWith(word)) + 1;
}

/**
 * Read a date someone typed. Accepts "2026-10-31", "2026/10/31",
 * "10/31/2026", "10/31", "20261031", "1031", "2026年10月31日", "10月31日",
 * "Oct 31", "October 31, 2026", "31 Oct 2026", "today" / "今日",
 * "tomorrow" / "明日", full-width digits, and the field's own text with its
 * weekday ("10月31日(土)", "Sat, Oct 31"). A date without a year is in the
 * current one, as the field writes it.
 * @param {string} text
 * @param {Date} [now=new Date()]
 * @returns {string|null} "YYYY-MM-DD", or null when it is not a date
 */
export function parseDateText(text, now = new Date()) {
    if (typeof text !== 'string') return null;
    let s = text.normalize('NFKC').trim().toLowerCase();
    if (!s) return null;

    if (s === 'today' || s === '今日' || s === 'きょう') return toYmd(now);
    if (s === 'tomorrow' || s === '明日' || s === 'あした') return addDays(toYmd(now), 1);

    s = s.replace(/\([^)]*\)/g, ' ')
        .replace(/[日月火水木金土]曜日?/g, ' ')
        .trim()
        .replace(/^(sun|mon|tue|wed|thu|fri|sat)[a-z]*\.?,?\s*/, '')
        .replace(/\s+/g, ' ')
        .trim();

    const thisYear = now.getFullYear();
    const num = Number;
    let match;
    if ((match = s.match(/^(?:(\d{4}) ?年 ?)?(\d{1,2}) ?月 ?(\d{1,2}) ?日?$/))) {
        return makeYmd(match[1] ? num(match[1]) : thisYear, num(match[2]), num(match[3]));
    }
    if ((match = s.match(/^(\d{4}) ?[-/.] ?(\d{1,2}) ?[-/.] ?(\d{1,2})$/))) {
        return makeYmd(num(match[1]), num(match[2]), num(match[3]));
    }
    if ((match = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4}|\d{2})$/))) {
        const year = match[3].length === 2 ? 2000 + num(match[3]) : num(match[3]);
        return makeYmd(year, num(match[1]), num(match[2]));
    }
    if ((match = s.match(/^(\d{1,2})[-/.](\d{1,2})$/))) {
        return makeYmd(thisYear, num(match[1]), num(match[2]));
    }
    if ((match = s.match(/^(\d{4})(\d{2})(\d{2})$/))) {
        return makeYmd(num(match[1]), num(match[2]), num(match[3]));
    }
    if ((match = s.match(/^(\d{2})(\d{2})$/))) {
        return makeYmd(thisYear, num(match[1]), num(match[2]));
    }
    if ((match = s.match(/^([a-z]+)\.? ?(\d{1,2})(?:st|nd|rd|th)?(?:,? ?(\d{4}))?$/))) {
        const month = monthFromWord(match[1]);
        return month ? makeYmd(match[3] ? num(match[3]) : thisYear, month, num(match[2])) : null;
    }
    if ((match = s.match(/^(\d{1,2})(?:st|nd|rd|th)? ?([a-z]+)\.?,?(?: ?(\d{4}))?$/))) {
        const month = monthFromWord(match[2]);
        return month ? makeYmd(match[3] ? num(match[3]) : thisYear, month, num(match[1])) : null;
    }
    return null;
}

/**
 * Write a date the way the header does: "10月31日(土)" / "Sat, Oct 31", with
 * the year when it is not the current one.
 * @param {string} ymd - "YYYY-MM-DD"
 * @param {{locale: string}} prefs
 * @param {Date} [now=new Date()]
 * @returns {string}
 */
export function formatDateText(ymd, prefs, now = new Date()) {
    const date = fromYmd(ymd);
    return date ? formatHeaderDate(date, prefs.locale, now) : '';
}

/**
 * The calendar's heading: "2026年10月" / "October 2026".
 * @param {number} year
 * @param {number} month - 0 to 11
 * @param {string} locale - 'ja' or 'en'
 * @returns {string}
 */
export function formatMonthTitle(year, month, locale) {
    return new Date(year, month, 1).toLocaleDateString(intlLocale(locale), { year: 'numeric', month: 'long' });
}

/**
 * Weekday names from Sunday: "日"… / "S"… (narrow), or "日曜日"… /
 * "Sunday"… (long).
 * @param {string} locale - 'ja' or 'en'
 * @param {string} [width='narrow']
 * @returns {string[]}
 */
export function weekdayNames(locale, width = 'narrow') {
    // 4 January 2026 is a Sunday
    return Array.from({ length: 7 }, (_, i) =>
        new Date(2026, 0, 4 + i).toLocaleDateString(intlLocale(locale), { weekday: width }));
}

/**
 * The 42 days a month's calendar shows: six weeks from the Sunday on or
 * before the 1st.
 * @param {number} year
 * @param {number} month - 0 to 11
 * @returns {string[]} "YYYY-MM-DD"
 */
export function buildMonthDays(year, month) {
    const first = new Date(year, month, 1);
    return Array.from({ length: 42 }, (_, i) =>
        toYmd(new Date(year, month, 1 - first.getDay() + i)));
}

let calendarCount = 0;

/**
 * A month calendar in a popover. The keys move a highlighted day (arrows a
 * day or a week, Page Up/Down a month, with Shift a year) and Enter picks it.
 *
 * It is driven one of two ways. Under a date field the focus stays in the
 * field, which passes its keys to handleKey(), and the field is the `owner`
 * that points at the highlighted day. Opened from a button (`focusable`),
 * the calendar is a dialog: the focus moves into its grid, and a click
 * outside or Escape closes it.
 *
 * @param {Object} [options]
 * @param {string} [options.id]
 * @param {Function} [options.getPrefs] - Returns {locale}
 * @param {HTMLElement} [options.owner] - Element focused while the calendar is open, if not the grid
 * @param {boolean} [options.focusable=false]
 * @param {string} [options.label] - Name of the dialog (focusable)
 * @param {string} [options.align='start'] - 'start' or 'center' under the anchor
 * @param {Function} [options.onPick] - Called with "YYYY-MM-DD"
 * @param {Function} [options.onClose] - Called with why: 'escape', 'outside', 'blur', 'dismiss' or 'code'
 */
export function createDateCalendar({
    id,
    getPrefs = getDisplayPrefs,
    owner = null,
    focusable = false,
    label = '',
    align = 'start',
    onPick = () => {},
    onClose = () => {}
} = {}) {
    const calendarId = id || `date-calendar-${++calendarCount}`;
    const message = (key, fallback) => window.getLocalizedMessage?.(key) || fallback;

    const element = document.createElement('div');
    element.id = calendarId;
    element.className = 'date-calendar';
    element.popover = 'manual';
    if (focusable) {
        element.setAttribute('role', 'dialog');
        if (label) element.setAttribute('aria-label', label);
    }

    const head = document.createElement('div');
    head.className = 'date-calendar-head';

    const title = document.createElement('div');
    title.id = `${calendarId}-title`;
    title.className = 'date-calendar-title';
    title.setAttribute('aria-live', 'polite');

    const navButton = (step, key, fallback, icon) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'date-calendar-nav';
        button.dataset.step = String(step);
        button.tabIndex = focusable ? 0 : -1;
        button.title = message(key, fallback);
        button.setAttribute('aria-label', button.title);
        const glyph = document.createElement('i');
        glyph.className = `fas ${icon}`;
        glyph.setAttribute('aria-hidden', 'true');
        button.appendChild(glyph);
        return button;
    };
    head.append(
        navButton(-1, 'previousMonth', 'Previous month', 'fa-chevron-left'),
        title,
        navButton(1, 'nextMonth', 'Next month', 'fa-chevron-right')
    );

    const grid = document.createElement('div');
    grid.id = `${calendarId}-grid`;
    grid.className = 'date-calendar-grid';
    grid.setAttribute('role', 'grid');
    grid.setAttribute('aria-labelledby', title.id);
    if (focusable) grid.tabIndex = 0;

    const weekdayRow = document.createElement('div');
    weekdayRow.className = 'date-calendar-row date-calendar-weekdays';
    weekdayRow.setAttribute('role', 'row');
    const weekdayCells = Array.from({ length: 7 }, () => {
        const cell = document.createElement('div');
        cell.className = 'date-calendar-weekday';
        cell.setAttribute('role', 'columnheader');
        weekdayRow.appendChild(cell);
        return cell;
    });
    grid.appendChild(weekdayRow);

    const cells = [];
    for (let week = 0; week < 6; week++) {
        const row = document.createElement('div');
        row.className = 'date-calendar-row';
        row.setAttribute('role', 'row');
        for (let day = 0; day < 7; day++) {
            const cell = document.createElement('div');
            cell.className = 'date-calendar-day';
            cell.setAttribute('role', 'gridcell');
            row.appendChild(cell);
            cells.push(cell);
        }
        grid.appendChild(row);
    }

    element.append(head, grid);

    let view = { year: 0, month: 0 };
    let active = '';
    let selected = '';
    let min = '';
    let max = '';
    let anchor = null;

    const focusOwner = () => owner || grid;
    const isOpen = () => element.matches(':popover-open');
    const isAllowed = (ymd) => (!min || ymd >= min) && (!max || ymd <= max);

    const render = () => {
        const { locale } = getPrefs();
        title.textContent = formatMonthTitle(view.year, view.month, locale);
        const short = weekdayNames(locale, 'narrow');
        const long = weekdayNames(locale, 'long');
        weekdayCells.forEach((cell, i) => {
            cell.textContent = short[i];
            cell.setAttribute('aria-label', long[i]);
        });

        const today = toYmd(new Date());
        const spoken = new Intl.DateTimeFormat(intlLocale(locale), {
            year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
        });
        buildMonthDays(view.year, view.month).forEach((ymd, i) => {
            const cell = cells[i];
            const date = fromYmd(ymd);
            const allowed = isAllowed(ymd);
            cell.id = `${calendarId}-${ymd}`;
            cell.dataset.date = ymd;
            cell.textContent = String(date.getDate());
            cell.setAttribute('aria-label', spoken.format(date));
            cell.setAttribute('aria-selected', String(ymd === selected));
            cell.classList.toggle('is-outside', date.getMonth() !== view.month);
            cell.classList.toggle('is-today', ymd === today);
            cell.classList.toggle('is-selected', ymd === selected);
            cell.classList.toggle('is-active', ymd === active);
            cell.classList.toggle('is-disabled', !allowed);
            if (allowed) {
                cell.removeAttribute('aria-disabled');
            } else {
                cell.setAttribute('aria-disabled', 'true');
            }
        });
        if (isOpen() && active) {
            focusOwner().setAttribute('aria-activedescendant', `${calendarId}-${active}`);
        }
    };

    /**
     * Highlight a day, turning to its month.
     * @param {string} ymd
     */
    const setActive = (ymd) => {
        const date = fromYmd(ymd);
        if (!date) return;
        active = ymd;
        view = { year: date.getFullYear(), month: date.getMonth() };
        render();
    };

    const pick = (ymd) => {
        if (fromYmd(ymd) && isAllowed(ymd)) onPick(ymd);
    };

    const place = () => {
        const rect = anchor.getBoundingClientRect();
        const width = element.offsetWidth;
        const height = element.offsetHeight;
        const below = window.innerHeight - rect.bottom - VIEWPORT_MARGIN;
        const above = rect.top - VIEWPORT_MARGIN;
        const downward = below >= height + 4 || below >= above;
        let left = align === 'center' ? rect.left + (rect.width - width) / 2 : rect.left;
        left = Math.max(VIEWPORT_MARGIN, Math.min(left, window.innerWidth - VIEWPORT_MARGIN - width));
        const top = downward ? rect.bottom + 4 : rect.top - 4 - height;
        element.style.left = `${Math.round(left)}px`;
        element.style.top = `${Math.round(Math.max(VIEWPORT_MARGIN, top))}px`;
    };

    const close = (reason = 'code') => {
        if (!isOpen()) return;
        element.hidePopover();
        focusOwner().removeAttribute('aria-activedescendant');
        window.removeEventListener('resize', onResize);
        document.removeEventListener('scroll', onScroll, true);
        document.removeEventListener('pointerdown', onOutsidePointer, true);
        onClose(reason);
    };

    const onResize = () => close('dismiss');
    const onScroll = (event) => {
        if (!element.contains(event.target)) close('dismiss');
    };
    const onOutsidePointer = (event) => {
        if (!element.contains(event.target) && !anchor?.contains(event.target)) close('outside');
    };

    /**
     * Open under an element.
     * @param {Object} options
     * @param {HTMLElement} options.anchor
     * @param {string} [options.value] - The chosen day, "YYYY-MM-DD"
     * @param {string} [options.min] - Earliest day that can be picked
     * @param {string} [options.max] - Latest day that can be picked
     */
    const open = ({ anchor: target, value = '', min: earliest = '', max: latest = '' }) => {
        if (isOpen() || !target?.isConnected) return;
        anchor = target;
        selected = fromYmd(value) ? value : '';
        min = fromYmd(earliest) ? earliest : '';
        max = fromYmd(latest) ? latest : '';

        let start = selected || toYmd(new Date());
        if (!selected && min && start < min) start = min;
        if (!selected && max && start > max) start = max;

        if (element.previousElementSibling !== anchor) {
            anchor.after(element);
        }
        element.showPopover();
        setActive(start);
        place();
        window.addEventListener('resize', onResize);
        document.addEventListener('scroll', onScroll, true);
        if (focusable) {
            document.addEventListener('pointerdown', onOutsidePointer, true);
            grid.focus();
        }
    };

    /**
     * Act on a key. Returns whether it was the calendar's, so the caller can
     * stop it.
     * @param {KeyboardEvent} event
     * @returns {boolean}
     */
    const handleKey = (event) => {
        if (!isOpen() || !active) return false;
        const weekday = fromYmd(active).getDay();
        let next;
        switch (event.key) {
            case 'ArrowLeft': next = addDays(active, -1); break;
            case 'ArrowRight': next = addDays(active, 1); break;
            case 'ArrowUp': next = addDays(active, -7); break;
            case 'ArrowDown': next = addDays(active, 7); break;
            case 'PageUp': next = addMonths(active, event.shiftKey ? -12 : -1); break;
            case 'PageDown': next = addMonths(active, event.shiftKey ? 12 : 1); break;
            // In a text field these keys move the caret
            case 'Home':
                if (!focusable) return false;
                next = addDays(active, -weekday);
                break;
            case 'End':
                if (!focusable) return false;
                next = addDays(active, 6 - weekday);
                break;
            case ' ':
                if (!focusable) return false;
                pick(active);
                return true;
            case 'Enter':
                pick(active);
                return true;
            case 'Escape':
                close('escape');
                return true;
            default:
                return false;
        }
        setActive(next);
        return true;
    };

    // Keep the focus where it is (the field, or the grid)
    element.addEventListener('pointerdown', (event) => event.preventDefault());
    element.addEventListener('click', (event) => {
        const nav = event.target.closest('.date-calendar-nav');
        if (nav) {
            setActive(addMonths(active, Number(nav.dataset.step)));
            return;
        }
        const cell = event.target.closest('.date-calendar-day');
        if (cell) pick(cell.dataset.date);
    });

    if (focusable) {
        grid.addEventListener('keydown', (event) => {
            if (handleKey(event)) {
                event.preventDefault();
                event.stopPropagation();
            }
        });
        // Tabbing out of the calendar closes it
        element.addEventListener('focusout', (event) => {
            const next = event.relatedTarget;
            if (next && !element.contains(next) && !anchor?.contains(next)) close('blur');
        });
    }

    return { element, grid, open, close, isOpen, handleKey, setActive };
}

let fieldCount = 0;

/**
 * Create a date field.
 * @param {Object} [options]
 * @param {string} [options.id]
 * @param {string} [options.className] - Classes for the look of the page
 * @param {Function} [options.getPrefs] - Returns {locale}
 * @returns {HTMLInputElement}
 */
export function createDateField({ id, className = '', getPrefs = getDisplayPrefs } = {}) {
    const native = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
    const input = document.createElement('input');
    input.type = 'text';
    if (id) input.id = id;
    input.className = `date-field ${className}`.trim();
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-autocomplete', 'none');
    input.setAttribute('aria-haspopup', 'grid');
    input.setAttribute('aria-expanded', 'false');

    let committed = '';
    let notified = '';
    let shown = '';
    let dispatching = false;
    let justFocused = false;

    const readText = () => native.get.call(input);
    const writeText = (text) => native.set.call(input, text);
    const show = () => {
        shown = committed ? formatDateText(committed, getPrefs()) : '';
        writeText(shown);
    };
    // The field's own text stands for the day it was written for, even when
    // it leaves out the year
    const parse = (text) => (text === shown ? committed : parseDateText(text));

    // Typed text that is not a date leaves the last date in place
    const commit = () => {
        const text = readText();
        const parsed = parse(text);
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
            return parse(readText()) || '';
        },
        set(value) {
            const ymd = String(value ?? '');
            committed = fromYmd(ymd) ? ymd : '';
            notified = committed;
            show();
        }
    });

    const calendar = createDateCalendar({
        id: `${id || `date-field-${++fieldCount}`}-calendar`,
        getPrefs,
        owner: input,
        onPick: (ymd) => {
            committed = ymd;
            show();
            notify();
            calendar.close();
            input.select();
        },
        onClose: () => input.setAttribute('aria-expanded', 'false')
    });
    input.setAttribute('aria-controls', calendar.grid.id);

    const open = () => {
        if (calendar.isOpen() || input.disabled || input.readOnly || !input.isConnected) return;
        calendar.open({ anchor: input, value: parse(readText()) || committed, min: input.min, max: input.max });
        input.setAttribute('aria-expanded', 'true');
    };

    // The browser's own change (on blur or Enter): tidy the text and pass it
    // on only if the date really changed. Events sent from code go through.
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
        if (calendar.isOpen()) {
            if (event.key === 'Tab') {
                calendar.close();
                return;
            }
            // Escape closes the calendar, not the dialog
            if (calendar.handleKey(event)) {
                event.preventDefault();
                event.stopPropagation();
            }
            return;
        }
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            open();
        } else if (event.key === 'Enter') {
            notify();
        }
    });

    input.addEventListener('input', () => {
        if (dispatching || !calendar.isOpen()) return;
        const parsed = parseDateText(readText());
        if (parsed) calendar.setActive(parsed);
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
        if (calendar.isOpen()) {
            calendar.close();
        } else {
            open();
        }
    });

    input.addEventListener('blur', () => {
        justFocused = false;
        calendar.close();
    });

    return input;
}
