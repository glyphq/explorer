import {
  createEnvelope,
  createTransferRequest,
  GLYPH_MAINNET,
  launchGlyphRequest,
  prepareRelaySession,
  subscribeViaRelayV2,
  type GlyphCallbackResponse,
  type GlyphCallbackVerificationOptions,
  type GlyphNetworkBinding,
  type GlyphPreparedRelaySession,
  type GlyphRelayOptions,
  type GlyphRejectedCallback,
  type GlyphSignedTransferCallback,
  type GlyphTransferRequest,
} from "@glyph-oss/connect";
import { verify as verifySchnorrQ } from "@qubic.org/crypto";

export type GlyphTransferRecipientDraft = Readonly<Pick<GlyphTransferRequest, "type" | "to">>;

export const GLYPH_TRANSFER_UNAVAILABLE_REASON =
  "Glyph transfers require an HTTPS dApp origin and NEXT_PUBLIC_GLYPH_WALLET_CALLBACK_PUBLIC_KEY before signed callbacks can be trusted.";
export const GLYPH_TRANSFER_AMOUNT_REQUIRED_REASON =
  "@glyph-oss/connect@4.0.1 requires a positive transfer amount, so the Explorer cannot open a recipient-only Glyph Wallet screen with an empty amount.";

export type GlyphTransferState =
  | { status: "unavailable"; reason: string }
  | { status: "idle" }
  | { status: "preparing" }
  | { status: "ready" }
  | { status: "waiting" }
  | { status: "signed"; result: GlyphSignedTransferCallback }
  | { status: "rejected"; result: GlyphRejectedCallback }
  | { status: "failed"; error: string };

export type GlyphTransferOutcome = GlyphSignedTransferCallback | GlyphRejectedCallback;

export type GlyphTransferSignatureVerifier = NonNullable<
  GlyphCallbackVerificationOptions["verifySignature"]
>;

export type GlyphTransferConnectorDependencies = Readonly<{
  prepareRelaySession: typeof prepareRelaySession;
  subscribeViaRelayV2: typeof subscribeViaRelayV2;
  launchGlyphRequest: typeof launchGlyphRequest;
  verifySignature: GlyphTransferSignatureVerifier;
}>;

export type GlyphTransferClientOptions = Readonly<{
  recipient: string;
  dappOrigin: string;
  trustedPublicKeys: readonly string[];
  recipientOnly?: boolean;
  dappName?: string;
  network?: GlyphNetworkBinding;
  relayUrl?: string;
  timeoutMs?: number;
  dependencies?: Partial<GlyphTransferConnectorDependencies>;
}>;

export type GlyphTransferClient = Readonly<{
  getState: () => GlyphTransferState;
  subscribe: (listener: (state: GlyphTransferState) => void) => () => void;
  /** Explicitly prepares one ephemeral Relay session without opening Glyph. */
  prepare: () => Promise<GlyphPreparedRelaySession>;
  /** Must be called directly from a user activation after prepare() reaches ready. */
  launch: (amount: string) => Promise<GlyphTransferOutcome>;
  reset: () => void;
}>;

const defaultDependencies: GlyphTransferConnectorDependencies = {
  prepareRelaySession,
  subscribeViaRelayV2,
  launchGlyphRequest,
  verifySignature: (input) => verifySchnorrQ(input.payload, input.signature, input.publicKey),
};

function errorMessage(error: unknown): string {
  return error instanceof Error && error.message ? error.message : String(error);
}

function unavailableReason(options: GlyphTransferClientOptions): string | undefined {
  if (!options.dappOrigin.startsWith("https://")) {
    return GLYPH_TRANSFER_UNAVAILABLE_REASON;
  }
  if (options.trustedPublicKeys.length === 0) {
    return GLYPH_TRANSFER_UNAVAILABLE_REASON;
  }
  if (options.recipientOnly) {
    return GLYPH_TRANSFER_AMOUNT_REQUIRED_REASON;
  }
  return undefined;
}

function normalizeAmount(amount: string): string {
  const normalized = amount.trim();
  if (!/^\d+$/.test(normalized)) {
    throw new Error("Enter a positive whole-number QUBIC amount");
  }

  let parsed: bigint;
  try {
    parsed = BigInt(normalized);
  } catch {
    throw new Error("Enter a positive whole-number QUBIC amount");
  }

  if (parsed <= BigInt(0) || parsed > BigInt("9223372036854775807")) {
    throw new Error("Enter a positive whole-number QUBIC amount");
  }

  return parsed.toString();
}

export function createIdentityTransferDraft(identity: string): GlyphTransferRecipientDraft {
  const recipient = identity.trim();
  if (!recipient) throw new Error("A recipient identity is required for a Glyph transfer draft");

  return { to: recipient, type: "transfer" };
}

export function createGlyphTransferClient(
  options: GlyphTransferClientOptions,
): GlyphTransferClient {
  const draft = createIdentityTransferDraft(options.recipient);
  const dependencies = {
    ...defaultDependencies,
    ...options.dependencies,
  };
  const listeners = new Set<(state: GlyphTransferState) => void>();
  const unavailable = unavailableReason(options);
  let state: GlyphTransferState = unavailable
    ? { status: "unavailable", reason: unavailable }
    : { status: "idle" };
  let preparedSession: GlyphPreparedRelaySession | null = null;
  let preparation: Promise<GlyphPreparedRelaySession> | null = null;
  let inFlight: Promise<GlyphTransferOutcome> | null = null;

  const setState = (nextState: GlyphTransferState) => {
    state = nextState;
    for (const listener of listeners) listener(state);
  };

  const unavailableError = () => new Error(unavailable ?? GLYPH_TRANSFER_UNAVAILABLE_REASON);

  const prepare = (): Promise<GlyphPreparedRelaySession> => {
    if (unavailable) {
      return Promise.reject(unavailableError());
    }
    if (preparedSession) {
      setState({ status: "ready" });
      return Promise.resolve(preparedSession);
    }
    if (preparation) return preparation;

    setState({ status: "preparing" });
    preparation = dependencies
      .prepareRelaySession({}, options.relayUrl)
      .then((session) => {
        preparedSession = session;
        setState({ status: "ready" });
        return session;
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

  const launch = (amount: string): Promise<GlyphTransferOutcome> => {
    if (unavailable) {
      const error = unavailableError();
      setState({ status: "failed", error: error.message });
      return Promise.reject(error);
    }
    if (inFlight) return inFlight;

    let normalizedAmount: string;
    try {
      normalizedAmount = normalizeAmount(amount);
    } catch (error) {
      setState({ status: "failed", error: errorMessage(error) });
      return Promise.reject(error);
    }

    const relay = preparedSession;
    if (!relay) {
      const error = new Error(
        "Glyph Relay v2 is not prepared. Call prepare() before the user activation that calls launch().",
      );
      setState({ status: "failed", error: error.message });
      return Promise.reject(error);
    }

    let request: GlyphTransferRequest;
    let envelope;
    try {
      request = createTransferRequest({
        ...draft,
        amount: normalizedAmount,
        dapp: {
          name: options.dappName ?? "Glyph Explorer",
          origin: options.dappOrigin,
        },
      });
      envelope = createEnvelope(request, {
        callback: relay.callbackUrl,
        network: options.network ?? GLYPH_MAINNET,
      });
    } catch (error) {
      setState({ status: "failed", error: errorMessage(error) });
      return Promise.reject(error);
    }

    preparedSession = null;
    setState({ status: "waiting" });

    let resultPromise: Promise<GlyphCallbackResponse>;
    try {
      const network = options.network ?? GLYPH_MAINNET;
      const relayOptions: GlyphRelayOptions = {
        timeoutMs: options.timeoutMs,
        verification: {
          requireSigned: true,
          trustedPublicKeys: [...options.trustedPublicKeys],
          verifySignature: dependencies.verifySignature,
          expectedRequestHash: envelope.request_hash,
          expectedNetwork: network,
          expectedDappOrigin: options.dappOrigin,
          expectedExp: request.exp ?? null,
          expectedCallbackUrl: relay.callbackUrl,
          expected: { nonce: request.nonce, type: request.type },
        },
        onStatus: (status) => {
          if (status.state === "opening_wallet" || status.state === "awaiting_approval") {
            setState({ status: "waiting" });
          } else if (status.state === "failed") {
            setState({ status: "failed", error: errorMessage(status.error) });
          }
        },
      };
      resultPromise = dependencies.subscribeViaRelayV2(request, relay, relayOptions);

      // Keep this synchronous with launch() so the custom protocol retains user activation.
      dependencies.launchGlyphRequest(envelope);
    } catch (error) {
      setState({ status: "failed", error: errorMessage(error) });
      return Promise.reject(error);
    }

    inFlight = resultPromise
      .then((result) => {
        if (result.status === "signed" && result.type === "transfer") {
          setState({ status: "signed", result });
          return result;
        }
        if (result.status === "rejected" && result.type === "transfer") {
          setState({ status: "rejected", result });
          return result;
        }
        throw new Error("Glyph returned an unexpected transfer result");
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
      setState(unavailable ? { status: "unavailable", reason: unavailable } : { status: "idle" });
    },
  };
}

export type GlyphTransferPreparationState = GlyphTransferState;
export type GlyphTransferPreparationClient = GlyphTransferClient;
export type GlyphTransferPreparationOptions = GlyphTransferClientOptions;

/** @deprecated Use createGlyphTransferClient. */
export const createGlyphTransferPreparationClient = createGlyphTransferClient;
