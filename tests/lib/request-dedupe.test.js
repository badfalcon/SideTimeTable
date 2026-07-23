/**
 * Tests for runDeduped — idempotent execution of calendar write operations
 *
 * A retried request (same requestId) must not run the operation again:
 * while the first call is in flight it shares its promise; after success
 * the recorded response is replayed from the session-storage ledger, which
 * survives service worker restarts within the browser session.
 */
import { runDeduped, _clearInFlightForTests } from '../../src/lib/request-dedupe.js';

// Minimal chrome.storage.session mock (promise-based, like MV3)
function installSessionStore() {
  const store = {};
  global.chrome.storage.session = {
    get: jest.fn((key) => Promise.resolve(
      typeof key === 'string' && key in store ? { [key]: store[key] } : {}
    )),
    set: jest.fn((items) => {
      Object.assign(store, items);
      return Promise.resolve();
    }),
  };
  return store;
}

describe('runDeduped', () => {
  beforeEach(() => {
    installSessionStore();
    _clearInFlightForTests();
  });

  afterEach(() => {
    delete global.chrome.storage.session;
  });

  test('runs the operation and returns its result', async () => {
    const op = jest.fn().mockResolvedValue({ id: 'evt-1' });
    await expect(runDeduped('req-1', op)).resolves.toEqual({ id: 'evt-1' });
    expect(op).toHaveBeenCalledTimes(1);
  });

  test('a retry with the same requestId replays the recorded response without re-running', async () => {
    const op = jest.fn().mockResolvedValue({ id: 'evt-1' });
    await runDeduped('req-1', op);

    const retryOp = jest.fn().mockResolvedValue({ id: 'evt-DUPLICATE' });
    await expect(runDeduped('req-1', retryOp)).resolves.toEqual({ id: 'evt-1' });
    expect(retryOp).not.toHaveBeenCalled();
  });

  test('the ledger survives a simulated service worker restart (in-memory state cleared)', async () => {
    await runDeduped('req-1', jest.fn().mockResolvedValue({ id: 'evt-1' }));

    // SW restart: in-memory state is gone, session storage persists
    _clearInFlightForTests();

    const retryOp = jest.fn();
    await expect(runDeduped('req-1', retryOp)).resolves.toEqual({ id: 'evt-1' });
    expect(retryOp).not.toHaveBeenCalled();
  });

  test('different requestIds run independently', async () => {
    const op1 = jest.fn().mockResolvedValue({ id: 'a' });
    const op2 = jest.fn().mockResolvedValue({ id: 'b' });
    await expect(runDeduped('req-1', op1)).resolves.toEqual({ id: 'a' });
    await expect(runDeduped('req-2', op2)).resolves.toEqual({ id: 'b' });
    expect(op1).toHaveBeenCalledTimes(1);
    expect(op2).toHaveBeenCalledTimes(1);
  });

  test('concurrent calls with the same requestId share one in-flight operation', async () => {
    let resolveOp;
    const op = jest.fn(() => new Promise((resolve) => { resolveOp = resolve; }));

    const p1 = runDeduped('req-1', op);
    const p2 = runDeduped('req-1', op);
    // The operation starts after the async ledger read — let it settle first
    await new Promise((resolve) => setTimeout(resolve, 0));
    resolveOp({ id: 'evt-1' });

    await expect(p1).resolves.toEqual({ id: 'evt-1' });
    await expect(p2).resolves.toEqual({ id: 'evt-1' });
    expect(op).toHaveBeenCalledTimes(1);
  });

  test('a failed operation is not recorded — the retry runs again', async () => {
    const failing = jest.fn().mockRejectedValue(new Error('network down'));
    await expect(runDeduped('req-1', failing)).rejects.toThrow('network down');

    const retry = jest.fn().mockResolvedValue({ id: 'evt-1' });
    await expect(runDeduped('req-1', retry)).resolves.toEqual({ id: 'evt-1' });
    expect(retry).toHaveBeenCalledTimes(1);
  });

  test('the ledger is capped so it cannot grow without bound', async () => {
    for (let i = 0; i < 30; i++) {
      await runDeduped(`req-${i}`, jest.fn().mockResolvedValue({ id: `evt-${i}` }));
    }
    const setCalls = global.chrome.storage.session.set.mock.calls;
    const lastLedger = Object.values(setCalls[setCalls.length - 1][0])[0];
    expect(lastLedger.length).toBeLessThanOrEqual(20);
  });

  test('runs the operation directly when no requestId is given', async () => {
    const op = jest.fn().mockResolvedValue({ id: 'evt-1' });
    await expect(runDeduped(undefined, op)).resolves.toEqual({ id: 'evt-1' });
    expect(op).toHaveBeenCalledTimes(1);
  });

  test('degrades gracefully when chrome.storage.session is unavailable', async () => {
    delete global.chrome.storage.session;
    const op = jest.fn().mockResolvedValue({ id: 'evt-1' });
    await expect(runDeduped('req-1', op)).resolves.toEqual({ id: 'evt-1' });
    expect(op).toHaveBeenCalledTimes(1);
  });
});
