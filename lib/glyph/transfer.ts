import {
  prepareRelaySession,
  type GlyphPreparedRelaySession,
  type GlyphTransferRequest,
} from "@glyph-oss/connect";

/**
 * A recipient-only transfer draft. Glyph requires a positive amount for a
 * launchable transfer request, so the explorer keeps this prefill separate and
 * does not invent or auto-fill an amount while transfer support is unavailable.
 */
export type GlyphTransferRecipientDraft = Readonly<Pick<GlyphTransferRequest, "type" | "to">>;

export const GLYPH_TRANSFER_UNAVAILABLE_REASON =
  "Glyph Wallet transfers are unavailable until the explorer has a verified transfer callback flow.";

export type GlyphTransferPreparationState =
  | { status: "idle" }
  | { status: "preparing" }
  | { status: "ready" }
  | { status: "failed"; error: string };

export type GlyphTransferPreparationClient = Readonly<{
  getState: () => GlyphTransferPreparationState;
  subscribe: (listener: (state: GlyphTransferPreparationState) => void) => () => void;
  /** Explicitly prepares one ephemeral Relay session without opening Glyph. */
  prepare: () => Promise<GlyphPreparedRelaySession>;
  reset: () => void;
}>;

export type GlyphTransferPreparationOptions = Readonly<{
  relayUrl?: string;
  dependencies?: Readonly<{
    prepareRelaySession: typeof prepareRelaySession;
  }>;
}>;

export function createIdentityTransferDraft(identity: string): GlyphTransferRecipientDraft {
  const recipient = identity.trim();
  if (!recipient) throw new Error("A recipient identity is required for a Glyph transfer draft");

  return { to: recipient, type: "transfer" };
}

function errorMessage(error: unknown): string {
  return error instanceof Error && error.message ? error.message : String(error);
}

export function createGlyphTransferPreparationClient(
  options: GlyphTransferPreparationOptions = {},
): GlyphTransferPreparationClient {
  const dependencies = {
    prepareRelaySession,
    ...options.dependencies,
  };
  const listeners = new Set<(state: GlyphTransferPreparationState) => void>();
  let state: GlyphTransferPreparationState = { status: "idle" };
  let preparedSession: GlyphPreparedRelaySession | null = null;
  let preparation: Promise<GlyphPreparedRelaySession> | null = null;

  const setState = (nextState: GlyphTransferPreparationState) => {
    state = nextState;
    for (const listener of listeners) listener(state);
  };

  const prepare = (): Promise<GlyphPreparedRelaySession> => {
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

  return {
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    prepare,
    reset: () => {
      preparedSession = null;
      setState({ status: "idle" });
    },
  };
}
