import { describe, expect, test } from "bun:test";

import {
  createRecentTickWindow,
  MAX_RECENT_TICK_WINDOW_SIZE,
  normalizeTickActivity,
} from "../activity";

describe("recent archive tick activity", () => {
  test("keeps the bounded window at or below the requested archive tip", () => {
    expect(createRecentTickWindow(100)).toEqual([96, 97, 98, 99, 100]);
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
});
