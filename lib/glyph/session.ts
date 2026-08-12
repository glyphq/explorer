import {
  canonicalDappOrigin,
  createConnectRequest,
  createEnvelope,
  GLYPH_MAINNET,
  launchGlyphRequest,
  prepareRelaySession,
  subscribeViaRelayV2,
  type GlyphCallbackResponse,
  type GlyphCallbackVerificationOptions,
  type GlyphConnectedCallback,
  type GlyphNetworkBinding,
  type GlyphPreparedRelaySession,
  type GlyphRejectedCallback,
  type GlyphRelayOptions,
} from "@glyph-oss/connect";

/**
 * This boundary intentionally has no built-in verifier. The installed SDK
 * validates the signed envelope and all protocol bindings, but it delegates
 * the final Qubic SchnorrQ check to the application.
 */
export const GLYPH_SIGN_IN_DISABLED_REASON =
  "Sign in with Glyph is disabled until an audited Qubic SchnorrQ verifier and trusted wallet callback public key are injected. This client does not implement cryptographic verification.";

export type GlyphSchnorrQVerifier = NonNullable<
  GlyphCallbackVerificationOptions["verifySignature"]
>;

export type GlyphSchnorrQCapability = Readonly<{
  trustedPublicKeys: readonly string[];
  verifySignature: GlyphSchnorrQVerifier;
}>;

export type GlyphSignInState =
  | { status: "disabled"; reason: string }
  | { status: "idle" }
  | { status: "preparing" }
  | { status: "ready" }
  | { status: "waiting" }
  | {
      status: "connected";
      identity: string;
      permissions: readonly string[];
    }
  | { status: "rejected"; reason: GlyphRejectedCallback["reason"] }
  | { status: "failed"; error: string };

export type GlyphSignInOutcome = GlyphConnectedCallback | GlyphRejectedCallback;

export type GlyphConnectorDependencies = Readonly<{
  prepareRelaySession: typeof prepareRelaySession;
  subscribeViaRelayV2: typeof subscribeViaRelayV2;
  launchGlyphRequest: typeof launchGlyphRequest;
}>;

export type GlyphSignInClientOptions = Readonly<{
  /** Credential-free HTTPS origin claimed by the dApp in signed results. */
  dappOrigin: string;
  dappName?: string;
  network?: GlyphNetworkBinding;
  relayUrl?: string;
  timeoutMs?: number;
  /** Omit this capability to keep Sign in with Glyph disabled. */
  verification?: GlyphSchnorrQCapability;
  dependencies?: Partial<GlyphConnectorDependencies>;
}>;

export type GlyphSignInClient = Readonly<{
  getState: () => GlyphSignInState;
  subscribe: (listener: (state: GlyphSignInState) => void) => () => void;
  /** Explicitly registers one ephemeral Relay v2 session. It never launches Glyph. */
  prepare: () => Promise<void>;
  /** Must be called directly by a user activation after prepare() reaches ready. */
  launch: () => Promise<GlyphSignInOutcome>;
  reset: () => void;
}>;

export function createGlyphSchnorrQCapability(input: {
  trustedPublicKeys: readonly string[];
  verifySignature: GlyphSchnorrQVerifier;
}): GlyphSchnorrQCapability {
  const trustedPublicKeys = [...input.trustedPublicKeys];
  if (trustedPublicKeys.length === 0 || trustedPublicKeys.some((key) => key.length === 0)) {
    throw new Error("At least one trusted Glyph wallet callback public key is required");
  }

  return Object.freeze({
    trustedPublicKeys: Object.freeze(trustedPublicKeys),
    verifySignature: input.verifySignature,
  });
}

const defaultDependencies: GlyphConnectorDependencies = {
  prepareRelaySession,
  subscribeViaRelayV2,
  launchGlyphRequest,
};

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return String(error);
}

function disabledError(): Error {
  return new Error(GLYPH_SIGN_IN_DISABLED_REASON);
}

function validateTimeout(timeoutMs: number | undefined): number | undefined {
  if (timeoutMs === undefined) {
    return undefined;
  }

  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error("Glyph sign-in timeoutMs must be a positive finite number");
  }

  return timeoutMs;
}

export function createGlyphSignInClient(
  options: GlyphSignInClientOptions,
): GlyphSignInClient {
  const dappOrigin = canonicalDappOrigin(options.dappOrigin);
  const network = options.network ?? GLYPH_MAINNET;
  const timeoutMs = validateTimeout(options.timeoutMs);
  const dependencies = {
    ...defaultDependencies,
    ...options.dependencies,
  };
  const verification = options.verification;
  const listeners = new Set<(state: GlyphSignInState) => void>();

  let state: GlyphSignInState = verification
    ? { status: "idle" }
    : { status: "disabled", reason: GLYPH_SIGN_IN_DISABLED_REASON };
  let preparedSession: GlyphPreparedRelaySession | null = null;
  let preparation: Promise<void> | null = null;
  let inFlight: Promise<GlyphSignInOutcome> | null = null;

  const setState = (nextState: GlyphSignInState) => {
    state = nextState;
    for (const listener of listeners) {
      listener(state);
    }
  };

  const prepare = (): Promise<void> => {
    if (!verification) {
      return Promise.reject(disabledError());
    }

    if (preparedSession) {
      setState({ status: "ready" });
      return Promise.resolve();
    }

    if (preparation) {
      return preparation;
    }

    setState({ status: "preparing" });
    preparation = dependencies
      .prepareRelaySession({}, options.relayUrl)
      .then((session) => {
        preparedSession = session;
        setState({ status: "ready" });
      })
      .catch((error: unknown) => {
        preparedSession = null;
        setState({ status: "failed", error: errorMessage(error) });
        throw error;
      })
      .finally(() => {
        preparation = null;
      });

    return preparation;
  };

  const launch = (): Promise<GlyphSignInOutcome> => {
    if (!verification) {
      return Promise.reject(disabledError());
    }

    if (inFlight) {
      return inFlight;
    }

    const relay = preparedSession;
    if (!relay) {
      const error = new Error(
        "Glyph Relay v2 is not prepared. Call prepare() before the user activation that calls launch().",
      );
      setState({ status: "failed", error: error.message });
      return Promise.reject(error);
    }

    preparedSession = null;

    let request;
    let envelope;
    try {
      request = createConnectRequest({
        type: "connect",
        dapp: {
          name: options.dappName ?? "Glyph Explorer",
          origin: dappOrigin,
        },
        // Sign-in requests intentionally request no wallet capabilities.
        permissions: [],
      });
      envelope = createEnvelope(request, {
        callback: relay.callbackUrl,
        network,
      });
    } catch (error) {
      setState({ status: "failed", error: errorMessage(error) });
      return Promise.reject(error);
    }

    const verificationOptions: GlyphCallbackVerificationOptions = {
      requireSigned: true,
      trustedPublicKeys: [...verification.trustedPublicKeys],
      verifySignature: verification.verifySignature,
      expectedRequestHash: envelope.request_hash,
      expectedNetwork: network,
      expectedDappOrigin: dappOrigin,
      expectedExp: request.exp ?? null,
      expectedCallbackUrl: relay.callbackUrl,
    };

    setState({ status: "waiting" });

    let resultPromise: Promise<GlyphCallbackResponse>;
    try {
      const relayOptions: GlyphRelayOptions = {
        timeoutMs,
        verification: verificationOptions,
        onStatus: (status) => {
          if (status.state === "opening_wallet" || status.state === "awaiting_approval") {
            setState({ status: "waiting" });
          } else if (status.state === "failed") {
            setState({ status: "failed", error: errorMessage(status.error) });
          }
        },
      };
      resultPromise = dependencies.subscribeViaRelayV2(request, relay, relayOptions);

      // This call must remain synchronous with launch(), which is intended to
      // be invoked from a trusted user activation after prepare() completes.
      dependencies.launchGlyphRequest(envelope);
    } catch (error) {
      setState({ status: "failed", error: errorMessage(error) });
      return Promise.reject(error);
    }

    inFlight = resultPromise
      .then((result) => {
        if (result.status === "connected" && result.type === "connect") {
          setState({
            status: "connected",
            identity: result.identity,
            permissions: [...result.permissions],
          });
          return result;
        }

        if (result.status === "rejected" && result.type === "connect") {
          setState({ status: "rejected", reason: result.reason });
          return result;
        }

        throw new Error("Glyph returned an unexpected sign-in result");
      })
      .catch((error: unknown) => {
        setState({ status: "failed", error: errorMessage(error) });
        throw error;
      })
      .finally(() => {
        inFlight = null;
      });

    return inFlight;
  };

  return {
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    prepare,
    launch,
    reset: () => {
      preparedSession = null;
      if (verification) {
        setState({ status: "idle" });
      } else {
        setState({ status: "disabled", reason: GLYPH_SIGN_IN_DISABLED_REASON });
      }
    },
  };
}
