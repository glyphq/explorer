"use client";

import { useQuery, type QueryKey, type UseQueryOptions } from "@tanstack/react-query";

import { ExplorerRpcError } from "@/lib/rpc/errors";

import { fetchLatestStats, type LatestStats } from "./latest";
import {
  DEFAULT_RICH_LIST_PAGE_SIZE,
  fetchRichList,
  type RichListPage,
} from "./rich-list";

export const latestStatsQueryKey = ["qubic", "stats", "latest"] as const;

type LatestStatsQueryOverrides = Omit<
  UseQueryOptions<LatestStats, ExplorerRpcError, LatestStats, typeof latestStatsQueryKey>,
  "queryKey" | "queryFn"
>;

export function latestStatsQueryOptions() {
  return {
    queryKey: latestStatsQueryKey,
    queryFn: ({ signal }: { signal: AbortSignal }) => fetchLatestStats({ signal }),
    staleTime: 15_000,
    gcTime: 5 * 60_000,
    refetchInterval: 15_000,
  } satisfies UseQueryOptions<LatestStats, ExplorerRpcError, LatestStats, QueryKey>;
}

export function useLatestStats(options?: LatestStatsQueryOverrides) {
  return useQuery({ ...latestStatsQueryOptions(), ...options });
}

export const richListQueryKey = (page: number, pageSize = DEFAULT_RICH_LIST_PAGE_SIZE) =>
  ["qubic", "stats", "rich-list", page, pageSize] as const;

type RichListQueryOverrides = Omit<
  UseQueryOptions<RichListPage, ExplorerRpcError, RichListPage, ReturnType<typeof richListQueryKey>>,
  "queryKey" | "queryFn"
>;

export function richListQueryOptions(page = 1, pageSize = DEFAULT_RICH_LIST_PAGE_SIZE) {
  return {
    queryKey: richListQueryKey(page, pageSize),
    queryFn: ({ signal }: { signal: AbortSignal }) => fetchRichList({ page, pageSize, signal }),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  } satisfies UseQueryOptions<RichListPage, ExplorerRpcError, RichListPage, ReturnType<typeof richListQueryKey>>;
}

export function useRichList(page = 1, pageSize = DEFAULT_RICH_LIST_PAGE_SIZE, options?: RichListQueryOverrides) {
  return useQuery({ ...richListQueryOptions(page, pageSize), ...options });
}
