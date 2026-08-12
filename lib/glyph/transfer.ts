import type { GlyphTransferRequest } from "@glyph-oss/connect";

/**
 * A recipient-only transfer draft. Glyph requires a positive amount for a
 * launchable transfer request, so the explorer keeps this prefill separate and
 * does not invent or auto-fill an amount while transfer support is unavailable.
 */
export type GlyphTransferRecipientDraft = Readonly<Pick<GlyphTransferRequest, "type" | "to">>;

export const GLYPH_TRANSFER_UNAVAILABLE_REASON =
  "Glyph Wallet transfers are unavailable until the explorer has a verified transfer callback flow.";

export function createIdentityTransferDraft(identity: string): GlyphTransferRecipientDraft {
  const recipient = identity.trim();
  if (!recipient) throw new Error("A recipient identity is required for a Glyph transfer draft");

  return { to: recipient, type: "transfer" };
}
