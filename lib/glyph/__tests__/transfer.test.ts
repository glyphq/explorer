import { describe, expect, test } from "bun:test";

import { createIdentityTransferDraft } from "../transfer";

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
});
