import { describe, expect, test } from "bun:test";

import type {
  GlyphCallbackResponse,
  GlyphPreparedRelaySession,
  GlyphRelayOptions,
} from "@glyph-oss/connect";

import {
  createGlyphSchnorrQCapability,
  createGlyphSignInClient,
  GLYPH_SIGN_IN_DISABLED_REASON,
} from "../session";

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

const verification = createGlyphSchnorrQCapability({
  trustedPublicKeys: ["trusted-public-key"],
  // Test-only stand-in. Production code must inject an audited SchnorrQ verifier.
  verifySignature: () => true,
});

function createClient(overrides: {
  prepare?: () => Promise<GlyphPreparedRelaySession>;
  subscribe?: (
    options: GlyphRelayOptions,
    resolve: (result: GlyphCallbackResponse) => void,
    reject: (error: Error) => void,
  ) => Promise<GlyphCallbackResponse>;
  launch?: () => string;
} = {}) {
  let lastRequestNonce = "";
  let launchCount = 0;
  let subscribeCount = 0;
  let capturedOptions: GlyphRelayOptions | undefined;

  const client = createGlyphSignInClient({
    dappOrigin: "https://explorer.example",
    verification,
    dependencies: {
      prepareRelaySession: async () =>
        overrides.prepare ? overrides.prepare() : PREPARED_RELAY,
      subscribeViaRelayV2: (request, _session, options) => {
        if (typeof request !== "string" && "nonce" in request) {
          lastRequestNonce = request.nonce;
        }
        subscribeCount += 1;
        const relayOptions = options ?? {};
        capturedOptions = relayOptions;
        if (overrides.subscribe) {
          return overrides.subscribe(
            relayOptions,
            () => undefined,
            () => undefined,
          );
        }
        return new Promise<GlyphCallbackResponse>(() => undefined);
      },
      launchGlyphRequest: () => {
        launchCount += 1;
        return overrides.launch ? overrides.launch() : "glyph://v2/request";
      },
    },
  });

  return {
    client,
    getLastRequestNonce: () => lastRequestNonce,
    getLaunchCount: () => launchCount,
    getSubscribeCount: () => subscribeCount,
    getCapturedOptions: () => capturedOptions,
  };
}

describe("local Glyph sign-in client", () => {
  test("stays disabled and does not prepare or launch without verification", async () => {
    let prepareCount = 0;
    let launchCount = 0;
    const client = createGlyphSignInClient({
      dappOrigin: "https://explorer.example",
      dependencies: {
        prepareRelaySession: async () => {
          prepareCount += 1;
          return PREPARED_RELAY;
        },
        launchGlyphRequest: () => {
          launchCount += 1;
          return "glyph://v2/request";
        },
      },
    });

    expect(client.getState()).toEqual({
      status: "disabled",
      reason: GLYPH_SIGN_IN_DISABLED_REASON,
    });
    await expect(client.prepare()).rejects.toThrow(GLYPH_SIGN_IN_DISABLED_REASON);
    await expect(client.launch()).rejects.toThrow(GLYPH_SIGN_IN_DISABLED_REASON);
    expect(prepareCount).toBe(0);
    expect(launchCount).toBe(0);
  });

  test("does not auto-launch, then launches only after explicit preparation", async () => {
    let resolveRelay: ((result: GlyphCallbackResponse) => void) | undefined;
    const harness = createClient({
      subscribe: () =>
        new Promise<GlyphCallbackResponse>((resolve) => {
          resolveRelay = resolve;
        }),
    });

    expect(harness.getLaunchCount()).toBe(0);
    expect(harness.getSubscribeCount()).toBe(0);
    expect(harness.client.getState()).toEqual({ status: "idle" });

    await harness.client.prepare();
    expect(harness.client.getState()).toEqual({ status: "ready" });
    expect(harness.getLaunchCount()).toBe(0);
    expect(harness.getSubscribeCount()).toBe(0);

    const resultPromise = harness.client.launch();
    expect(harness.getSubscribeCount()).toBe(1);
    expect(harness.getLaunchCount()).toBe(1);
    expect(harness.client.getState()).toEqual({ status: "waiting" });

    const options = harness.getCapturedOptions();
    expect(options?.verification).toMatchObject({
      requireSigned: true,
      trustedPublicKeys: ["trusted-public-key"],
      expectedDappOrigin: "https://explorer.example",
      expectedCallbackUrl: PREPARED_RELAY.callbackUrl,
    });

    resolveRelay?.({
      status: "connected",
      type: "connect",
      nonce: harness.getLastRequestNonce(),
      identity: "A".repeat(60),
      permissions: [],
    });

    await expect(resultPromise).resolves.toMatchObject({
      status: "connected",
      identity: "A".repeat(60),
    });
    expect(harness.client.getState()).toMatchObject({
      status: "connected",
      identity: "A".repeat(60),
    });
  });

  test("surfaces user rejection without treating it as a cryptographic failure", async () => {
    let resolveRelay: ((result: GlyphCallbackResponse) => void) | undefined;
    const harness = createClient({
      subscribe: () =>
        new Promise<GlyphCallbackResponse>((resolve) => {
          resolveRelay = resolve;
        }),
    });

    await harness.client.prepare();
    const resultPromise = harness.client.launch();
    resolveRelay?.({
      status: "rejected",
      type: "connect",
      nonce: harness.getLastRequestNonce(),
      reason: "user_rejected",
    });

    await expect(resultPromise).resolves.toMatchObject({
      status: "rejected",
      reason: "user_rejected",
    });
    expect(harness.client.getState()).toEqual({
      status: "rejected",
      reason: "user_rejected",
    });
  });

  test("surfaces Relay failures and does not relaunch automatically", async () => {
    const harness = createClient({
      subscribe: async () => {
        throw new Error("relay unavailable");
      },
    });

    await harness.client.prepare();
    await expect(harness.client.launch()).rejects.toThrow("relay unavailable");
    expect(harness.client.getState()).toEqual({
      status: "failed",
      error: "relay unavailable",
    });
    expect(harness.getLaunchCount()).toBe(1);

    await expect(harness.client.launch()).rejects.toThrow(
      "Glyph Relay v2 is not prepared",
    );
    expect(harness.getLaunchCount()).toBe(1);
  });

  test("surfaces preparation failures", async () => {
    const harness = createClient({
      prepare: async () => {
        throw new Error("registration failed");
      },
    });

    await expect(harness.client.prepare()).rejects.toThrow("registration failed");
    expect(harness.client.getState()).toEqual({
      status: "failed",
      error: "registration failed",
    });
  });
});
