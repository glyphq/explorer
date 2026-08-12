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
