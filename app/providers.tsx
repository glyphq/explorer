"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

import { isExplorerRpcError } from "@/lib/rpc/errors";

export function createExplorerQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 15_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        retry: (failureCount, error) =>
          isExplorerRpcError(error) && error.retryable && failureCount < 2,
        retryDelay: (attemptIndex) => Math.min(1_000 * 2 ** attemptIndex, 4_000),
      },
    },
  });
}

export default function ExplorerProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createExplorerQueryClient);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
