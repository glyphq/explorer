"use client";

import type { QueryTickData } from "@qubic.org/rpc";
import { useQueries } from "@tanstack/react-query";
import { useState } from "react";

import { explorerData } from "@/lib/rpc/adapter";
import { ExplorerRpcError } from "@/lib/rpc/errors";

import {
  createRecentTickWindow,
  createRecentTickActivityRequestLimiter,
  mapRecentTickActivityState,
  normalizeTickActivity,
  type RecentTickActivity,
  type RecentTickActivityRequestLimiter,
  type RecentTickActivityState,
} from "./activity";

export interface RecentTickActivityQuery {
  ticks: number[];
  activities: Array<RecentTickActivity & { state: RecentTickActivityState }>;
  isPending: boolean;
  isFetching: boolean;
  isError: boolean;
  refetch: () => Promise<unknown>;
}

export function useRecentTickActivity(lastProcessedTick: number | undefined): RecentTickActivityQuery {
  const ticks = createRecentTickWindow(lastProcessedTick);
  const [requestLimiter] = useState<RecentTickActivityRequestLimiter>(
    createRecentTickActivityRequestLimiter,
  );
  const results = useQueries({
    queries: ticks.map((tick) => ({
      queryKey: ["qubic", "archive", "tick-activity", tick] as const,
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        requestLimiter.run(signal, (requestSignal) => explorerData.getTickData(tick, { signal: requestSignal })),
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: false,
    })),
  });

  const activities = ticks.map((tick, index) => {
    const result = results[index] as {
      data?: QueryTickData;
      isPending: boolean;
    } | undefined;
    const normalized = normalizeTickActivity(tick, result?.data);
    return mapRecentTickActivityState(normalized, result?.isPending ?? false);
  });

  return {
    ticks,
    activities,
    isPending: results.some((result) => result.isPending),
    isFetching: results.some((result) => result.isFetching),
    isError: results.some((result) => result.isError),
    refetch: () => Promise.all(results.map((result) => result.refetch())),
  };
}

export type RecentTickActivityError = ExplorerRpcError;
