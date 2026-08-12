import { describe, expect, test } from "bun:test";

import {
  formatAtomicAmount,
  formatIdentity,
  formatTick,
  formatTransactionHash,
  isValidAssetIndex,
  isValidIdentity,
  isValidTick,
  isValidTransactionHash,
  normalizeIdentity,
  normalizeAssetIndex,
  normalizeTick,
  normalizeTransactionHash,
} from "../validation";

const IDENTITY = "A".repeat(60);
const TRANSACTION_HASH = "a".repeat(60);

describe("Qubic input validation and formatting", () => {
  test("validates the structural identity and transaction hash shapes", () => {
    expect(isValidIdentity(IDENTITY)).toBe(true);
    expect(isValidIdentity(IDENTITY.toLowerCase())).toBe(false);
    expect(normalizeIdentity(IDENTITY.toLowerCase())?.toString()).toBe(IDENTITY);
    expect(isValidTransactionHash(TRANSACTION_HASH)).toBe(true);
    expect(isValidTransactionHash(TRANSACTION_HASH.toUpperCase())).toBe(false);
    expect(normalizeTransactionHash(TRANSACTION_HASH.toUpperCase())?.toString()).toBe(
      TRANSACTION_HASH,
    );
  });

  test("accepts uint32 tick inputs and rejects unsafe values", () => {
    expect(isValidTick(0)).toBe(true);
    expect(normalizeTick("4294967295") as number).toBe(4294967295);
    expect(normalizeTick("12.5")).toBeNull();
    expect(normalizeTick(4294967296)).toBeNull();
  });

  test("validates official asset universe indexes as uint32 values", () => {
    expect(isValidAssetIndex(0)).toBe(true);
    expect(normalizeAssetIndex("4294967295")).toBe(4294967295);
    expect(normalizeAssetIndex("12.5")).toBeNull();
    expect(normalizeAssetIndex(4294967296)).toBeNull();
  });

  test("formats explorer identifiers, ticks, and bigint amounts without precision loss", () => {
    expect(formatIdentity(IDENTITY)).toBe("AAAAAAAA…AAAAAAAA");
    expect(formatTransactionHash(TRANSACTION_HASH)).toBe("aaaaaaaaaa…aaaaaaaaaa");
    expect(formatTick("1234567")).toBe("1,234,567");
    expect(formatAtomicAmount(BigInt("1234567"), { decimals: 2, unit: "QU" })).toBe(
      "12,345.67 QU",
    );
  });
});
