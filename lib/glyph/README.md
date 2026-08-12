# Optional Sign in with Glyph client

This module is intentionally disabled by default. It keeps Relay capabilities,
request nonces, and the connected identity in memory only. It does not use
`localStorage`, cookies, backend auth claims, wallet private keys, or automatic
connect/launch behavior.

## Required security dependency

`@glyph-oss/connect@4.0.1` performs strict request, nonce, type, network, origin,
request-hash, expiry, callback-binding, result-hash, and signed-envelope checks.
It intentionally delegates the final `qubic-schnorrq-sha256` signature check to
an injected verifier. This repository currently has no audited portable SchnorrQ
verifier dependency, so this module does not fake one. The capability remains
disabled until an audited Qubic SchnorrQ implementation and the trusted Glyph
wallet callback public key are supplied by the application owner.

The trusted callback public key is a public verification trust anchor. This
module never generates, stores, or persists private keys or relay capabilities.

## Integration contract

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
