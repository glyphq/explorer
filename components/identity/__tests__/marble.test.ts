import { describe, expect, test } from "bun:test";

import { getWalletMarbleParts, walletMarbleHash } from "../marble";

const ALL_A_IDENTITY = "A".repeat(60);
const QUBIC_IDENTITY = "QUBIC".repeat(12);

describe("Wallet marble identity vectors", () => {
  test("matches boring-avatars' hash and transforms for an all-A identity", () => {
    expect(walletMarbleHash(ALL_A_IDENTITY)).toBe(335469504);
    expect(getWalletMarbleParts(ALL_A_IDENTITY)).toEqual([
      { color: "var(--glyph-canvas)", translateX: -14, translateY: 14, rotate: 264, isSquare: false },
      { color: "var(--glyph-surface-strong)", translateX: -14, translateY: -14, rotate: 168, isSquare: false },
      { color: "var(--glyph-line-strong)", translateX: 18, translateY: 18, rotate: 72, isSquare: false },
      { color: "var(--glyph-muted)", translateX: 16, translateY: -16, rotate: 336, isSquare: false },
    ]);
  });

  test("matches the square-band parity and transforms for a second fixed identity", () => {
    expect(walletMarbleHash(QUBIC_IDENTITY)).toBe(11211264);
    expect(getWalletMarbleParts(QUBIC_IDENTITY)).toEqual([
      { color: "var(--glyph-canvas)", translateX: -6, translateY: -6, rotate: 144, isSquare: true },
      { color: "var(--glyph-surface-strong)", translateX: -18, translateY: 18, rotate: 288, isSquare: true },
      { color: "var(--glyph-line-strong)", translateX: 3, translateY: 3, rotate: 72, isSquare: true },
      { color: "var(--glyph-muted)", translateX: 16, translateY: -16, rotate: 216, isSquare: true },
    ]);
  });

  test("is deterministic and keeps the Wallet four-layer shape", () => {
    const first = getWalletMarbleParts(ALL_A_IDENTITY);
    expect(getWalletMarbleParts(ALL_A_IDENTITY)).toEqual(first);
    expect(first).toHaveLength(4);
    expect(first.every((part) => Number.isFinite(part.translateX) && Number.isFinite(part.translateY))).toBe(true);
  });
});
