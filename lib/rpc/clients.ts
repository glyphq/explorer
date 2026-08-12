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
  const queryBaseUrl = publicBaseUrl(options.queryBaseUrl, DEFAULT_QUERY_RPC_URL);
  const upstreamFetch = options.fetch ?? ((input: Request) => fetch(input));

  // The official endpoint currently returns a transaction object directly,
  // while @qubic.org/rpc@1.0.0 still expects { transaction: object }.
  // Normalize only this successful official response before the SDK parses it.
  const queryFetch = async (input: Request): Promise<Response> => {
    const response = await upstreamFetch(input);
    const pathname = new URL(input.url).pathname;

    if (!response.ok || !pathname.endsWith("/getTransactionByHash")) return response;

    const payload: unknown = await response.json();
    if (
      !payload ||
      typeof payload !== "object" ||
      "transaction" in payload ||
      typeof (payload as { hash?: unknown }).hash !== "string"
    ) {
      return new Response(JSON.stringify(payload), {
        headers: { "content-type": "application/json" },
        status: response.status,
        statusText: response.statusText,
      });
    }

    return new Response(JSON.stringify({ transaction: payload }), {
      headers: { "content-type": "application/json" },
      status: response.status,
      statusText: response.statusText,
    });
  };

  return {
    live: createQubicLiveClient({
      baseUrl: publicBaseUrl(options.liveBaseUrl, DEFAULT_LIVE_RPC_URL),
      ...fetchOptions,
    }),
    query: createQubicQueryClient({
      baseUrl: queryBaseUrl,
      fetch: queryFetch,
    }),
  };
}

export const explorerRpc = createExplorerRpcClients({
  liveBaseUrl: process.env.NEXT_PUBLIC_QUBIC_LIVE_RPC_URL,
  queryBaseUrl: process.env.NEXT_PUBLIC_QUBIC_QUERY_RPC_URL,
});
