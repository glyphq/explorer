# Optional Sign in with Glyph client

This module is intentionally disabled by default. It keeps Relay capabilities,
request nonces, and the connected identity in memory only. It does not use
`localStorage`, cookies, backend auth claims, wallet private keys, or automatic
connect/launch behavior.

## Required security dependency

`@glyph-oss/connect@4.0.1` performs strict request, nonce, type, network, origin,
request-hash, expiry, callback-binding, result-hash, and signed-envelope checks.
It intentionally delegates the final `qubic-schnorrq-sha256` signature check to
an injected verifier. The Explorer supplies that verifier from
`@qubic.org/crypto`, but still requires the trusted Glyph wallet callback public
key as a deployment trust anchor. It never trusts a callback merely because it
contains a public key.

The trusted callback public key is a public verification trust anchor. This
module never generates, stores, or persists private keys or relay capabilities.

## Identity transfer integration

The identity page keeps the current Send action unavailable rather than
fabricating a request the SDK rejects. The intended flow is a recipient-bound
`transfer` request opened by an explicit click, with the wallet asking for the
amount. The installed SDK has no amountless transfer request, so the identity
action reports that exact API limitation until a compatible `@glyph-oss/connect`
release or wallet request type exists.

The general `createGlyphTransferClient()` still constructs amountful transfer
requests with `createTransferRequest()`, prepares one ephemeral Relay v2 session,
launches `launchGlyphRequest()` synchronously from a user activation, and waits
for signed results, wallet rejection, Relay failures, and retryable preparation
failures.

Glyph's transfer schema requires a positive whole-number `amount`. An amountless
transfer request is rejected by the SDK, so the Explorer does not fabricate one
or silently choose a default. The deployment must provide:

- `NEXT_PUBLIC_GLYPH_WALLET_CALLBACK_PUBLIC_KEY` or a comma-separated
  `NEXT_PUBLIC_GLYPH_WALLET_CALLBACK_PUBLIC_KEYS` value containing the official
  wallet callback verification key.
- `NEXT_PUBLIC_GLYPH_DAPP_ORIGIN` when the canonical HTTPS origin cannot be
automatically derived.

Until those trust/configuration values exist, the action stays honest and reports
why signed transfer callbacks cannot be accepted.

## Sign in integration contract

```tsx
import { GlyphSignInButton } from "@/components/glyph";
import {
  createGlyphSchnorrQCapability,
  createGlyphSignInClient,
} from "@/lib/glyph";

const verifier = createGlyphSchnorrQCapability({
  trustedPublicKeys: [TRUSTED_GLYPH_WALLET_CALLBACK_PUBLIC_KEY],
  verifySignature: auditedSchnorrQVerifier,
});

const client = createGlyphSignInClient({
  dappOrigin: "https://explorer.example",
  verification: verifier,
});

<GlyphSignInButton client={client} />;
```

The control is deliberately two-step. The first explicit action calls
`client.prepare()`, which registers one ephemeral Relay v2 session but never
opens Glyph. After `ready`, the second click calls `client.launch()` directly
from the browser event handler. That method starts `subscribeViaRelayV2()` with
`requireSigned: true`, a trusted public-key allowlist, and all expected request
bindings before synchronously calling `launchGlyphRequest()`.

`wallet-button.tsx` can later consume the same API without changing this module:
prepare the client from an explicit UI action, then pass `() => void
client.launch()` as its existing `onConnect` callback once the client reports
`ready`. The client exposes `waiting`, `rejected`, and `failed` states for the
shell to render.

A connected identity is local in-memory UI state only. Call `client.reset()` to
clear it and discard any prepared session. No relay capability is returned from
or exposed through the public state API.
