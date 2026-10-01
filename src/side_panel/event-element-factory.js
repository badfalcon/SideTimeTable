/**
 * SideTimeTable - Event Element Factory
 *
 * Shared DOM construction helpers used by both GoogleEventManager and
 * LocalEventManager.  Extracts the common patterns so each manager only
 * has to deal with its own type-specific content.
 */

import { TIME_CONSTANTS } from '../lib/constants.js';
import { getCurrentTime } from '../lib/demo-data.js';
import { formatStartTime, formatTimeRange, isSameDay } from '../lib/time-utils.js';

// ── constants ────────────────────────────────────────────────────────

/**
 * Offset in pixels for the 30-min top extension zone (-0:30 to 0:00)
 */
export const TIMELINE_OFFSET = 30;

/**
 * Constants for event styling and layout
 */
export const EVENT_STYLING = {
    DURATION_THRESHOLDS: {
        MICRO: 15,     // 15 minutes or less → no vertical padding
        COMPACT: 30    // 30 minutes or less → reduced vertical padding
    },
    HEIGHT: {
        MIN_HEIGHT: 15,      // Minimum clickable height in pixels
        LINE: 15,            // One line of block text (title or meta)
        PADDING_Y: 6         // Top + bottom padding of a regular block
    },
    CSS_CLASSES: {
        MICRO: 'event-micro',       // Duration-based: controls vertical padding only
        COMPACT: 'event-compact'    // Duration-based: controls vertical padding only
    },
    DEFAULT_VALUES: {
        ZERO_DURATION_MINUTES: 15,    // Default duration for zero-duration events
        INITIAL_LEFT_OFFSET: 40       // Default left position (30px time labels + 5px margin)
    }
};

// ── helpers ──────────────────────────────────────────────────────────

/**
 * Add a click listener that fires only when the mouse hasn't moved
 * significantly (i.e. not a drag).
 */
export function onClickOnly(el, handler, threshold = 5) {
    let sx, sy;
    el.addEventListener('mousedown', (e) => { sx = e.clientX; sy = e.clientY; });
    el.addEventListener('click', (e) => {
        if ((e.clientX - sx) ** 2 + (e.clientY - sy) ** 2 <= threshold ** 2) handler(e);
    });
}

/**
 * Apply duration-based styling to event element.
 * - height: set to raw duration px (box-sizing:border-box keeps rendered size = duration)
 * - class: event-micro / event-compact added for vertical padding control only
 *   (horizontal padding / font-size are managed separately by EventLayoutManager
 *    via compact / micro classes based on lane density)
 * @param {HTMLElement} eventDiv - The event element
 * @param {number} duration - Duration in minutes
 * @param {string} baseClasses - Base CSS classes (e.g., 'event google-event')
 */
export function applyDurationBasedStyling(eventDiv, duration, baseClasses) {
    eventDiv.style.height = `${Math.max(duration, EVENT_STYLING.HEIGHT.MIN_HEIGHT)}px`;

    let sizeClass = '';
    if (duration <= EVENT_STYLING.DURATION_THRESHOLDS.MICRO) {
        sizeClass = EVENT_STYLING.CSS_CLASSES.MICRO;
    } else if (duration <= EVENT_STYLING.DURATION_THRESHOLDS.COMPACT) {
        sizeClass = EVENT_STYLING.CSS_CLASSES.COMPACT;
    }

    eventDiv.className = `${baseClasses} ${sizeClass}`.trim();

    // How many lines of text fit: title, then time, then place. A block of
    // one line shows the title and start time side by side instead.
    const lines = Math.max(1, Math.floor(
        (Math.max(duration, EVENT_STYLING.HEIGHT.MIN_HEIGHT) - EVENT_STYLING.HEIGHT.PADDING_Y) / EVENT_STYLING.HEIGHT.LINE
    ));
    eventDiv.style.setProperty('--event-lines', String(lines));
    eventDiv.classList.toggle('event-one-line', lines < 2);
}

/**
 * Resolve the user's locale and time-format preference.
 * Both managers perform the identical async resolution, so it lives here.
 *
 * @returns {Promise<[string, string]>} [locale, timeFormat]
 */
export async function resolveLocaleSettings() {
    const [locale, timeFormat] = await Promise.all([
        typeof window.getCurrentLocale === 'function'
            ? window.getCurrentLocale()
            : Promise.resolve('en'),
        typeof window.getTimeFormatPreference === 'function'
            ? window.getTimeFormatPreference()
            : Promise.resolve('24h')
    ]);
    return [locale, timeFormat];
}

// ── factory ──────────────────────────────────────────────────────────

/**
 * EventElementFactory — creates the positioned <div> shared by both
 * Google and local event elements.
 */
export class EventElementFactory {
    /**
     * Create a positioned event element with basic styling applied.
     *
     * @param {Object} options
     * @param {Date}   options.startDate   - Event start Date
     * @param {Date}   options.endDate     - Event end Date
     * @param {string} options.cssClass    - Base CSS class string (e.g. 'event google-event')
     * @param {string} options.tooltip     - Value for the element's title attribute
     * @param {number} options.initialWidth - Initial width in pixels (from eventLayoutManager.maxWidth)
     * @param {Date} [options.displayDate] - The day the timeline shows (defaults to the start's day)
     * @returns {{ eventDiv: HTMLElement, duration: number }}
     */
    static createEventElement({ startDate, endDate, cssClass, tooltip, initialWidth, displayDate }) {
        const eventDiv = document.createElement('div');
        eventDiv.className = cssClass;
        eventDiv.title = tooltip || '';

        // Calculate position in the 24-hour coordinate system
        const startOffset =
            (startDate.getHours() * 60 + startDate.getMinutes()) + TIMELINE_OFFSET;
        const duration =
            (endDate.getTime() - startDate.getTime()) / TIME_CONSTANTS.MINUTE_MILLIS;

        // Apply duration-based styling (height + size classes)
        applyDurationBasedStyling(eventDiv, duration, cssClass);

        // Ended events on today's timeline are drawn faded; the timeline
        // re-checks every minute (see markPastEvents)
        eventDiv.dataset.endMs = String(endDate.getTime());
        const now = getCurrentTime();
        if (isSameDay(displayDate || startDate, now) && endDate.getTime() <= now.getTime()) {
            eventDiv.classList.add('is-past');
        }

        // Position
        eventDiv.style.top = `${startOffset}px`;
        eventDiv.style.left = `${EVENT_STYLING.DEFAULT_VALUES.INITIAL_LEFT_OFFSET}px`;

        if (initialWidth != null) {
            eventDiv.style.width = `${initialWidth}px`;
        }

        return { eventDiv, duration };
    }

    /**
     * Build the text of an event block, shared by both event types. One
     * clamped box holds the title, the time and the place in that order, so
     * the title wraps (by phrase in Japanese) when there is room and the rest
     * is cut at whatever line the block ends on:
     *   <div class="event-body">
     *     <span class="event-title">[icon]{title}</span>
     *     <span class="event-meta event-time-range">9:00–10:00</span>
     *     <span class="event-meta event-time-start">9:00</span>   (narrow lanes)
     *     <span class="event-meta event-location">{location}</span>
     *     <span class="event-meta event-time-place">9:00–10:00 · {location}</span>   (wide lanes)
     *   </div>
     *
     * @param {Object} parts
     * @param {string} parts.title
     * @param {string} parts.start - "HH:MM"
     * @param {string} parts.end - "HH:MM"
     * @param {string} [parts.location]
     * @param {string} [parts.iconClass] - Icon before the title (recurring, absence)
     * @param {string} parts.timeFormat - '12h' or '24h'
     * @param {string} parts.locale - 'ja' or 'en'
     * @returns {HTMLElement}
     */
    static createEventBody({ title, start, end, location, iconClass, timeFormat, locale }) {
        const body = document.createElement('div');
        body.className = 'event-body';

        const titleSpan = document.createElement('span');
        titleSpan.className = 'event-title';
        if (iconClass) {
            const icon = document.createElement('i');
            icon.className = `${iconClass} event-title-icon`;
            icon.setAttribute('aria-hidden', 'true');
            titleSpan.appendChild(icon);
        }
        titleSpan.appendChild(document.createTextNode(title));
        body.appendChild(titleSpan);

        const meta = (className, text) => {
            const span = document.createElement('span');
            span.className = `event-meta ${className}`;
            span.textContent = text;
            body.appendChild(span);
        };
        const range = formatTimeRange(start, end, timeFormat, locale);
        meta('event-time-range', range);
        meta('event-time-start', formatStartTime(start, timeFormat));
        if (location) {
            meta('event-location', location);
            meta('event-time-place', `${range} · ${location}`);
        }

        return body;
    }

    /**
     * Tooltip for a block: the time and title, and the place when there is
     * one — the parts the block itself may have had to cut.
     * @param {Object} parts
     * @returns {string}
     */
    static buildTooltip({ title, start, end, location, timeFormat, locale }) {
        const lines = [`${formatTimeRange(start, end, timeFormat, locale)} ${title}`];
        if (location) lines.push(location);
        return lines.join('\n');
    }
}
