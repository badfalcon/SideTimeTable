/**
 * SideTimeTable - Event Element Factory
 *
 * Shared DOM construction helpers used by both GoogleEventManager and
 * LocalEventManager.  Extracts the common patterns so each manager only
 * has to deal with its own type-specific content.
 */

import { TIME_CONSTANTS } from '../lib/constants.js';

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
        COMPACT: 30,   // 30 minutes or less → reduced vertical padding
        DETAILED: 45   // 45 minutes or more → show location/description details
    },
    HEIGHT: {
        MIN_HEIGHT: 15,      // Minimum clickable height in pixels
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

    // Add detailed class for longer events (shows location/description)
    if (duration >= EVENT_STYLING.DURATION_THRESHOLDS.DETAILED) {
        eventDiv.classList.add('event-detailed');
    }
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
     * @returns {{ eventDiv: HTMLElement, duration: number }}
     */
    static createEventElement({ startDate, endDate, cssClass, tooltip, initialWidth }) {
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

        // Position
        eventDiv.style.top = `${startOffset}px`;
        eventDiv.style.left = `${EVENT_STYLING.DEFAULT_VALUES.INITIAL_LEFT_OFFSET}px`;

        if (initialWidth != null) {
            eventDiv.style.width = `${initialWidth}px`;
        }

        return { eventDiv, duration };
    }

    /**
     * Build the primary line DOM fragment shared by both event types:
     *   <div class="event-primary-line">
     *     <span class="event-time">{formattedTime} - </span>
     *     <span class="event-title">{title}</span>
     *   </div>
     *
     * @param {string} formattedTime - Already locale-formatted time string
     * @param {string} title         - Event title text
     * @returns {HTMLElement}
     */
    static createPrimaryLine(formattedTime, title) {
        const primaryLine = document.createElement('div');
        primaryLine.className = 'event-primary-line';

        const timeSpan = document.createElement('span');
        timeSpan.className = 'event-time';
        timeSpan.textContent = `${formattedTime} - `;
        primaryLine.appendChild(timeSpan);

        const titleSpan = document.createElement('span');
        titleSpan.className = 'event-title';
        titleSpan.textContent = title;
        primaryLine.appendChild(titleSpan);

        return primaryLine;
    }
}
