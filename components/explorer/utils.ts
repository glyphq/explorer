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

export function formatTimestamp(value: string | undefined): string {
  if (!value) return "Timestamp not reported";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Timestamp not reported";

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
