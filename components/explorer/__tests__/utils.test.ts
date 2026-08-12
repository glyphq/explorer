import { describe, expect, test } from "bun:test";

import { ExplorerRpcError } from "@/lib/rpc/errors";
import { normalizeTransactionHash } from "@/lib/rpc/validation";
import { formatTimestamp, isMissingLookupResult, resolveExplorerLookup } from "../utils";

const IDENTITY = "A".repeat(60);
const LOWERCASE_AMBIGUOUS_IDENTIFIER = "a".repeat(60);
const REPORTED_TRANSACTION = "paissljworvkxgbwbwtscsylxcpglljzcxybowhyackeswdlpiatzmsbjelk";

describe("Explorer lookup helpers", () => {
  test("routes canonical identities, transaction hashes, and ticks", () => {
    expect(resolveExplorerLookup(IDENTITY)).toEqual({
      kind: "identity",
      value: IDENTITY,
      href: `/identity/${IDENTITY}`,
    });
    expect(resolveExplorerLookup(IDENTITY.toLowerCase())).toEqual({
      kind: "identity",
      value: IDENTITY,
      href: `/identity/${IDENTITY}`,
    });
    expect(resolveExplorerLookup(LOWERCASE_AMBIGUOUS_IDENTIFIER)).toEqual({
      kind: "identity",
      value: IDENTITY,
      href: `/identity/${IDENTITY}`,
    });
    expect(resolveExplorerLookup(" 123 ")).toEqual({
      kind: "tick",
      value: 123,
      href: "/tick/123",
    });
  });

  test("rejects values that are not supported lookup inputs", () => {
    expect(resolveExplorerLookup("not a lookup")).toBeNull();
    expect(resolveExplorerLookup("4294967296")).toBeNull();
  });

  test("keeps the reported identifier as its official transaction hash", () => {
    expect(normalizeTransactionHash(REPORTED_TRANSACTION)?.toString()).toBe(REPORTED_TRANSACTION);
  });

  test("classifies missing archive records separately from service errors", () => {
    expect(
      isMissingLookupResult(
        new ExplorerRpcError("missing transaction in response", {
          endpoint: "/query/v1/getTransactionByHash",
          kind: "invalid-response",
        }),
      ),
    ).toBe(true);
    expect(
      isMissingLookupResult(
        new ExplorerRpcError("RPC request timed out", {
          endpoint: "/query/v1/getTransactionByHash",
          kind: "timeout",
          retryable: true,
        }),
      ),
    ).toBe(false);
  });
});

describe("timestamp formatting", () => {
  const formatter = new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "medium",
  });

  test("formats numeric seconds and milliseconds reported by the archive", () => {
    const milliseconds = "1786530754000";
    const seconds = "1786530754";

    expect(formatTimestamp(milliseconds)).toBe(formatter.format(new Date(Number(milliseconds))));
    expect(formatTimestamp(seconds)).toBe(formatTimestamp(milliseconds));
  });

  test("keeps ISO timestamps on the normal date parsing path", () => {
    const iso = "2026-08-12T10:40:27.780Z";

    expect(formatTimestamp(iso)).toBe(formatter.format(new Date(iso)));
    expect(formatTimestamp("not-a-timestamp")).toBe("Timestamp not reported");
  });
});
