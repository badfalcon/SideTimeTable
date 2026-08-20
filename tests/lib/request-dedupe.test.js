/**
 * Tests for runDeduped — idempotent execution of calendar write operations
 *
 * A retried request (same requestId) must not run the operation again:
 * while the first call is in flight it shares its promise; after success
 * the recorded response is replayed from the session-storage ledger, which
 * survives service worker restarts within the browser session.
 */
import { runDeduped, buildRequestId, _clearInFlightForTests } from '../../src/lib/request-dedupe.js';

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

  test('a ledger write failure still returns the committed response', async () => {
    // The API write already happened: reporting a failure here would make the
    // user retry and create a duplicate
    global.chrome.storage.session.set.mockRejectedValueOnce(new Error('quota'));
    const op = jest.fn().mockResolvedValue({ id: 'evt-1' });
    await expect(runDeduped('req-1', op)).resolves.toEqual({ id: 'evt-1' });
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

describe('ledger writes under concurrency', () => {
  // Like installSessionStore, but reads and writes complete a macrotask later,
  // as real chrome.storage calls do — so two unserialized read-modify-writes
  // really do interleave (read, read, write, write) and the first entry is lost
  function installSlowSessionStore() {
    const store = {};
    const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
    global.chrome.storage.session = {
      get: jest.fn(async (key) => {
        await tick();
        return typeof key === 'string' && key in store ? { [key]: store[key] } : {};
      }),
      set: jest.fn(async (items) => {
        await tick();
        Object.assign(store, items);
      }),
    };
  }

  beforeEach(() => {
    installSlowSessionStore();
    _clearInFlightForTests();
  });

  afterEach(() => {
    delete global.chrome.storage.session;
  });

  test('two overlapping requests both stay in the ledger', async () => {
    // Both operations finish in the same tick, so both ledger writes start
    // together — the exact interleaving that loses an entry when the
    // read-modify-write is not serialized
    let release;
    const barrier = new Promise((resolve) => { release = resolve; });
    const pending = [
      runDeduped('req-a', () => barrier.then(() => ({ id: 'a' }))),
      runDeduped('req-b', () => barrier.then(() => ({ id: 'b' }))),
    ];
    await new Promise((resolve) => setTimeout(resolve, 5)); // both lookups done
    release();
    await Promise.all(pending);

    const retryA = jest.fn();
    const retryB = jest.fn();
    await expect(runDeduped('req-a', retryA)).resolves.toEqual({ id: 'a' });
    await expect(runDeduped('req-b', retryB)).resolves.toEqual({ id: 'b' });
    expect(retryA).not.toHaveBeenCalled();
    expect(retryB).not.toHaveBeenCalled();
  });
});

describe('buildRequestId', () => {
  test('the same payload with the same seed gives the same id (a retry dedupes)', () => {
    const payload = { summary: 'Standup', start: '09:00' };
    expect(buildRequestId('create-evt', 'seed-1', payload))
      .toBe(buildRequestId('create-evt', 'seed-1', { summary: 'Standup', start: '09:00' }));
  });

  test('a corrected payload gives a different id, so the correction really runs', () => {
    const first = buildRequestId('create-evt', 'seed-1', { summary: 'Standp' });
    const corrected = buildRequestId('create-evt', 'seed-1', { summary: 'Standup' });
    expect(corrected).not.toBe(first);
  });

  test('a new seed separates two deliberate identical writes', () => {
    const payload = { summary: 'Standup' };
    expect(buildRequestId('create-evt', 'seed-2', payload))
      .not.toBe(buildRequestId('create-evt', 'seed-1', payload));
  });
});
