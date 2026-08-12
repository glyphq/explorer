import {
  createLiveClient as createQubicLiveClient,
  createQueryClient as createQubicQueryClient,
  type LiveClient,
  type QueryClient,
} from "@qubic.org/rpc";

export const DEFAULT_LIVE_RPC_URL = "https://rpc.qubic.org/live/v1";
export const DEFAULT_QUERY_RPC_URL = "https://rpc.qubic.org/query/v1";

export interface ExplorerRpcClients {
  readonly live: LiveClient;
  readonly query: QueryClient;
}

export interface ExplorerRpcClientOptions {
  readonly liveBaseUrl?: string;
  readonly queryBaseUrl?: string;
  readonly fetch?: (input: Request) => Promise<Response>;
}

function publicBaseUrl(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? value.replace(/\/$/, "") : fallback;
  } catch {
    return fallback;
  }
}

export function createExplorerRpcClients(
  options: ExplorerRpcClientOptions = {},
): ExplorerRpcClients {
  const fetchOptions = options.fetch ? { fetch: options.fetch } : {};

  return {
    live: createQubicLiveClient({
      baseUrl: publicBaseUrl(options.liveBaseUrl, DEFAULT_LIVE_RPC_URL),
      ...fetchOptions,
    }),
    query: createQubicQueryClient({
      baseUrl: publicBaseUrl(options.queryBaseUrl, DEFAULT_QUERY_RPC_URL),
      ...fetchOptions,
    }),
  };
}

export const explorerRpc = createExplorerRpcClients({
  liveBaseUrl: process.env.NEXT_PUBLIC_QUBIC_LIVE_RPC_URL,
  queryBaseUrl: process.env.NEXT_PUBLIC_QUBIC_QUERY_RPC_URL,
});
