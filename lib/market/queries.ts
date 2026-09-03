"use client";

import { useQuery, type QueryKey, type UseQueryOptions } from "@tanstack/react-query";

import type { QubicMarketSnapshot } from "./coin-gecko";

export const qubicMarketQueryKey = ["qubic", "market", "coingecko"] as const;

async function fetchQubicMarketSnapshot({ signal }: { signal: AbortSignal }): Promise<QubicMarketSnapshot> {
  const response = await fetch("/api/market", {
    headers: { accept: "application/json" },
    signal,
  });

  if (!response.ok) throw new Error("Market data is unavailable.");
  return response.json() as Promise<QubicMarketSnapshot>;
}

type QubicMarketQueryOverrides = Omit<
  UseQueryOptions<QubicMarketSnapshot, Error, QubicMarketSnapshot, typeof qubicMarketQueryKey>,
  "queryKey" | "queryFn"
>;

export function qubicMarketQueryOptions() {
  return {
    queryKey: qubicMarketQueryKey,
    queryFn: ({ signal }: { signal: AbortSignal }) => fetchQubicMarketSnapshot({ signal }),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchInterval: 5 * 60_000,
  } satisfies UseQueryOptions<QubicMarketSnapshot, Error, QubicMarketSnapshot, QueryKey>;
}

export function useQubicMarket(options?: QubicMarketQueryOverrides) {
  return useQuery({ ...qubicMarketQueryOptions(), ...options });
}
