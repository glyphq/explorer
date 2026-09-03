import {
  formatIdentity,
  formatTick,
  formatTransactionHash,
  normalizeAssetIndex,
  normalizeIdentity,
  normalizeTick,
  normalizeTransactionHash,
} from "@/lib/rpc/validation";

export type DirectQueryMatch =
  | { kind: "identity"; value: string; href: string }
  | { kind: "transaction"; value: string; href: string }
  | { kind: "tick"; value: number; href: string }
  | { kind: "token"; value: number; href: string }
;

export type QueryMatch =
  | { kind: "empty"; value: "" }
  | DirectQueryMatch
  | { kind: "invalid"; value: string };

export function classifyCommandQuery(input: string): QueryMatch {
  const value = input.trim();
  if (!value) return { kind: "empty", value: "" };

  const typedIndex = value.match(/^(?:\/?)((?:token|tokens|asset|assets|tick))\s*(?::|\/|\s)\s*(\d+)$/i);
  if (typedIndex) {
    const prefix = typedIndex[1].toLowerCase();
    const kind = prefix === "token" || prefix === "tokens" || prefix === "asset" || prefix === "assets"
      ? "token"
      : "tick";
    const index = kind === "tick" ? normalizeTick(typedIndex[2]) : normalizeAssetIndex(typedIndex[2]);
    if (index === null) return { kind: "invalid", value };

    return {
      kind,
      value: index,
      href: `/${kind === "token" ? "tokens" : "tick"}/${index}`,
    };
  }

  if (value === value.toUpperCase()) {
    const identity = normalizeIdentity(value);
    if (identity) {
      return {
        kind: "identity",
        value: identity,
        href: `/identity/${encodeURIComponent(identity)}`,
      };
    }
  }

  if (value === value.toLowerCase()) {
    const transactionHash = normalizeTransactionHash(value);
    if (transactionHash) {
      return {
        kind: "transaction",
        value: transactionHash,
        href: `/transaction/${encodeURIComponent(transactionHash)}`,
      };
    }
  }

  const tick = normalizeTick(value);
  if (tick !== null) {
    return {
      kind: "tick",
      value: tick,
      href: `/tick/${tick}`,
    };
  }

  return { kind: "invalid", value };
}

export type MatchCopy = {
  detail: string;
  label: string;
  context: string;
};

export function getMatchCopy(kind: DirectQueryMatch["kind"]): MatchCopy {
  if (kind === "identity") {
    return {
      detail: "60-character account ID",
      label: "Account",
      context: "Balance, assets, and activity",
    };
  }

  if (kind === "transaction") {
    return {
      detail: "60-character transaction ID",
      label: "Transaction",
      context: "When and where it was recorded",
    };
  }

  if (kind === "token") {
    return {
      detail: "Numeric universe index",
      label: "Token",
      context: "Token details and issuer",
    };
  }

  return {
    detail: "Network tick number",
    label: "Network tick",
    context: "Activity recorded at this point",
  };
}

export function formatMatchValue(match: DirectQueryMatch): string {
  if (match.kind === "identity") return formatIdentity(match.value);
  if (match.kind === "transaction") return formatTransactionHash(match.value);
  return formatTick(match.value);
}
