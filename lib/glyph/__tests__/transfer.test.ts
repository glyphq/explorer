import { describe, expect, test } from "bun:test";

import {
  createGlyphTransferPreparationClient,
  createIdentityTransferDraft,
} from "../transfer";

describe("Glyph identity transfer draft", () => {
  test("binds the identity as the recipient without inventing an amount", () => {
    expect(createIdentityTransferDraft("  AAAAA  ")).toEqual({
      to: "AAAAA",
      type: "transfer",
    });
  });

  test("rejects an empty recipient", () => {
    expect(() => createIdentityTransferDraft("  ")).toThrow("recipient identity");
  });

  test("prepares only after explicit invocation and exposes retryable failure state", async () => {
    let prepareCount = 0;
    const client = createGlyphTransferPreparationClient({
      dependencies: {
        prepareRelaySession: async () => {
          prepareCount += 1;
          if (prepareCount === 1) throw new Error("relay unavailable");
          return { registered: true } as never;
        },
      },
    });

    expect(client.getState()).toEqual({ status: "idle" });
    expect(prepareCount).toBe(0);
    await expect(client.prepare()).rejects.toThrow("relay unavailable");
    expect(client.getState()).toEqual({ status: "failed", error: "relay unavailable" });
    await expect(client.prepare()).resolves.toMatchObject({ registered: true });
    expect(client.getState()).toEqual({ status: "ready" });
    expect(prepareCount).toBe(2);
  });
});
