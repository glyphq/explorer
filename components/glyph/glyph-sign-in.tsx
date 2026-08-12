"use client";

import { useSyncExternalStore } from "react";

import { GlyphButton } from "@/components/ui/button";
import type { GlyphSignInClient, GlyphSignInState } from "@/lib/glyph";

export type GlyphSignInButtonProps = Readonly<{
  client: GlyphSignInClient;
  className?: string;
  prepareLabel?: string;
  launchLabel?: string;
}>;

function stateMessage(state: GlyphSignInState): string {
  switch (state.status) {
    case "disabled":
      return state.reason;
    case "idle":
      return "Sign in stays local to this browser. Prepare a one-use Relay session to continue.";
    case "preparing":
      return "Preparing a one-use Relay v2 session. Glyph will not open automatically.";
    case "ready":
      return "Relay ready. Click again to open Glyph Wallet from this user action.";
    case "waiting":
      return "Waiting for Glyph Wallet approval. No backend session has been created.";
    case "connected":
      return `Signed in locally as ${state.identity}.`;
    case "rejected":
      return "Glyph sign-in was rejected. No local session was created.";
    case "failed":
      return `Glyph sign-in failed: ${state.error}`;
  }
}

export function GlyphSignInButton({
  client,
  className,
  prepareLabel = "Prepare Glyph sign-in",
  launchLabel = "Open Glyph Wallet",
}: GlyphSignInButtonProps) {
  const state = useSyncExternalStore(client.subscribe, client.getState, client.getState);
  const isDisabled =
    state.status === "disabled" ||
    state.status === "preparing" ||
    state.status === "waiting" ||
    state.status === "connected";

  const handleClick = () => {
    if (state.status === "ready") {
      // launch() calls the SDK's anchor click synchronously. Keep this direct
      // event-handler call so browser user activation reaches Glyph Wallet.
      void client.launch().catch(() => undefined);
      return;
    }

    void client.prepare().catch(() => undefined);
  };

  const label = state.status === "ready" ? launchLabel : prepareLabel;

  return (
    <div className="glyph-sign-in" data-glyph-sign-in-state={state.status}>
      <GlyphButton
        aria-describedby="glyph-sign-in-status"
        aria-label={label}
        className={className}
        disabled={isDisabled}
        onClick={handleClick}
        size="sm"
      >
        {state.status === "waiting" ? "Waiting for Glyph…" : label}
      </GlyphButton>
      <p aria-live="polite" id="glyph-sign-in-status">
        {stateMessage(state)}
      </p>
    </div>
  );
}

export { stateMessage as getGlyphSignInStateMessage };
