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

// chrome.storage has no atomic read-modify-write: two overlapping requests
// would both read the same ledger and the later set() would drop the earlier
// entry, so a retry of the dropped one re-runs and duplicates the event.
let ledgerWrites = Promise.resolve();

/**
 * Append an entry to the session ledger, serialized against other appends.
 * @private
 */
function recordInLedger(sessionArea, requestId, response) {
    const next = ledgerWrites.then(async () => {
        const stored = await sessionArea.get(LEDGER_KEY);
        const ledger = stored?.[LEDGER_KEY] || [];
        const nextLedger = [
            ...ledger.filter(entry => entry.id !== requestId),
            { id: requestId, response }
        ].slice(-MAX_LEDGER_ENTRIES);
        await sessionArea.set({ [LEDGER_KEY]: nextLedger });
    });
    ledgerWrites = next.catch(() => {});
    return next;
}

/**
 * Build a request id that is stable across retries of the same payload but
 * changes when the payload does, so a retry of an unchanged submission is
 * deduplicated while a corrected one actually runs.
 *
 * @param {string} prefix - Operation name, e.g. 'create-evt'
 * @param {string} seed - Per-submission seed (kept across retries, reset when
 *   the modal is closed) so two deliberate identical writes stay distinct
 * @param {*} payload - Anything JSON-serializable that defines the write
 * @returns {string} The request id
 */
export function buildRequestId(prefix, seed, payload) {
    // djb2, enough to separate edits of one form; not a security hash
    const json = JSON.stringify(payload);
    let hash = 5381;
    for (let i = 0; i < json.length; i++) {
        hash = ((hash << 5) + hash + json.charCodeAt(i)) | 0;
    }
    return `${prefix}-${seed}-${(hash >>> 0).toString(36)}`;
}

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
        await recordInLedger(sessionArea, requestId, response);

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
