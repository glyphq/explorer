import { describe, expect, test } from "bun:test";
import {
  createTransferRequest,
} from "@glyph-oss/connect";
import type {
  GlyphCallbackResponse,
  GlyphEnvelope,
  GlyphPreparedRelaySession,
  GlyphRelayOptions,
  GlyphRequest,
} from "@glyph-oss/connect";

import {
  createGlyphTransferClient,
  createIdentityTransferDraft,
  GLYPH_TRANSFER_AMOUNT_REQUIRED_REASON,
  GLYPH_TRANSFER_UNAVAILABLE_REASON,
} from "../transfer";

const PREPARED_RELAY = {
  registered: true,
  session: "s".repeat(22),
  callbackCap: `c_${"c".repeat(22)}`,
  readCap: `r_${"r".repeat(22)}`,
  registerUrl: "https://relay.glyphq.org/v2/register/session",
  callbackUrl: `https://relay.glyphq.org/v2/callback/${"s".repeat(22)}/c_${"c".repeat(22)}`,
  streamUrl: `https://relay.glyphq.org/v2/stream/${"s".repeat(22)}/r_${"r".repeat(22)}`,
  resultUrl: `https://relay.glyphq.org/v2/result/${"s".repeat(22)}/r_${"r".repeat(22)}`,
} as unknown as GlyphPreparedRelaySession;

function createTestClient(overrides: {
  prepare?: () => Promise<GlyphPreparedRelaySession>;
  subscribe?: (request: GlyphRequest, options: GlyphRelayOptions | undefined) => Promise<GlyphCallbackResponse>;
  launch?: (envelope: GlyphEnvelope) => string;
} = {}) {
  let launchCount = 0;
  let capturedEnvelope: GlyphEnvelope | undefined;
  let capturedRequest: GlyphRequest | undefined;
  const client = createGlyphTransferClient({
    dappOrigin: "https://explorer.example",
    recipient: "RECIPIENT",
    trustedPublicKeys: ["trusted-public-key"],
    dependencies: {
      prepareRelaySession: async () => overrides.prepare ? overrides.prepare() : PREPARED_RELAY,
      subscribeViaRelayV2: (subscription, _session, options) => {
        if (typeof subscription === "string" || !("dapp" in subscription)) {
          throw new Error("Expected a full Glyph transfer request");
        }
        capturedRequest = subscription;
        return overrides.subscribe
          ? overrides.subscribe(subscription, options)
          : Promise.resolve({
              status: "signed",
              type: "transfer",
              nonce: subscription.nonce,
              identity: "SENDER",
              tx_hash: "TX_HASH",
              target_tick: 42,
            });
      },
      launchGlyphRequest: (envelope) => {
        launchCount += 1;
        capturedEnvelope = envelope;
        return overrides.launch ? overrides.launch(envelope) : "glyph://v2/request";
      },
      verifySignature: () => true,
    },
  });

  return {
    client,
    getCapturedEnvelope: () => capturedEnvelope,
    getCapturedRequest: () => capturedRequest,
    getLaunchCount: () => launchCount,
  };
}

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

  test("confirms the installed SDK rejects a recipient-only transfer payload", () => {
    const amountlessRequest = {
      dapp: { name: "Glyph Explorer", origin: "https://explorer.example" },
      to: "RECIPIENT",
      type: "transfer",
    } as unknown as Parameters<typeof createTransferRequest>[0];

    expect(() => createTransferRequest(amountlessRequest)).toThrow("transfer: 'amount' must be an integer");

    expect(() => createTransferRequest({ ...amountlessRequest, amount: 0 })).toThrow("transfer: 'amount' must be positive");
  });

  test("prepares only after explicit invocation and exposes retryable failure state", async () => {
    let prepareCount = 0;
    const client = createGlyphTransferClient({
      dappOrigin: "https://explorer.example",
      recipient: "RECIPIENT",
      trustedPublicKeys: ["trusted-public-key"],
      dependencies: {
        prepareRelaySession: async () => {
          prepareCount += 1;
          if (prepareCount === 1) throw new Error("relay unavailable");
          return PREPARED_RELAY;
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

  test("stays unavailable without the trusted callback key instead of faking verification", async () => {
    const client = createGlyphTransferClient({
      dappOrigin: "https://explorer.example",
      recipient: "RECIPIENT",
      trustedPublicKeys: [],
    });

    expect(client.getState()).toEqual({ status: "unavailable", reason: GLYPH_TRANSFER_UNAVAILABLE_REASON });
    await expect(client.prepare()).rejects.toThrow(GLYPH_TRANSFER_UNAVAILABLE_REASON);
  });

  test("keeps the identity action unavailable when only a recipient is requested", async () => {
    const client = createGlyphTransferClient({
      dappOrigin: "https://explorer.example",
      recipient: "RECIPIENT",
      recipientOnly: true,
      trustedPublicKeys: ["trusted-public-key"],
    });

    expect(client.getState()).toEqual({ status: "unavailable", reason: GLYPH_TRANSFER_AMOUNT_REQUIRED_REASON });
    await expect(client.prepare()).rejects.toThrow(GLYPH_TRANSFER_AMOUNT_REQUIRED_REASON);
  });

  test("launches the signed transfer synchronously after preparation with the bound recipient and entered amount", async () => {
    const harness = createTestClient();
    await harness.client.prepare();

    const resultPromise = harness.client.launch("123");
    expect(harness.getLaunchCount()).toBe(1);
    expect(harness.getCapturedRequest()).toMatchObject({
      amount: "123",
      to: "RECIPIENT",
      type: "transfer",
    });
    expect(harness.getCapturedEnvelope()?.callback).toBe(PREPARED_RELAY.callbackUrl);
    await expect(resultPromise).resolves.toMatchObject({ status: "signed", type: "transfer" });
    expect(harness.client.getState()).toMatchObject({ status: "signed" });
  });

  test("does not launch without an explicit positive amount", async () => {
    const harness = createTestClient();
    await harness.client.prepare();

    await expect(harness.client.launch("")).rejects.toThrow("positive whole-number");
    expect(harness.getLaunchCount()).toBe(0);
  });

  test("surfaces wallet rejection as a distinct outcome", async () => {
    const harness = createTestClient({
      subscribe: async (request) => ({
        status: "rejected",
        type: "transfer",
        nonce: request.nonce,
        reason: "user_rejected",
      }),
    });
    await harness.client.prepare();

    await expect(harness.client.launch("1")).resolves.toMatchObject({
      reason: "user_rejected",
      status: "rejected",
    });
    expect(harness.client.getState()).toMatchObject({ status: "rejected" });
  });
});
