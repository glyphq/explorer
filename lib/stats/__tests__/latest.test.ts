import { describe, expect, test } from "bun:test";

import { ExplorerRpcError } from "@/lib/rpc/errors";

import {
  fetchLatestStats,
  LATEST_STATS_ENDPOINT,
  normalizeLatestStats,
} from "../latest";

const VALID_PAYLOAD = {
  data: {
    timestamp: "1786528355",
    circulatingSupply: "175321086404672",
    activeAddresses: 617687,
    price: 4.47e-7,
    marketCap: "78368524",
    epoch: 225,
    currentTick: 73831753,
    ticksInCurrentEpoch: 1766643,
    emptyTicksInCurrentEpoch: 11142,
    epochTickQuality: 99.36931,
    burnedQus: "49678913595328",
  },
};

describe("latest Qubic stats", () => {
  test("normalizes the official envelope without losing large integer precision", () => {
    expect(normalizeLatestStats(VALID_PAYLOAD)).toEqual({
      timestamp: 1786528355,
      circulatingSupply: BigInt("175321086404672"),
      activeAddresses: 617687,
      price: 4.47e-7,
      marketCap: BigInt("78368524"),
      epoch: 225,
      currentTick: 73831753,
      ticksInCurrentEpoch: 1766643,
      emptyTicksInCurrentEpoch: 11142,
      epochTickQuality: 99.36931,
      burnedQus: BigInt("49678913595328"),
    });
  });

  test("rejects missing, negative, and out-of-range telemetry fields", () => {
    expect(() => normalizeLatestStats({ data: { ...VALID_PAYLOAD.data, epochTickQuality: 101 } })).toThrow(
      /epochTickQuality/,
    );
    expect(() => normalizeLatestStats({ data: { ...VALID_PAYLOAD.data, currentTick: -1 } })).toThrow(
      /currentTick/,
    );
    expect(() => normalizeLatestStats({ data: { ...VALID_PAYLOAD.data, burnedQus: undefined } })).toThrow(
      /burnedQus/,
    );
  });

  test("fetches only the public endpoint and passes an abort signal", async () => {
    let requestedUrl = "";
    let requestedInit: RequestInit | undefined;
    const stats = await fetchLatestStats({
      fetcher: async (input, init) => {
        requestedUrl = String(input);
        requestedInit = init;
        return new Response(JSON.stringify(VALID_PAYLOAD), {
          headers: { "content-type": "application/json" },
          status: 200,
        });
      },
    });

    expect(requestedUrl).toBe(LATEST_STATS_ENDPOINT);
    expect(requestedInit?.headers).toEqual({ accept: "application/json" });
    expect(requestedInit?.signal).toBeInstanceOf(AbortSignal);
    expect(stats.currentTick).toBe(73831753);
  });

  test("normalizes HTTP failures and enforces a timeout even for an ignoring fetcher", async () => {
    const httpFailure = fetchLatestStats({
      fetcher: async () => new Response(null, { status: 503 }),
    });
    await expect(httpFailure).rejects.toMatchObject({
      endpoint: LATEST_STATS_ENDPOINT,
      kind: "http",
      retryable: true,
      status: 503,
    });

    const timeout = fetchLatestStats({
      fetcher: async () => new Promise<Response>(() => undefined),
      timeoutMs: 10,
    });
    await expect(timeout).rejects.toMatchObject({
      endpoint: LATEST_STATS_ENDPOINT,
      kind: "timeout",
      retryable: true,
    });
  });

  test("normalizes caller cancellation", async () => {
    const controller = new AbortController();
    const request = fetchLatestStats({
      fetcher: async () => new Promise<Response>(() => undefined),
      signal: controller.signal,
      timeoutMs: 100,
    });
    controller.abort();

    await expect(request).rejects.toBeInstanceOf(ExplorerRpcError);
    await expect(request).rejects.toMatchObject({
      endpoint: LATEST_STATS_ENDPOINT,
      kind: "aborted",
    });
  });
});
