"use client";

import { useQuery, type QueryKey, type UseQueryOptions } from "@tanstack/react-query";

import { ExplorerRpcError } from "@/lib/rpc/errors";

import { fetchLatestStats, type LatestStats } from "./latest";

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
