import {
  createAbortedError,
  createTimeoutError,
  ExplorerRpcError,
  normalizeRpcError,
} from "@/lib/rpc/errors";

export const LATEST_STATS_ENDPOINT = "https://rpc.qubic.org/v1/latest-stats";
export const DEFAULT_STATS_TIMEOUT_MS = 8_500;

export interface LatestStats {
  timestamp: number;
  circulatingSupply: bigint;
  activeAddresses: number;
  price: number;
  marketCap: bigint;
  epoch: number;
  currentTick: number;
  ticksInCurrentEpoch: number;
  emptyTicksInCurrentEpoch: number;
  epochTickQuality: number;
  burnedQus: bigint;
}

export interface LatestStatsRequestOptions {
  readonly signal?: AbortSignal;
  readonly timeoutMs?: number;
  readonly fetcher?: StatsFetcher;
}

export type StatsFetcher = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

function invalidStatsResponse(field?: string, cause?: unknown): ExplorerRpcError {
  const suffix = field ? ` Missing or invalid field: ${field}.` : "";
  return new ExplorerRpcError(`Latest stats response was invalid.${suffix}`, {
    kind: "invalid-response",
    endpoint: LATEST_STATS_ENDPOINT,
    cause,
  });
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : null;
}

function parseInteger(value: unknown, field: string): number {
  let parsed: bigint;

  if (typeof value === "bigint") {
    parsed = value;
  } else if (typeof value === "number") {
    if (!Number.isSafeInteger(value) || value < 0) throw invalidStatsResponse(field);
    parsed = BigInt(value);
  } else if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    parsed = BigInt(value.trim());
  } else {
    throw invalidStatsResponse(field);
  }

  const numberValue = Number(parsed);
  if (!Number.isSafeInteger(numberValue)) throw invalidStatsResponse(field);
  return numberValue;
}

function parseBigInt(value: unknown, field: string): bigint {
  if (typeof value === "bigint" && value >= BigInt(0)) return value;
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) return BigInt(value);
  if (typeof value === "string" && /^\d+$/.test(value.trim())) return BigInt(value.trim());
  throw invalidStatsResponse(field);
}

function parseDecimal(value: unknown, field: string, maximum?: number): number {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value.trim()) : NaN;
  if (!Number.isFinite(parsed) || parsed < 0 || (maximum !== undefined && parsed > maximum)) {
    throw invalidStatsResponse(field);
  }
  return parsed;
}

export function normalizeLatestStats(payload: unknown): LatestStats {
  const envelope = asRecord(payload);
  const data = asRecord(envelope?.data);
  if (!data) throw invalidStatsResponse("data");

  return {
    timestamp: parseInteger(data.timestamp, "data.timestamp"),
    circulatingSupply: parseBigInt(data.circulatingSupply, "data.circulatingSupply"),
    activeAddresses: parseInteger(data.activeAddresses, "data.activeAddresses"),
    price: parseDecimal(data.price, "data.price"),
    marketCap: parseBigInt(data.marketCap, "data.marketCap"),
    epoch: parseInteger(data.epoch, "data.epoch"),
    currentTick: parseInteger(data.currentTick, "data.currentTick"),
    ticksInCurrentEpoch: parseInteger(data.ticksInCurrentEpoch, "data.ticksInCurrentEpoch"),
    emptyTicksInCurrentEpoch: parseInteger(data.emptyTicksInCurrentEpoch, "data.emptyTicksInCurrentEpoch"),
    epochTickQuality: parseDecimal(data.epochTickQuality, "data.epochTickQuality", 100),
    burnedQus: parseBigInt(data.burnedQus, "data.burnedQus"),
  };
}

function timeoutValue(value: number | undefined): number {
  return Number.isFinite(value) && (value ?? 0) > 0
    ? Math.floor(value as number)
    : DEFAULT_STATS_TIMEOUT_MS;
}

export async function fetchLatestStats({
  fetcher = fetch,
  signal,
  timeoutMs: requestedTimeout,
}: LatestStatsRequestOptions = {}): Promise<LatestStats> {
  const timeoutMs = timeoutValue(requestedTimeout);
  if (signal?.aborted) throw createAbortedError(LATEST_STATS_ENDPOINT, signal.reason);

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
    rejectCallerAbort?.(createAbortedError(LATEST_STATS_ENDPOINT, signal?.reason));
  };
  signal?.addEventListener("abort", abortFromCaller, { once: true });
  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
    rejectTimeout?.(createTimeoutError(LATEST_STATS_ENDPOINT, timeoutMs));
  }, timeoutMs);

  try {
    const operation = (async () => {
      const response = await fetcher(LATEST_STATS_ENDPOINT, {
        headers: { accept: "application/json" },
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new ExplorerRpcError(`Latest stats request failed with HTTP ${response.status}.`, {
          kind: "http",
          endpoint: LATEST_STATS_ENDPOINT,
          status: response.status,
          retryable: response.status === 408 || response.status === 429 || response.status >= 500,
        });
      }

      let payload: unknown;
      try {
        payload = await response.json();
      } catch (error) {
        throw invalidStatsResponse("json", error);
      }
      return normalizeLatestStats(payload);
    })();

    return await Promise.race([
      operation,
      timeoutPromise,
      ...(callerAbortPromise ? [callerAbortPromise] : []),
    ]);
  } catch (error) {
    if (timedOut) throw createTimeoutError(LATEST_STATS_ENDPOINT, timeoutMs, error);
    if (signal?.aborted) throw createAbortedError(LATEST_STATS_ENDPOINT, signal.reason ?? error);
    if (error instanceof ExplorerRpcError) throw error;
    throw normalizeRpcError(error, LATEST_STATS_ENDPOINT);
  } finally {
    clearTimeout(timeoutId);
    signal?.removeEventListener("abort", abortFromCaller);
  }
}
