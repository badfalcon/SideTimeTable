/**
 * SPEC: Pending event focus handover (src/lib/event-focus.js)
 *
 * - savePendingEventFocus stores eventId/dateStr/type plus a timestamp
 * - incomplete requests are rejected
 * - consumePendingEventFocus returns the request and clears it (once only)
 * - requests older than the max age are dropped
 */
import {
    savePendingEventFocus,
    consumePendingEventFocus,
    PENDING_FOCUS_MAX_AGE_MS
} from '../../src/lib/event-focus.js';
import { STORAGE_KEYS } from '../../src/lib/constants.js';

const KEY = STORAGE_KEYS.PENDING_EVENT_FOCUS;

describe('savePendingEventFocus', () => {
    beforeEach(() => {
        resetChromeStorage();
    });

    test('stores the request with a timestamp', async () => {
        const before = Date.now();
        const stored = await savePendingEventFocus({
            eventId: 'evt-1', dateStr: '2025-03-15', type: 'local'
        });

        expect(stored).toBe(true);
        const { [KEY]: focus } = await chrome.storage.local.get(KEY);
        expect(focus.eventId).toBe('evt-1');
        expect(focus.dateStr).toBe('2025-03-15');
        expect(focus.type).toBe('local');
        expect(focus.requestedAt).toBeGreaterThanOrEqual(before);
    });

    test('rejects a request without an event ID', async () => {
        expect(await savePendingEventFocus({ dateStr: '2025-03-15' })).toBe(false);
        const { [KEY]: focus } = await chrome.storage.local.get(KEY);
        expect(focus).toBeUndefined();
    });

    test('rejects a request without a date', async () => {
        expect(await savePendingEventFocus({ eventId: 'evt-1' })).toBe(false);
    });

    test('rejects a null request', async () => {
        expect(await savePendingEventFocus(null)).toBe(false);
    });
});

describe('consumePendingEventFocus', () => {
    beforeEach(() => {
        resetChromeStorage();
    });

    test('returns null when nothing is pending', async () => {
        expect(await consumePendingEventFocus()).toBeNull();
    });

    test('returns the pending request', async () => {
        await savePendingEventFocus({ eventId: 'g1', dateStr: '2025-03-15', type: 'google' });

        expect(await consumePendingEventFocus()).toEqual({
            eventId: 'g1', dateStr: '2025-03-15', type: 'google'
        });
    });

    test('a request is delivered only once', async () => {
        await savePendingEventFocus({ eventId: 'g1', dateStr: '2025-03-15' });

        expect(await consumePendingEventFocus()).not.toBeNull();
        expect(await consumePendingEventFocus()).toBeNull();
    });

    test('drops (and clears) a stale request', async () => {
        await chrome.storage.local.set({
            [KEY]: {
                eventId: 'old',
                dateStr: '2025-03-15',
                requestedAt: Date.now() - PENDING_FOCUS_MAX_AGE_MS - 1000
            }
        });

        expect(await consumePendingEventFocus()).toBeNull();
        const { [KEY]: focus } = await chrome.storage.local.get(KEY);
        expect(focus).toBeUndefined();
    });

    test('accepts a request that is just inside the max age', async () => {
        await chrome.storage.local.set({
            [KEY]: {
                eventId: 'fresh',
                dateStr: '2025-03-15',
                requestedAt: Date.now() - (PENDING_FOCUS_MAX_AGE_MS - 5000)
            }
        });

        const focus = await consumePendingEventFocus();
        expect(focus.eventId).toBe('fresh');
    });

    test('drops a malformed request', async () => {
        await chrome.storage.local.set({ [KEY]: { dateStr: '2025-03-15', requestedAt: Date.now() } });

        expect(await consumePendingEventFocus()).toBeNull();
    });
});
