import { expect, test } from "bun:test";

import { createExplorerRpcAdapter } from "../adapter";
import { createExplorerRpcClients } from "../clients";

const REPORTED_TRANSACTION = "paissljworvkxgbwbwtscsylxcpglljzcxybowhyackeswdlpiatzmsbjelk";

test("adapts the official raw transaction response for the reported hash", async () => {
  const requests: Request[] = [];
  const clients = createExplorerRpcClients({
    fetch: async (request) => {
      requests.push(request);
      return new Response(
        JSON.stringify({
          hash: REPORTED_TRANSACTION,
          amount: "526091489",
          source: "MLABGELELEHTSGAVZVMTWEGARDGBSJXFLAQTAJWTXEKDUPAKSSLLNKDGPIUB",
          destination: "YLZOSUYQWLDIVDYDRNVOFZWHIZSBQOAQTXNZYNKLRDSOITRUYVRQKWWFLBIJ",
          tickNumber: 72242281,
          timestamp: "1786002167000",
          inputType: 0,
          inputSize: 0,
          inputData: "",
          signature: "oYwri82UYu8KRdriv0/Bdf4Kpvhu9hBR5lrVSdNxjy1+XlSFb2+yu18sby2MVLL7nCBTi5cgmp7b16RTWYYLAA==",
          moneyFlew: true,
        }),
        { headers: { "content-type": "application/json" }, status: 200 },
      );
    },
  });

  const transaction = await createExplorerRpcAdapter(clients).getTransactionByHash(REPORTED_TRANSACTION);

  expect(requests).toHaveLength(1);
  expect(requests[0]?.url).toBe("https://rpc.qubic.org/query/v1/getTransactionByHash");
  expect(transaction).toMatchObject({
    hash: REPORTED_TRANSACTION,
    amount: "526091489",
    tickNumber: 72242281,
  });
});

test("uses the official paginated issuance event and asset detail endpoints", async () => {
  const requests: Request[] = [];
  const clients = createExplorerRpcClients({
    fetch: async (request) => {
      requests.push(request);
      const url = new URL(request.url);

      if (url.pathname.endsWith("/getEventLogs")) {
        return new Response(
          JSON.stringify({
            eventLogs: [
              {
                epoch: 12,
                tickNumber: 345,
                transactionHash: "a".repeat(60),
                logId: "4",
                logType: 1,
                assetIssuance: {
                  assetIssuer: "A".repeat(60),
                  assetName: "QX",
                  numberOfShares: "1000",
                },
              },
            ],
            hits: { total: 31, from: 30, size: 1 },
            validForTick: 346,
          }),
          { headers: { "content-type": "application/json" }, status: 200 },
        );
      }

      if (url.pathname.endsWith("/assets/issuances/7")) {
        return new Response(
          JSON.stringify({
            data: { issuerIdentity: "A".repeat(60), name: "QX" },
            tick: 345,
            universeIndex: 7,
          }),
          { headers: { "content-type": "application/json" }, status: 200 },
        );
      }

      throw new Error(`Unexpected RPC request: ${request.url}`);
    },
  });

  const adapter = createExplorerRpcAdapter(clients);
  const events = await adapter.getAssetIssuanceEvents({ offset: 30, size: 2 });
  const issuance = await adapter.getAssetIssuanceByIndex(7);

  expect(requests).toHaveLength(2);
  expect(requests[0]?.method).toBe("POST");
  expect(requests[0]?.url).toBe("https://rpc.qubic.org/query/v1/getEventLogs");
  expect(await requests[0]?.json()).toEqual({
    filters: { logType: "1" },
    pagination: { offset: 30, size: 2 },
  });
  expect(requests[1]?.method).toBe("GET");
  expect(requests[1]?.url).toBe("https://rpc.qubic.org/live/v1/assets/issuances/7");
  expect(events).toMatchObject({
    requestedOffset: 30,
    requestedSize: 2,
    hits: { total: 31, from: 30, size: 1 },
  });
  expect(issuance).toMatchObject({ universeIndex: 7, data: { name: "QX" } });
});

test("rejects an invalid asset index before making an RPC request", async () => {
  const requests: Request[] = [];
  const clients = createExplorerRpcClients({
    fetch: async (request) => {
      requests.push(request);
      return new Response("unexpected", { status: 500 });
    },
  });

  await expect(
    Promise.resolve().then(() => createExplorerRpcAdapter(clients).getAssetIssuanceByIndex(-1)),
  ).rejects.toMatchObject({ field: "asset index" });
  expect(requests).toHaveLength(0);
});
