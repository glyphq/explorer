/**
 * The Wallet renders identity badges with boring-avatars@2.0.4's marble
 * variant. Keep this implementation aligned with that package's generator so
 * an identity produces the same geometry in both products.
 */

export const MARBLE_VIEWBOX = 80;

/** Explorer's monochrome palette, in the same six-color shape slots as Wallet. */
export const MONOCHROME_MARBLE_COLORS = [
  "var(--glyph-canvas)",
  "var(--glyph-surface-strong)",
  "var(--glyph-line-strong)",
  "var(--glyph-muted)",
  "var(--glyph-tertiary)",
  "var(--glyph-ink)",
] as const;

export interface MarblePart {
  color: string;
  translateX: number;
  translateY: number;
  rotate: number;
  isSquare: boolean;
}

/** The 32-bit signed string hash used by boring-avatars. */
export function walletMarbleHash(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function digitAt(value: number, position: number): number {
  return Math.floor(value / 10 ** position) % 10;
}

function isEvenDigit(value: number, position: number): boolean {
  return digitAt(value, position) % 2 === 0;
}

function signedRemainder(value: number, modulus: number, digitPosition?: number): number {
  const remainder = value % modulus;
  return digitPosition !== undefined && isEvenDigit(value, digitPosition) ? -remainder : remainder;
}

function colorAt(colors: readonly string[], index: number): string {
  return colors[index % colors.length] ?? "";
}

/**
 * Generate the marble parts used by Wallet's identicon renderer.
 *
 * The arithmetic and part order intentionally mirror boring-avatars' source:
 * four layers, 80-unit geometry, and `square=false`'s parity-controlled band.
 */
export function getWalletMarbleParts(
  name: string,
  colors: readonly string[] = MONOCHROME_MARBLE_COLORS,
): MarblePart[] {
  const hash = walletMarbleHash(name);

  return Array.from({ length: 4 }, (_, index) => ({
    color: colorAt(colors, hash + index),
    translateX: signedRemainder(hash * (index + 1), MARBLE_VIEWBOX / 2 - (index + 17), 1),
    translateY: signedRemainder(hash * (index + 1), MARBLE_VIEWBOX / 2 - (index + 17), 2),
    rotate: signedRemainder(hash * (index + 1), 360),
    isSquare: isEvenDigit(hash, 2),
  }));
}
