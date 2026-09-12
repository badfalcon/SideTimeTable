/**
 * SPEC: EventFocusService (src/services/event-focus-service.js)
 *
 * - finds the event block by data-event-id and highlights it
 * - asks the timeline to scroll the block into view
 * - waits for events that are still rendering
 * - gives up (without throwing) when the event is not on the timeline
 * - removes the highlight after the configured duration
 */
import { EventFocusService, FOCUS_HIGHLIGHT_CLASS } from '../../src/services/event-focus-service.js';

// Minimal DOM mocks for the node test environment
function mockEventElement(eventId) {
    const classes = new Set();
    return {
        dataset: { eventId },
        classList: {
            add: (name) => classes.add(name),
            remove: (name) => classes.delete(name),
            contains: (name) => classes.has(name)
        },
        scrollIntoView: jest.fn()
    };
}

function mockRoot(elements = []) {
    return {
        elements,
        querySelectorAll: jest.fn(function () { return this.elements; })
    };
}

describe('EventFocusService.focusEvent', () => {
    // Focusing starts a highlight timer; dispose of it so it cannot outlive the test
    const services = [];
    function createService(options) {
        const service = new EventFocusService(options);
        services.push(service);
        return service;
    }

    afterEach(() => {
        while (services.length) services.pop().destroy();
    });

    test('highlights the matching event', async () => {
        const target = mockEventElement('evt-2');
        const root = mockRoot([mockEventElement('evt-1'), target]);
        const service = createService({ timeout: 0 });

        const focused = await service.focusEvent('evt-2', { root });

        expect(focused).toBe(true);
        expect(target.classList.contains(FOCUS_HIGHLIGHT_CLASS)).toBe(true);
    });

    test('scrolls the event into view via the timeline component', async () => {
        const target = mockEventElement('evt-1');
        const root = mockRoot([target]);
        const timelineComponent = { scrollElementIntoView: jest.fn() };
        const service = createService({ timeout: 0 });

        await service.focusEvent('evt-1', { root, timelineComponent });

        expect(timelineComponent.scrollElementIntoView).toHaveBeenCalledWith(target);
        expect(target.scrollIntoView).not.toHaveBeenCalled();
    });

    test('falls back to element.scrollIntoView without a timeline component', async () => {
        const target = mockEventElement('evt-1');
        const root = mockRoot([target]);
        const service = createService({ timeout: 0 });

        await service.focusEvent('evt-1', { root });

        expect(target.scrollIntoView).toHaveBeenCalled();
    });

    test('returns false when the event is not on the timeline', async () => {
        const root = mockRoot([mockEventElement('other')]);
        const service = createService({ timeout: 0 });

        expect(await service.focusEvent('missing', { root })).toBe(false);
    });

    test('returns false without an event ID', async () => {
        const root = mockRoot([]);
        const service = createService({ timeout: 0 });

        expect(await service.focusEvent('', { root })).toBe(false);
        expect(root.querySelectorAll).not.toHaveBeenCalled();
    });

    test('waits for an event that renders after the request', async () => {
        const root = mockRoot([]);
        const target = mockEventElement('late');
        const service = createService({ timeout: 2000, pollInterval: 10 });

        // The event appears only after the first lookup misses
        setTimeout(() => { root.elements = [target]; }, 30);

        expect(await service.focusEvent('late', { root })).toBe(true);
        expect(target.classList.contains(FOCUS_HIGHLIGHT_CLASS)).toBe(true);
    });

    test('gives up once the timeout has elapsed', async () => {
        const root = mockRoot([]);
        const service = createService({ timeout: 50, pollInterval: 10 });

        const start = Date.now();
        expect(await service.focusEvent('never', { root })).toBe(false);
        expect(Date.now() - start).toBeGreaterThanOrEqual(50);
    });
});

describe('EventFocusService highlight lifecycle', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test('removes the highlight after the configured duration', () => {
        const target = mockEventElement('evt-1');
        const service = new EventFocusService({ highlightDuration: 1000 });

        service.highlight(target);
        expect(target.classList.contains(FOCUS_HIGHLIGHT_CLASS)).toBe(true);

        jest.advanceTimersByTime(1000);
        expect(target.classList.contains(FOCUS_HIGHLIGHT_CLASS)).toBe(false);
    });

    test('highlighting a second event clears the first', () => {
        const first = mockEventElement('evt-1');
        const second = mockEventElement('evt-2');
        const service = new EventFocusService({ highlightDuration: 1000 });

        service.highlight(first);
        service.highlight(second);

        expect(first.classList.contains(FOCUS_HIGHLIGHT_CLASS)).toBe(false);
        expect(second.classList.contains(FOCUS_HIGHLIGHT_CLASS)).toBe(true);
    });

    test('destroy removes the highlight', () => {
        const target = mockEventElement('evt-1');
        const service = new EventFocusService({ highlightDuration: 1000 });

        service.highlight(target);
        service.destroy();

        expect(target.classList.contains(FOCUS_HIGHLIGHT_CLASS)).toBe(false);
    });
});
