import { isExplorerRpcError } from "@/lib/rpc/errors";
import {
  normalizeIdentity,
  normalizeTick,
  normalizeTransactionHash,
  formatAtomicAmount,
  formatIdentifier,
} from "@/lib/rpc/validation";

export type ExplorerLookup =
  | { kind: "identity"; value: string; href: string }
  | { kind: "transaction"; value: string; href: string }
  | { kind: "tick"; value: number; href: string };

export function resolveExplorerLookup(value: string): ExplorerLookup | null {
  const identity = normalizeIdentity(value);
  if (identity) {
    return { kind: "identity", value: identity, href: `/identity/${identity}` };
  }

  const transactionHash = normalizeTransactionHash(value);
  if (transactionHash) {
    return {
      kind: "transaction",
      value: transactionHash,
      href: `/transaction/${transactionHash}`,
    };
  }

  const tick = normalizeTick(value);
  if (tick !== null) {
    return { kind: "tick", value: tick, href: `/tick/${tick}` };
  }

  return null;
}

export function formatNumber(value: number | undefined): string {
  return typeof value === "number" && Number.isFinite(value)
    ? new Intl.NumberFormat("en-US").format(value)
    : "—";
}

export function formatRawUnits(value: bigint | number | string | undefined): string {
  return value === undefined ? "—" : formatAtomicAmount(value);
}

export function formatMaybeIdentifier(value: string | undefined): string {
  return value ? formatIdentifier(value) : "—";
}

const NUMERIC_TIMESTAMP_PATTERN = /^-?\d+$/;
const MILLISECONDS_TIMESTAMP_THRESHOLD = BigInt(100_000_000_000);
const MAX_DATE_MILLISECONDS = BigInt(8_640_000_000_000_000);

function parseTimestamp(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (NUMERIC_TIMESTAMP_PATTERN.test(trimmed)) {
    let timestamp = BigInt(trimmed);
    if (timestamp < BigInt(0)) timestamp = -timestamp;

    const numericValue = BigInt(trimmed);
    const milliseconds =
      timestamp >= MILLISECONDS_TIMESTAMP_THRESHOLD ? numericValue : numericValue * BigInt(1000);

    if (milliseconds < -MAX_DATE_MILLISECONDS || milliseconds > MAX_DATE_MILLISECONDS) return null;
    const date = new Date(Number(milliseconds));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatTimestamp(value: string | undefined): string {
  if (!value) return "Timestamp not reported";
  const date = parseTimestamp(value);
  if (!date) return "Timestamp not reported";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(date);
}

export function formatRefreshTimestamp(value: number): string {
  if (!value) return "Not refreshed yet";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(new Date(value));
}

export function isMissingLookupResult(error: unknown): boolean {
  if (!isExplorerRpcError(error) || error.kind !== "invalid-response") return false;
  return /missing (?:transaction|tickdata) in response/i.test(error.message);
}

export function getRpcErrorLabel(error: unknown): string {
  if (isExplorerRpcError(error)) {
    if (error.kind === "network" || error.kind === "timeout") {
      return "The RPC service is unavailable right now.";
    }
    if (error.kind === "aborted") return "The request was cancelled.";
    if (error.kind === "invalid-response") {
      return "The RPC service returned an invalid response.";
    }
    return "The RPC service returned an error.";
  }

  return "The data service returned an unexpected error.";
}
