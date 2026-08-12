import { expect, test } from "bun:test";

import { createExplorerRpcAdapter } from "../adapter";
import { createExplorerRpcClients } from "../clients";

const TICK = 73839714;
const ENDPOINT = "/query/v1/getTransactionsForTick";
const TRANSACTION = {
  hash: "a".repeat(60),
  amount: "526091489",
  source: "B".repeat(60),
  destination: "C".repeat(60),
  tickNumber: TICK,
  timestamp: "1786530754000",
  inputType: 0,
};

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    headers: { "content-type": "application/json" },
    status,
  });
}

test("accepts the official raw array response for transactions in a tick", async () => {
  const requests: Request[] = [];
  const clients = createExplorerRpcClients({
    fetch: async (request) => {
      requests.push(request);
      return jsonResponse([TRANSACTION]);
    },
  });

  const transactions = await createExplorerRpcAdapter(clients).getTransactionsForTick(TICK);

  expect(requests).toHaveLength(1);
  expect(requests[0]?.url).toBe(`https://rpc.qubic.org${ENDPOINT}`);
  expect(JSON.parse(await requests[0]!.text())).toEqual({ tickNumber: TICK });
  expect(transactions).toEqual([TRANSACTION]);
});

test("retains the documented transactions envelope response", async () => {
  const clients = createExplorerRpcClients({
    fetch: async () => jsonResponse({ transactions: [TRANSACTION] }),
  });

  await expect(createExplorerRpcAdapter(clients).getTransactionsForTick(TICK)).resolves.toEqual([TRANSACTION]);
});

test("keeps empty raw and envelope responses as successful no-result arrays", async () => {
  for (const payload of [[], { transactions: [] }]) {
    const clients = createExplorerRpcClients({
      fetch: async () => jsonResponse(payload),
    });

    await expect(createExplorerRpcAdapter(clients).getTransactionsForTick(TICK)).resolves.toEqual([]);
  }
});

test("preserves upstream errors for transactions in a tick", async () => {
  const clients = createExplorerRpcClients({
    fetch: async () => jsonResponse({ message: "archive unavailable" }, 503),
  });

  await expect(createExplorerRpcAdapter(clients).getTransactionsForTick(TICK)).rejects.toMatchObject({
    kind: "http",
    endpoint: ENDPOINT,
    status: 503,
  });
});

test("propagates caller aborts through the transactions-for-tick compatibility layer", async () => {
  const controller = new AbortController();
  let requestSignal: AbortSignal | undefined;
  const clients = createExplorerRpcClients({
    fetch: async (request) => {
      requestSignal = request.signal;
      return new Promise<never>((_, reject) => {
        const abort = () => reject(new DOMException("Aborted", "AbortError"));
        if (request.signal.aborted) {
          abort();
          return;
        }
        request.signal.addEventListener("abort", abort, { once: true });
      });
    },
  });

  const promise = createExplorerRpcAdapter(clients).getTransactionsForTick(TICK, { signal: controller.signal });
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  controller.abort();

  await expect(promise).rejects.toMatchObject({
    kind: "aborted",
    endpoint: ENDPOINT,
  });
  expect(requestSignal?.aborted).toBe(true);
});
