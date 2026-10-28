/**
 * SideTimeTable - Pending event focus handover
 *
 * When a reminder notification is clicked the service worker knows which event
 * the user wants to see, but the side panel that has to show it may not even be
 * running yet. The request is therefore parked in local storage and picked up
 * by the side panel as soon as it is ready.
 *
 * DOM-free on purpose: both the service worker and the side panel import this.
 */

import { STORAGE_KEYS } from './constants.js';

/**
 * How long a parked request stays valid. A request older than this is stale
 * (the panel was never opened, the browser was restarted, …) and is dropped so
 * an old reminder never hijacks an unrelated side panel launch.
 */
export const PENDING_FOCUS_MAX_AGE_MS = 5 * 60 * 1000;

/**
 * Park a "show me this event" request for the side panel.
 *
 * @param {{eventId: string, dateStr: string, type?: string}} focus
 * @returns {Promise<boolean>} whether the request was stored
 */
export async function savePendingEventFocus(focus) {
    if (!focus || !focus.eventId || !focus.dateStr) {
        return false;
    }

    try {
        await chrome.storage.local.set({
            [STORAGE_KEYS.PENDING_EVENT_FOCUS]: {
                eventId: focus.eventId,
                dateStr: focus.dateStr,
                type: focus.type || null,
                requestedAt: Date.now()
            }
        });
        return true;
    } catch (error) {
        console.error('Failed to store pending event focus:', error);
        return false;
    }
}

/**
 * Read and clear the parked request.
 *
 * Always clears, even when the request is stale, so a request is acted on at
 * most once.
 *
 * @param {number} maxAgeMs Maximum accepted age of the request
 * @returns {Promise<{eventId: string, dateStr: string, type: ?string}|null>}
 */
export async function consumePendingEventFocus(maxAgeMs = PENDING_FOCUS_MAX_AGE_MS) {
    try {
        const key = STORAGE_KEYS.PENDING_EVENT_FOCUS;
        const result = await chrome.storage.local.get(key);
        const focus = result[key];

        if (!focus) {
            return null;
        }

        await chrome.storage.local.remove(key);

        if (!focus.eventId || !focus.dateStr) {
            return null;
        }

        const age = Date.now() - (focus.requestedAt || 0);
        if (age > maxAgeMs) {
            return null;
        }

        return { eventId: focus.eventId, dateStr: focus.dateStr, type: focus.type || null };
    } catch (error) {
        console.error('Failed to read pending event focus:', error);
        return null;
    }
}
