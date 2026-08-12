import {
  createAbortedError,
  createTimeoutError,
  ExplorerRpcError,
  normalizeRpcError,
} from "@/lib/rpc/errors";
import { normalizeIdentity } from "@/lib/rpc/validation";

export const RICH_LIST_STATS_ENDPOINT = "https://rpc.qubic.org/v1/rich-list";
export const DEFAULT_RICH_LIST_PAGE_SIZE = 25;
export const MAX_RICH_LIST_PAGE_SIZE = 100;
export const DEFAULT_STATS_TIMEOUT_MS = 8_500;

export interface RichListPagination {
  totalRecords: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
}

export interface RichListEntry {
  identity: string;
  balance: bigint;
}

export interface RichListPage {
  epoch: number;
  pagination: RichListPagination;
  entries: RichListEntry[];
}

export interface RichListRequestOptions {
  readonly page?: number;
  readonly pageSize?: number;
  readonly signal?: AbortSignal;
  readonly timeoutMs?: number;
  readonly fetcher?: StatsFetcher;
}

export type StatsFetcher = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

function invalidRichListResponse(field?: string, cause?: unknown): ExplorerRpcError {
  const suffix = field ? ` Missing or invalid field: ${field}.` : "";
  return new ExplorerRpcError(`Rich list response was invalid.${suffix}`, {
    kind: "invalid-response",
    endpoint: RICH_LIST_STATS_ENDPOINT,
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
    if (!Number.isSafeInteger(value) || value < 0) throw invalidRichListResponse(field);
    parsed = BigInt(value);
  } else if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    parsed = BigInt(value.trim());
  } else {
    throw invalidRichListResponse(field);
  }

  const numberValue = Number(parsed);
  if (!Number.isSafeInteger(numberValue)) throw invalidRichListResponse(field);
  return numberValue;
}

function parseBalance(value: unknown, field: string): bigint {
  if (typeof value === "bigint" && value >= BigInt(0)) return value;
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) return BigInt(value);
  if (typeof value === "string" && /^\d+$/.test(value.trim())) return BigInt(value.trim());
  throw invalidRichListResponse(field);
}

function parsePositiveInteger(value: unknown, field: string): number {
  const parsed = parseInteger(value, field);
  if (parsed < 1) throw invalidRichListResponse(field);
  return parsed;
}

function parsePage(value: number | undefined): number {
  return Number.isSafeInteger(value) && (value ?? 0) >= 1 ? value as number : 1;
}

function parsePageSize(value: number | undefined): number {
  return Number.isSafeInteger(value) && (value ?? 0) >= 1
    ? Math.min(value as number, MAX_RICH_LIST_PAGE_SIZE)
    : DEFAULT_RICH_LIST_PAGE_SIZE;
}

function timeoutValue(value: number | undefined): number {
  return Number.isFinite(value) && (value ?? 0) > 0
    ? Math.floor(value as number)
    : DEFAULT_STATS_TIMEOUT_MS;
}

export function normalizeRichListPage(payload: unknown): RichListPage {
  const envelope = asRecord(payload);
  const pagination = asRecord(envelope?.pagination);
  const richList = asRecord(envelope?.richList);
  const entities = richList?.entities;

  if (!pagination) throw invalidRichListResponse("pagination");
  if (!richList) throw invalidRichListResponse("richList");
  if (!Array.isArray(entities)) throw invalidRichListResponse("richList.entities");

  return {
    epoch: parseInteger(envelope?.epoch, "epoch"),
    pagination: {
      totalRecords: parseInteger(pagination.totalRecords, "pagination.totalRecords"),
      currentPage: parsePositiveInteger(pagination.currentPage, "pagination.currentPage"),
      totalPages: parsePositiveInteger(pagination.totalPages, "pagination.totalPages"),
      pageSize: parsePositiveInteger(pagination.pageSize, "pagination.pageSize"),
    },
    entries: entities.map((entity, index) => {
      const record = asRecord(entity);
      const identity = normalizeIdentity(record?.identity);
      if (!identity) {
        throw invalidRichListResponse(`richList.entities[${index}].identity`);
      }

      return {
        identity,
        balance: parseBalance(record?.balance, `richList.entities[${index}].balance`),
      };
    }),
  };
}

export async function fetchRichList({
  fetcher = fetch,
  page: requestedPage,
  pageSize: requestedPageSize,
  signal,
  timeoutMs: requestedTimeout,
}: RichListRequestOptions = {}): Promise<RichListPage> {
  const page = parsePage(requestedPage);
  const pageSize = parsePageSize(requestedPageSize);
  const timeoutMs = timeoutValue(requestedTimeout);
  if (signal?.aborted) throw createAbortedError(RICH_LIST_STATS_ENDPOINT, signal.reason);

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
    rejectCallerAbort?.(createAbortedError(RICH_LIST_STATS_ENDPOINT, signal?.reason));
  };
  signal?.addEventListener("abort", abortFromCaller, { once: true });
  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
    rejectTimeout?.(createTimeoutError(RICH_LIST_STATS_ENDPOINT, timeoutMs));
  }, timeoutMs);

  try {
    const url = new URL(RICH_LIST_STATS_ENDPOINT);
    url.searchParams.set("page", String(page));
    url.searchParams.set("pageSize", String(pageSize));

    const operation = (async () => {
      const response = await fetcher(url, {
        headers: { accept: "application/json" },
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new ExplorerRpcError(`Rich list request failed with HTTP ${response.status}.`, {
          kind: "http",
          endpoint: RICH_LIST_STATS_ENDPOINT,
          status: response.status,
          retryable: response.status === 408 || response.status === 429 || response.status >= 500,
        });
      }

      let payload: unknown;
      try {
        payload = await response.json();
      } catch (error) {
        throw invalidRichListResponse("json", error);
      }
      return normalizeRichListPage(payload);
    })();

    return await Promise.race([
      operation,
      timeoutPromise,
      ...(callerAbortPromise ? [callerAbortPromise] : []),
    ]);
  } catch (error) {
    if (timedOut) throw createTimeoutError(RICH_LIST_STATS_ENDPOINT, timeoutMs, error);
    if (signal?.aborted) throw createAbortedError(RICH_LIST_STATS_ENDPOINT, signal.reason ?? error);
    if (error instanceof ExplorerRpcError) throw error;
    throw normalizeRpcError(error, RICH_LIST_STATS_ENDPOINT);
  } finally {
    clearTimeout(timeoutId);
    signal?.removeEventListener("abort", abortFromCaller);
  }
}
