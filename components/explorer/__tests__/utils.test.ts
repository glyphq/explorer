import { describe, expect, test } from "bun:test";

import { ExplorerRpcError } from "@/lib/rpc/errors";
import { resolveExplorerLookup, isMissingLookupResult } from "../utils";

const IDENTITY = "A".repeat(60);
const LOWERCASE_AMBIGUOUS_IDENTIFIER = "a".repeat(60);

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
