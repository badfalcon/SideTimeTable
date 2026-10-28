/**
 * EventFocusService - Brings a single event into view on the timeline.
 *
 * Used when the user clicks a reminder notification: the side panel scrolls the
 * matching event block into the middle of the timeline and flashes a highlight
 * so it is obvious which event the notification was about.
 *
 * Event blocks are matched by their `data-event-id` attribute, set by the
 * Google and local event renderers.
 */

/** CSS class applied to the event block while it is highlighted */
export const FOCUS_HIGHLIGHT_CLASS = 'event-focused';

export class EventFocusService {
    /**
     * @param {Object} [options]
     * @param {number} [options.timeout] How long to keep looking for the event
     *        element (ms). Events render asynchronously, so the element may not
     *        exist yet when the request arrives.
     * @param {number} [options.pollInterval] Delay between lookup attempts (ms)
     * @param {number} [options.highlightDuration] How long the highlight stays (ms)
     */
    constructor(options = {}) {
        this._timeout = options.timeout ?? 3000;
        this._pollInterval = options.pollInterval ?? 100;
        this._highlightDuration = options.highlightDuration ?? 4000;

        this._highlightTimer = null;
        this._highlightedElement = null;
    }

    /**
     * Scroll to and highlight the event with the given ID.
     *
     * @param {string} eventId The event ID (`data-event-id` on the element)
     * @param {Object} [deps]
     * @param {Document|HTMLElement} [deps.root] Where to search for the element
     * @param {Object} [deps.timelineComponent] Provides scrollElementIntoView()
     * @returns {Promise<boolean>} whether the event was found and focused
     */
    async focusEvent(eventId, deps = {}) {
        if (!eventId) {
            return false;
        }

        const root = deps.root || (typeof document !== 'undefined' ? document : null);
        if (!root) {
            return false;
        }

        const element = await this._waitForElement(eventId, root);
        if (!element) {
            return false;
        }

        if (deps.timelineComponent && typeof deps.timelineComponent.scrollElementIntoView === 'function') {
            deps.timelineComponent.scrollElementIntoView(element);
        } else if (typeof element.scrollIntoView === 'function') {
            element.scrollIntoView({ block: 'center' });
        }

        this.highlight(element);
        return true;
    }

    /**
     * Apply the temporary highlight to an element.
     * Only one element is highlighted at a time.
     * @param {HTMLElement} element
     */
    highlight(element) {
        this.clearHighlight();

        element.classList.add(FOCUS_HIGHLIGHT_CLASS);
        this._highlightedElement = element;

        this._highlightTimer = setTimeout(() => {
            this._highlightTimer = null;
            this.clearHighlight();
        }, this._highlightDuration);
    }

    /**
     * Remove the current highlight, if any.
     */
    clearHighlight() {
        if (this._highlightTimer) {
            clearTimeout(this._highlightTimer);
            this._highlightTimer = null;
        }
        if (this._highlightedElement) {
            this._highlightedElement.classList.remove(FOCUS_HIGHLIGHT_CLASS);
            this._highlightedElement = null;
        }
    }

    /**
     * Look for the event element, retrying until the timeout expires.
     * @returns {Promise<HTMLElement|null>}
     * @private
     */
    async _waitForElement(eventId, root) {
        const deadline = Date.now() + this._timeout;

        for (;;) {
            const element = this._findElement(eventId, root);
            if (element) {
                return element;
            }
            if (Date.now() >= deadline) {
                return null;
            }
            await new Promise(resolve => setTimeout(resolve, this._pollInterval));
        }
    }

    /**
     * Find the element for an event ID.
     *
     * Compares dataset values rather than using an attribute selector: event
     * IDs come from Google Calendar and are not guaranteed to be safe to embed
     * in a CSS selector.
     * @returns {HTMLElement|null}
     * @private
     */
    _findElement(eventId, root) {
        const candidates = root.querySelectorAll('[data-event-id]');
        for (const candidate of candidates) {
            if (candidate.dataset.eventId === eventId) {
                return candidate;
            }
        }
        return null;
    }

    /**
     * Clean up resources.
     */
    destroy() {
        this.clearHighlight();
    }
}
