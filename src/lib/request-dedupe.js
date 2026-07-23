/**
 * RequestDedupe - Idempotent execution of calendar write operations
 *
 * The side panel sends a stable `requestId` with each logical write
 * (create/update/delete). If the user retries after a failure whose write
 * actually committed (e.g. the service worker died between the API call and
 * the response), re-running the operation would duplicate it. This module
 * makes retries safe:
 *
 * - Concurrent calls with the same requestId share one in-flight promise
 *   (in-memory map).
 * - Successful responses are recorded in `chrome.storage.session`, which
 *   survives service worker restarts within the browser session, so a retry
 *   replays the recorded response instead of re-running the operation.
 * - Failures are never recorded — a retry after a real failure runs again.
 *
 * Known gap: the write can still duplicate if the service worker dies in the
 * narrow window between the API commit and the ledger write.
 */

const LEDGER_KEY = 'mutationRequestLedger';
const MAX_LEDGER_ENTRIES = 20;

// requestId -> in-flight promise (per service worker lifetime)
const inFlight = new Map();

/**
 * Run `operation` at most once per `requestId`.
 * @param {string|undefined} requestId - Stable id of the logical request;
 *   falsy disables deduplication
 * @param {() => Promise<*>} operation - The write operation to run
 * @returns {Promise<*>} The operation's (possibly replayed) resolved value
 */
export async function runDeduped(requestId, operation) {
    const sessionArea = globalThis.chrome?.storage?.session;
    if (!requestId || !sessionArea) {
        return operation();
    }

    if (inFlight.has(requestId)) {
        return inFlight.get(requestId);
    }

    const run = (async () => {
        const stored = await sessionArea.get(LEDGER_KEY);
        const ledger = stored?.[LEDGER_KEY] || [];
        const recorded = ledger.find(entry => entry.id === requestId);
        if (recorded) {
            return recorded.response;
        }

        const response = await operation();

        const nextLedger = [
            ...ledger.filter(entry => entry.id !== requestId),
            { id: requestId, response }
        ].slice(-MAX_LEDGER_ENTRIES);
        await sessionArea.set({ [LEDGER_KEY]: nextLedger });

        return response;
    })();

    inFlight.set(requestId, run);
    try {
        return await run;
    } finally {
        inFlight.delete(requestId);
    }
}

/**
 * Test hook: clear the in-flight map (simulates a service worker restart).
 * @private
 */
export function _clearInFlightForTests() {
    inFlight.clear();
}
