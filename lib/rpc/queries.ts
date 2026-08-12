"use client";

import type {
  AssetIssuance,
  GetEventLogsRequest,
  LiveTickInfo,
  QueryComputorList,
  QueryTickData,
  QueryTransaction,
  QubicBalance,
  ProcessedTickInterval,
} from "@qubic.org/rpc";
import {
  useInfiniteQuery,
  useQuery,
  type QueryKey,
  type UseInfiniteQueryOptions,
  type UseQueryOptions,
} from "@tanstack/react-query";

import {
  explorerData,
  type ExplorerAssetIssuanceEventsPage,
  type ExplorerTransactionsForIdentityRequest,
} from "./adapter";
import { getNextAssetIssuanceOffset } from "../assets";
import { ExplorerRpcError } from "./errors";
import {
  normalizeIdentity,
  normalizeAssetIndex,
  normalizeTick,
  normalizeTransactionHash,
} from "./validation";

export const explorerQueryKeys = {
  all: ["qubic"] as const,
  live: {
    all: () => ["qubic", "live"] as const,
    tickInfo: () => ["qubic", "live", "tick-info"] as const,
    balance: (identity: string | null) => ["qubic", "live", "balance", identity] as const,
  },
  query: {
    all: () => ["qubic", "query"] as const,
    lastProcessedTick: () => ["qubic", "query", "last-processed-tick"] as const,
    processedTickIntervals: () => ["qubic", "query", "processed-tick-intervals"] as const,
    computorLists: (epoch: number | null) => ["qubic", "query", "computor-lists", epoch] as const,
    tickData: (tick: number | null) => ["qubic", "query", "tick-data", tick] as const,
    transaction: (hash: string | null) => ["qubic", "query", "transaction", hash] as const,
    transactionsForTick: (tick: number | null) => ["qubic", "query", "transactions-for-tick", tick] as const,
    transactionsForIdentity: (request: ExplorerTransactionsForIdentityRequest | null) => [
      "qubic",
      "query",
      "transactions-for-identity",
      request,
    ] as const,
    eventLogs: (request: GetEventLogsRequest) => ["qubic", "query", "event-logs", request] as const,
    assetIssuanceEvents: (pageSize: number) => ["qubic", "query", "asset-issuance-events", pageSize] as const,
  },
  assets: {
    issuance: (index: number | null) => ["qubic", "assets", "issuance", index] as const,
  },
} as const;

export const explorerQueryPolicies = {
  default: {
    staleTime: 15_000,
    gcTime: 5 * 60_000,
  },
  liveTickInfo: {
    staleTime: 5_000,
    gcTime: 60_000,
    refetchInterval: 5_000,
  },
  liveBalance: {
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  },
  archiveProgress: {
    staleTime: 15_000,
    gcTime: 2 * 60_000,
    refetchInterval: 15_000,
  },
  archiveSnapshot: {
    staleTime: 5 * 60_000,
    gcTime: 15 * 60_000,
  },
  search: {
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  },
} as const;

type QueryOverrides<TData, TQueryKey extends QueryKey> = Omit<
  UseQueryOptions<TData, ExplorerRpcError, TData, TQueryKey>,
  "queryKey" | "queryFn"
>;

type LastProcessedTick = Awaited<ReturnType<typeof explorerData.getLastProcessedTick>>;
type TransactionsForIdentity = Awaited<
  ReturnType<typeof explorerData.getTransactionsForIdentity>
>;
type EventLogs = Awaited<ReturnType<typeof explorerData.getEventLogs>>;
type AssetIssuanceEvents = Awaited<ReturnType<typeof explorerData.getAssetIssuanceEvents>>;

export function liveTickInfoQueryOptions() {
  const queryKey = explorerQueryKeys.live.tickInfo();
  return {
    queryKey,
    queryFn: ({ signal }: { signal: AbortSignal }) => explorerData.getTickInfo({ signal }),
    ...explorerQueryPolicies.liveTickInfo,
  } satisfies UseQueryOptions<LiveTickInfo, ExplorerRpcError, LiveTickInfo, typeof queryKey>;
}

export function lastProcessedTickQueryOptions() {
  const queryKey = explorerQueryKeys.query.lastProcessedTick();
  return {
    queryKey,
    queryFn: ({ signal }: { signal: AbortSignal }) => explorerData.getLastProcessedTick({ signal }),
    ...explorerQueryPolicies.archiveProgress,
  } satisfies UseQueryOptions<LastProcessedTick, ExplorerRpcError, LastProcessedTick, typeof queryKey>;
}

export function processedTickIntervalsQueryOptions() {
  const queryKey = explorerQueryKeys.query.processedTickIntervals();
  return {
    queryKey,
    queryFn: ({ signal }: { signal: AbortSignal }) => explorerData.getProcessedTickIntervals({ signal }),
    ...explorerQueryPolicies.archiveSnapshot,
  } satisfies UseQueryOptions<ProcessedTickInterval[], ExplorerRpcError, ProcessedTickInterval[], typeof queryKey>;
}

export function useLiveTickInfo(
  options?: QueryOverrides<LiveTickInfo, ReturnType<typeof explorerQueryKeys.live.tickInfo>>,
) {
  return useQuery({ ...liveTickInfoQueryOptions(), ...options });
}

export function useLastProcessedTick(
  options?: QueryOverrides<LastProcessedTick, ReturnType<typeof explorerQueryKeys.query.lastProcessedTick>>,
) {
  return useQuery({ ...lastProcessedTickQueryOptions(), ...options });
}

export function useProcessedTickIntervals(
  options?: QueryOverrides<ProcessedTickInterval[], ReturnType<typeof explorerQueryKeys.query.processedTickIntervals>>,
) {
  return useQuery({ ...processedTickIntervalsQueryOptions(), ...options });
}

export function useQubicBalance(
  identity: string | null | undefined,
  options?: QueryOverrides<QubicBalance, ReturnType<typeof explorerQueryKeys.live.balance>>,
) {
  const normalized = normalizeIdentity(identity);
  const queryKey = explorerQueryKeys.live.balance(normalized);

  return useQuery({
    queryKey,
    queryFn: ({ signal }: { signal: AbortSignal }) => {
      if (!normalized) {
        throw new ExplorerRpcError("Invalid Qubic identity.", {
          kind: "validation",
          endpoint: "/live/v1/balances/{id}",
        });
      }
      return explorerData.getBalance(normalized, { signal });
    },
    ...explorerQueryPolicies.liveBalance,
    ...options,
    enabled: Boolean(normalized) && options?.enabled !== false,
  });
}

export function useTickData(
  tick: number | string | null | undefined,
  options?: QueryOverrides<QueryTickData, ReturnType<typeof explorerQueryKeys.query.tickData>>,
) {
  const normalized = normalizeTick(tick);
  const queryKey = explorerQueryKeys.query.tickData(normalized);

  return useQuery({
    queryKey,
    queryFn: ({ signal }: { signal: AbortSignal }) => explorerData.getTickData(normalized as number, { signal }),
    ...explorerQueryPolicies.archiveSnapshot,
    ...options,
    enabled: normalized !== null && options?.enabled !== false,
  });
}

export function useTransactionByHash(
  hash: string | null | undefined,
  options?: QueryOverrides<QueryTransaction, ReturnType<typeof explorerQueryKeys.query.transaction>>,
) {
  const normalized = normalizeTransactionHash(hash);
  const queryKey = explorerQueryKeys.query.transaction(normalized);

  return useQuery({
    queryKey,
    queryFn: ({ signal }: { signal: AbortSignal }) => explorerData.getTransactionByHash(normalized as string, { signal }),
    ...explorerQueryPolicies.archiveSnapshot,
    ...options,
    enabled: Boolean(normalized) && options?.enabled !== false,
  });
}

export function useTransactionsForTick(
  tick: number | string | null | undefined,
  options?: QueryOverrides<QueryTransaction[], ReturnType<typeof explorerQueryKeys.query.transactionsForTick>>,
) {
  const normalized = normalizeTick(tick);
  const queryKey = explorerQueryKeys.query.transactionsForTick(normalized);

  return useQuery({
    queryKey,
    queryFn: ({ signal }: { signal: AbortSignal }) => explorerData.getTransactionsForTick(normalized as number, { signal }),
    ...explorerQueryPolicies.search,
    ...options,
    enabled: normalized !== null && options?.enabled !== false,
  });
}

export function useTransactionsForIdentity(
  request: ExplorerTransactionsForIdentityRequest | null | undefined,
  options?: QueryOverrides<TransactionsForIdentity, ReturnType<typeof explorerQueryKeys.query.transactionsForIdentity>>,
) {
  const normalizedIdentity = normalizeIdentity(request?.identity);
  const normalizedRequest = normalizedIdentity && request
    ? { ...request, identity: normalizedIdentity }
    : null;
  const queryKey = explorerQueryKeys.query.transactionsForIdentity(normalizedRequest);

  return useQuery({
    queryKey,
    queryFn: ({ signal }: { signal: AbortSignal }) => explorerData.getTransactionsForIdentity(normalizedRequest as ExplorerTransactionsForIdentityRequest, { signal }),
    ...explorerQueryPolicies.search,
    ...options,
    enabled: Boolean(normalizedRequest) && options?.enabled !== false,
  });
}

export function useEventLogs(
  request: GetEventLogsRequest,
  options?: QueryOverrides<EventLogs, ReturnType<typeof explorerQueryKeys.query.eventLogs>>,
) {
  const queryKey = explorerQueryKeys.query.eventLogs(request);
  return useQuery({
    queryKey,
    queryFn: ({ signal }: { signal: AbortSignal }) => explorerData.getEventLogs(request, { signal }),
    ...explorerQueryPolicies.search,
    ...options,
  });
}

export function useAssetIssuanceEvents(pageSize = 30) {
  const queryKey = explorerQueryKeys.query.assetIssuanceEvents(pageSize);

  return useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam, signal }: { pageParam: number; signal: AbortSignal }) =>
      explorerData.getAssetIssuanceEvents({ offset: pageParam, size: pageSize }, { signal }),
    initialPageParam: 0,
    getNextPageParam: (lastPage: AssetIssuanceEvents) => getNextAssetIssuanceOffset(lastPage),
    ...explorerQueryPolicies.search,
  } satisfies UseInfiniteQueryOptions<
    ExplorerAssetIssuanceEventsPage,
    ExplorerRpcError,
    ExplorerAssetIssuanceEventsPage,
    typeof queryKey,
    number
  >);
}

export function useAssetIssuance(
  index: number | string | null | undefined,
  options?: QueryOverrides<AssetIssuance, ReturnType<typeof explorerQueryKeys.assets.issuance>>,
) {
  const normalized = normalizeAssetIndex(index);
  const queryKey = explorerQueryKeys.assets.issuance(normalized);

  return useQuery({
    queryKey,
    queryFn: ({ signal }: { signal: AbortSignal }) => explorerData.getAssetIssuanceByIndex(normalized as number, { signal }),
    ...explorerQueryPolicies.archiveSnapshot,
    ...options,
    enabled: normalized !== null && options?.enabled !== false,
  });
}

export function useComputorListsForEpoch(
  epoch: number | string | null | undefined,
  options?: QueryOverrides<QueryComputorList[], ReturnType<typeof explorerQueryKeys.query.computorLists>>,
) {
  const normalized = normalizeTick(epoch);
  const queryKey = explorerQueryKeys.query.computorLists(normalized);

  return useQuery({
    queryKey,
    queryFn: ({ signal }: { signal: AbortSignal }) => explorerData.getComputorListsForEpoch(normalized as number, { signal }),
    ...explorerQueryPolicies.archiveSnapshot,
    ...options,
    enabled: normalized !== null && options?.enabled !== false,
  });
}
