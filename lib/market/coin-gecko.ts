import {
  createAbortedError,
  createTimeoutError,
  ExplorerRpcError,
  normalizeRpcError,
} from "@/lib/rpc/errors";

export const COINGECKO_QUBIC_ID = "qubic-network";
export const COINGECKO_MARKET_ENDPOINT = "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=qubic-network&price_change_percentage=24h%2C7d";
export const COINGECKO_HISTORY_ENDPOINT = "https://api.coingecko.com/api/v3/coins/qubic-network/market_chart?vs_currency=usd&days=30&interval=daily";
export const DEFAULT_MARKET_TIMEOUT_MS = 8_500;

export type MarketHistoryPoint = {
  timestamp: number;
  priceUsd: number;
};

export type QubicMarketSnapshot = {
  priceUsd: number;
  marketCapUsd: number;
  priceChange24h: number | null;
  priceChange7d: number | null;
  volume24hUsd: number | null;
  circulatingSupply: number | null;
  lastUpdated: string;
  history: MarketHistoryPoint[];
};

export type MarketFetcher = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export type FetchQubicMarketOptions = {
  readonly fetcher?: MarketFetcher;
  readonly signal?: AbortSignal;
  readonly timeoutMs?: number;
};

function invalidMarketResponse(field?: string, cause?: unknown): ExplorerRpcError {
  const suffix = field ? ` Missing or invalid field: ${field}.` : "";
  return new ExplorerRpcError(`Market data response was invalid.${suffix}`, {
    kind: "invalid-response",
    endpoint: COINGECKO_MARKET_ENDPOINT,
    cause,
  });
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : null;
}

function asFiniteNumber(value: unknown, field: string, minimum = 0): number {
  const numberValue = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(numberValue) || numberValue < minimum) throw invalidMarketResponse(field);
  return numberValue;
}

function asOptionalFiniteNumber(value: unknown, field: string, minimum = -Infinity): number | null {
  if (value === null || value === undefined) return null;
  return asFiniteNumber(value, field, minimum);
}

function asUpdatedAt(value: unknown): string {
  if (typeof value !== "string" || Number.isNaN(new Date(value).getTime())) {
    throw invalidMarketResponse("last_updated");
  }
  return value;
}

export function normalizeMarketHistory(payload: unknown): MarketHistoryPoint[] {
  const record = asRecord(payload);
  if (!record || !Array.isArray(record.prices)) return [];

  return record.prices
    .flatMap((entry) => {
      if (!Array.isArray(entry) || entry.length < 2) return [];
      const timestamp = entry[0];
      const price = entry[1];
      if (
        typeof timestamp !== "number"
        || !Number.isSafeInteger(timestamp)
        || timestamp < 0
        || typeof price !== "number"
        || !Number.isFinite(price)
        || price < 0
      ) {
        return [];
      }
      return [{ timestamp, priceUsd: price }];
    })
    .sort((left, right) => left.timestamp - right.timestamp)
    .slice(-31);
}

export function normalizeQubicMarket(
  marketPayload: unknown,
  historyPayload: unknown,
): QubicMarketSnapshot {
  if (!Array.isArray(marketPayload) || marketPayload.length !== 1) {
    throw invalidMarketResponse("market");
  }

  const market = asRecord(marketPayload[0]);
  if (!market || market.id !== COINGECKO_QUBIC_ID) throw invalidMarketResponse("market.id");

  return {
    priceUsd: asFiniteNumber(market.current_price, "current_price"),
    marketCapUsd: asFiniteNumber(market.market_cap, "market_cap"),
    priceChange24h: asOptionalFiniteNumber(
      market.price_change_percentage_24h_in_currency ?? market.price_change_percentage_24h,
      "price_change_percentage_24h",
    ),
    priceChange7d: asOptionalFiniteNumber(
      market.price_change_percentage_7d_in_currency,
      "price_change_percentage_7d",
    ),
    volume24hUsd: asOptionalFiniteNumber(market.total_volume, "total_volume"),
    circulatingSupply: asOptionalFiniteNumber(market.circulating_supply, "circulating_supply"),
    lastUpdated: asUpdatedAt(market.last_updated),
    history: normalizeMarketHistory(historyPayload),
  };
}

function timeoutValue(value: number | undefined): number {
  return Number.isFinite(value) && (value ?? 0) > 0
    ? Math.floor(value as number)
    : DEFAULT_MARKET_TIMEOUT_MS;
}

async function parseResponse(response: Response, endpoint: string): Promise<unknown> {
  if (!response.ok) {
    throw new ExplorerRpcError(`Market data request failed with HTTP ${response.status}.`, {
      kind: "http",
      endpoint,
      status: response.status,
      retryable: response.status === 408 || response.status === 429 || response.status >= 500,
    });
  }

  try {
    return await response.json();
  } catch (error) {
    throw invalidMarketResponse("json", error);
  }
}

export async function fetchQubicMarket({
  fetcher = fetch,
  signal,
  timeoutMs: requestedTimeout,
}: FetchQubicMarketOptions = {}): Promise<QubicMarketSnapshot> {
  const timeoutMs = timeoutValue(requestedTimeout);
  if (signal?.aborted) throw createAbortedError(COINGECKO_MARKET_ENDPOINT, signal.reason);

  const controller = new AbortController();
  let timedOut = false;
  let rejectCallerAbort: ((reason?: unknown) => void) | undefined;
  let rejectTimeout: ((reason?: unknown) => void) | undefined;
  const callerAbortPromise = signal
    ? new Promise<never>((_, reject) => {
      rejectCallerAbort = reject;
    })
    : null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    rejectTimeout = reject;
  });
  const abortFromCaller = () => {
    controller.abort(signal?.reason);
    rejectCallerAbort?.(createAbortedError(COINGECKO_MARKET_ENDPOINT, signal?.reason));
  };
  signal?.addEventListener("abort", abortFromCaller, { once: true });
  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
    rejectTimeout?.(createTimeoutError(COINGECKO_MARKET_ENDPOINT, timeoutMs));
  }, timeoutMs);

  try {
    const marketRequest = fetcher(COINGECKO_MARKET_ENDPOINT, {
      headers: { accept: "application/json" },
      signal: controller.signal,
    }).then((response) => parseResponse(response, COINGECKO_MARKET_ENDPOINT));
    const historyRequest = fetcher(COINGECKO_HISTORY_ENDPOINT, {
      headers: { accept: "application/json" },
      signal: controller.signal,
    }).then((response) => parseResponse(response, COINGECKO_HISTORY_ENDPOINT));

    const operation = (async () => {
      const [marketResult, historyResult] = await Promise.allSettled([marketRequest, historyRequest]);
      if (marketResult.status === "rejected") throw marketResult.reason;
      return normalizeQubicMarket(
        marketResult.value,
        historyResult.status === "fulfilled" ? historyResult.value : undefined,
      );
    })();

    return await Promise.race([
      operation,
      timeoutPromise,
      ...(callerAbortPromise ? [callerAbortPromise] : []),
    ]);
  } catch (error) {
    if (timedOut) throw createTimeoutError(COINGECKO_MARKET_ENDPOINT, timeoutMs, error);
    if (signal?.aborted) throw createAbortedError(COINGECKO_MARKET_ENDPOINT, signal.reason ?? error);
    if (error instanceof ExplorerRpcError) throw error;
    throw normalizeRpcError(error, COINGECKO_MARKET_ENDPOINT);
  } finally {
    clearTimeout(timeoutId);
    signal?.removeEventListener("abort", abortFromCaller);
  }
}
