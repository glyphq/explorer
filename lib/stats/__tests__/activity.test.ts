import { describe, expect, test } from "bun:test";

import {
  createRecentTickActivityRequestLimiter,
  createRecentTickWindow,
  MAX_RECENT_TICK_WINDOW_SIZE,
  mapRecentTickActivityState,
  normalizeTickActivity,
} from "../activity";

describe("recent archive tick activity", () => {
  test("keeps the bounded window at or below the requested archive tip", () => {
    expect(createRecentTickWindow(100)).toEqual(Array.from({ length: 100 }, (_, index) => index + 1));
    expect(createRecentTickWindow(2, 5)).toEqual([0, 1, 2]);
    expect(createRecentTickWindow(100, 100)).toHaveLength(MAX_RECENT_TICK_WINDOW_SIZE);
    expect(createRecentTickWindow(undefined)).toEqual([]);
    expect(createRecentTickWindow(-1)).toEqual([]);
  });

  test("normalizes only transaction counts reported by archive tick data", () => {
    expect(
      normalizeTickActivity(100, { transactionHashes: ["a", "b"] } as never),
    ).toEqual({ tick: 100, available: true, transactionCount: 2 });
    expect(
      normalizeTickActivity(101, { transactionHashes: [] } as never),
    ).toEqual({ tick: 101, available: true, transactionCount: 0 });
    expect(normalizeTickActivity(102, undefined)).toEqual({
      tick: 102,
      available: false,
      transactionCount: null,
    });
  });

  test("limits a 100-tick archive load to the configured concurrency", async () => {
    const limiter = createRecentTickActivityRequestLimiter(4);
    let activeRequests = 0;
    let maximumActiveRequests = 0;

    const values = await Promise.all(
      Array.from({ length: MAX_RECENT_TICK_WINDOW_SIZE }, (_, tick) =>
        limiter.run(new AbortController().signal, async () => {
          activeRequests += 1;
          maximumActiveRequests = Math.max(maximumActiveRequests, activeRequests);
          await new Promise((resolve) => setTimeout(resolve, 0));
          activeRequests -= 1;
          return tick;
        }),
      ),
    );

    expect(values).toEqual(Array.from({ length: MAX_RECENT_TICK_WINDOW_SIZE }, (_, tick) => tick));
    expect(maximumActiveRequests).toBe(4);
  });

  test("propagates abort signals and removes queued archive requests", async () => {
    const limiter = createRecentTickActivityRequestLimiter(1);
    const activeController = new AbortController();
    const queuedController = new AbortController();
    const activeReason = new Error("stop active request");
    const queuedReason = new Error("stop queued request");
    let receivedSignal: AbortSignal | undefined;
    let queuedOperationCalled = false;

    const activeRequest = limiter.run(activeController.signal, (signal) => {
      receivedSignal = signal;
      return new Promise<never>((_, reject) => {
        signal.addEventListener("abort", () => reject(signal.reason), { once: true });
      });
    });
    const queuedRequest = limiter.run(queuedController.signal, async () => {
      queuedOperationCalled = true;
      return "unexpected";
    });

    queuedController.abort(queuedReason);
    await expect(queuedRequest).rejects.toBe(queuedReason);
    expect(queuedOperationCalled).toBe(false);

    activeController.abort(activeReason);
    await expect(activeRequest).rejects.toBe(activeReason);
    expect(receivedSignal).toBe(activeController.signal);
  });

  test("maps loading, available, and unavailable archive states without inventing counts", () => {
    const available = normalizeTickActivity(100, { transactionHashes: ["a", "b"] } as never);
    const unavailable = normalizeTickActivity(101, undefined);

    expect(mapRecentTickActivityState(available, true)).toMatchObject({ state: "loading", transactionCount: 2 });
    expect(mapRecentTickActivityState(available, false)).toMatchObject({ state: "available", transactionCount: 2 });
    expect(mapRecentTickActivityState(unavailable, false)).toEqual({
      tick: 101,
      available: false,
      transactionCount: null,
      state: "unavailable",
    });
  });
});
