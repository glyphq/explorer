import { describe, expect, test } from "bun:test";

import {
  COINGECKO_HISTORY_ENDPOINT,
  COINGECKO_MARKET_ENDPOINT,
  fetchQubicMarket,
  normalizeQubicMarket,
} from "../coin-gecko";

const MARKET_PAYLOAD = [{
  id: "qubic-network",
  current_price: 4.24652e-7,
  market_cap: 60_318_679,
  price_change_percentage_24h_in_currency: 0.83106,
  price_change_percentage_7d_in_currency: 0.7,
  total_volume: 790_319,
  circulating_supply: 142_068_835_788_156,
  last_updated: "2026-09-03T00:51:20.000Z",
}];

const HISTORY_PAYLOAD = {
  prices: [
    [1_788_395_200_000, 4.095904367624855e-7],
    [1_788_482_400_000, 4.103665392330583e-7],
  ],
  market_caps: [
    [1_788_395_200_000, 58_122_000],
    [1_788_482_400_000, 59_214_000],
  ],
  total_volumes: [
    [1_788_395_200_000, 701_000],
    [1_788_482_400_000, 820_000],
  ],
};

describe("CoinGecko Qubic market data", () => {
  test("normalizes the selected Qubic asset and its valid price history", () => {
    expect(normalizeQubicMarket(MARKET_PAYLOAD, HISTORY_PAYLOAD)).toEqual({
      priceUsd: 4.24652e-7,
      marketCapUsd: 60_318_679,
      priceChange24h: 0.83106,
      priceChange7d: 0.7,
      volume24hUsd: 790_319,
      circulatingSupply: 142_068_835_788_156,
      lastUpdated: "2026-09-03T00:51:20.000Z",
      history: [
        { timestamp: 1_788_395_200_000, priceUsd: 4.095904367624855e-7 },
        { timestamp: 1_788_482_400_000, priceUsd: 4.103665392330583e-7 },
      ],
      marketCapHistory: [
        { timestamp: 1_788_395_200_000, value: 58_122_000 },
        { timestamp: 1_788_482_400_000, value: 59_214_000 },
      ],
      volumeHistory: [
        { timestamp: 1_788_395_200_000, value: 701_000 },
        { timestamp: 1_788_482_400_000, value: 820_000 },
      ],
    });
  });

  test("does not accept an unexpected asset or malformed core values", () => {
    expect(() => normalizeQubicMarket([{ ...MARKET_PAYLOAD[0], id: "another-asset" }], HISTORY_PAYLOAD)).toThrow(
      /market.id/,
    );
    expect(() => normalizeQubicMarket([{ ...MARKET_PAYLOAD[0], market_cap: -1 }], HISTORY_PAYLOAD)).toThrow(
      /market_cap/,
    );
  });

  test("keeps current market data when the optional trend series is unavailable", async () => {
    const requested: string[] = [];
    const market = await fetchQubicMarket({
      fetcher: async (input, init) => {
        requested.push(String(input));
        expect(init?.headers).toEqual({ accept: "application/json" });
        expect(init?.signal).toBeInstanceOf(AbortSignal);
        if (String(input) === COINGECKO_HISTORY_ENDPOINT) return new Response(null, { status: 429 });
        return new Response(JSON.stringify(MARKET_PAYLOAD), { status: 200 });
      },
    });

    expect(requested).toEqual([COINGECKO_MARKET_ENDPOINT, COINGECKO_HISTORY_ENDPOINT]);
    expect(market.priceUsd).toBe(4.24652e-7);
    expect(market.history).toEqual([]);
    expect(market.marketCapHistory).toEqual([]);
    expect(market.volumeHistory).toEqual([]);
  });

  test("fails safely when the primary market endpoint is unavailable", async () => {
    await expect(fetchQubicMarket({
      fetcher: async () => new Response(null, { status: 503 }),
    })).rejects.toMatchObject({
      endpoint: COINGECKO_MARKET_ENDPOINT,
      kind: "http",
      retryable: true,
      status: 503,
    });
  });
});
