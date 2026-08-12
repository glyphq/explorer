import {
  isIdentity,
  isTxHash,
  toIdentity,
  toTxHash,
  type Identity,
  type TxHash,
} from "@qubic.org/types";

import { ExplorerInputError } from "./errors";

const MAX_UINT32 = 0xffffffff;
const IDENTITY_HEAD_LENGTH = 8;
const IDENTITY_TAIL_LENGTH = 8;

declare const qubicTickBrand: unique symbol;
export type QubicTick = number & { readonly [qubicTickBrand]: "QubicTick" };

export function isValidIdentity(value: unknown): value is Identity {
  return typeof value === "string" && isIdentity(value);
}

export function normalizeIdentity(value: unknown): Identity | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  return isValidIdentity(normalized) ? normalized : null;
}

export function assertValidIdentity(value: unknown): Identity {
  const identity = normalizeIdentity(value);
  if (!identity) throw new ExplorerInputError("identity", "Invalid Qubic identity.");
  return toIdentity(identity);
}

export function isValidTransactionHash(value: unknown): value is TxHash {
  return typeof value === "string" && isTxHash(value);
}

export function normalizeTransactionHash(value: unknown): TxHash | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return isValidTransactionHash(normalized) ? normalized : null;
}

export function assertValidTransactionHash(value: unknown): TxHash {
  const hash = normalizeTransactionHash(value);
  if (!hash) throw new ExplorerInputError("transaction hash", "Invalid Qubic transaction hash.");
  return toTxHash(hash);
}

export function isValidTick(value: unknown): value is QubicTick {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= MAX_UINT32
  );
}

export function normalizeTick(value: unknown): QubicTick | null {
  if (typeof value === "number") return isValidTick(value) ? value : null;
  if (typeof value !== "string" || !/^\d+$/.test(value.trim())) return null;

  const parsed = Number(value.trim());
  return isValidTick(parsed) ? parsed : null;
}

export function assertValidTick(value: unknown): QubicTick {
  const tick = normalizeTick(value);
  if (tick === null) throw new ExplorerInputError("tick", "Invalid Qubic tick.");
  return tick;
}

export function isValidEpoch(value: unknown): value is number {
  return isValidTick(value);
}

export function assertValidEpoch(value: unknown): number {
  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    value = Number(value.trim());
  }
  if (!isValidEpoch(value)) throw new ExplorerInputError("epoch", "Invalid Qubic epoch.");
  return value;
}

export function isValidAssetIndex(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= MAX_UINT32
  );
}

export function normalizeAssetIndex(value: unknown): number | null {
  if (typeof value === "number") return isValidAssetIndex(value) ? value : null;
  if (typeof value !== "string" || !/^\d+$/.test(value.trim())) return null;

  const parsed = Number(value.trim());
  return isValidAssetIndex(parsed) ? parsed : null;
}

export function assertValidAssetIndex(value: unknown): number {
  const index = normalizeAssetIndex(value);
  if (index === null) throw new ExplorerInputError("asset index", "Invalid Qubic asset index.");
  return index;
}

export function formatIdentifier(value: string, head = 8, tail = 8): string {
  if (value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

export function formatIdentity(value: string): string {
  return formatIdentifier(value, IDENTITY_HEAD_LENGTH, IDENTITY_TAIL_LENGTH);
}

export function formatTransactionHash(value: string): string {
  return formatIdentifier(value, 10, 10);
}

export function formatTick(value: unknown): string {
  const tick = normalizeTick(value);
  return tick === null ? "—" : new Intl.NumberFormat("en-US").format(tick);
}

export function formatAtomicAmount(
  value: bigint | number | string,
  options: { decimals?: number; unit?: string } = {},
): string {
  const decimals = Math.max(0, Math.min(18, options.decimals ?? 0));
  let amount: bigint;
  try {
    amount = typeof value === "bigint" ? value : BigInt(value);
  } catch {
    return "—";
  }

  const zero = BigInt(0);
  const sign = amount < zero ? "-" : "";
  const absolute = amount < zero ? -amount : amount;
  const raw = absolute.toString().padStart(decimals + 1, "0");
  const whole = raw.slice(0, raw.length - decimals) || "0";
  const fraction = decimals > 0 ? raw.slice(-decimals).replace(/0+$/, "") : "";
  const formattedWhole = new Intl.NumberFormat("en-US").format(BigInt(whole));
  const formatted = fraction ? `${formattedWhole}.${fraction}` : formattedWhole;
  return `${sign}${formatted}${options.unit ? ` ${options.unit}` : ""}`;
}
