import { expect, test } from "bun:test";

import {
  classifyCommandQuery,
  getMatchCopy,
  getNavigationCommands,
  rememberRecentLookup,
  type DirectQueryMatch,
} from "@/components/shell/command-search";

const identity = "A".repeat(60);
const transaction = "a".repeat(60);

function direct(input: string): DirectQueryMatch {
  const match = classifyCommandQuery(input);
  if (match.kind === "empty" || match.kind === "invalid" || match.kind === "ambiguous") {
    throw new Error(`Expected a direct match for ${input}`);
  }
  return match;
}

test("command lookup classifies the supported typed route shapes", () => {
  expect(classifyCommandQuery(identity)).toEqual({
    kind: "identity",
    value: identity,
    href: `/identity/${identity}`,
  });
  expect(classifyCommandQuery(transaction)).toEqual({
    kind: "ambiguous",
    value: transaction,
    matches: [
      { kind: "identity", value: identity, href: `/identity/${identity}` },
      { kind: "transaction", value: transaction, href: `/transaction/${transaction}` },
    ],
  });
  expect(classifyCommandQuery("4294967295")).toEqual({
    kind: "tick",
    value: 4294967295,
    href: "/tick/4294967295",
  });
  expect(classifyCommandQuery("token:00035")).toEqual({
    kind: "token",
    value: 35,
    href: "/tokens/35",
  });
  expect(classifyCommandQuery("/contracts/9")).toEqual({
    kind: "contract",
    value: 9,
    href: "/contracts/9",
  });
});

test("command lookup rejects near misses instead of guessing a route", () => {
  expect(classifyCommandQuery("A".repeat(59)).kind).toBe("invalid");
  expect(classifyCommandQuery("A".repeat(61)).kind).toBe("invalid");
  expect(classifyCommandQuery("G".repeat(60).toLowerCase()).kind).toBe("ambiguous");
  expect(classifyCommandQuery(transaction.toUpperCase()).kind).toBe("identity");
  expect(classifyCommandQuery("a".repeat(59)).kind).toBe("invalid");
  expect(classifyCommandQuery("4294967296").kind).toBe("invalid");
  expect(classifyCommandQuery("token:4294967296").kind).toBe("invalid");
  expect(classifyCommandQuery("contract:nope").kind).toBe("invalid");
  expect(classifyCommandQuery("12.5").kind).toBe("invalid");
  expect(classifyCommandQuery(" ").kind).toBe("empty");
});

test("quick routes stay backed by the overview, tokens, contracts, and rich-list destinations", () => {
  expect(getNavigationCommands(""))
    .toEqual([
      expect.objectContaining({ id: "overview", href: "/" }),
      expect.objectContaining({ id: "tokens", href: "/tokens" }),
      expect.objectContaining({ id: "contracts", href: "/contracts" }),
      expect.objectContaining({ id: "rich-list", href: "/rich-list" }),
    ]);
  expect(getNavigationCommands("assets")).toEqual([
    expect.objectContaining({ id: "tokens", href: "/tokens" }),
  ]);
  expect(getNavigationCommands("contracts")).toEqual([
    expect.objectContaining({ id: "contracts", href: "/contracts" }),
  ]);
  expect(getNavigationCommands("balances")).toEqual([
    expect.objectContaining({ id: "rich-list", href: "/rich-list" }),
  ]);
});

test("typed result copy points to the data journeys already on detail routes", () => {
  expect(getMatchCopy("identity")).toEqual(expect.objectContaining({
    label: "Identity",
    context: "Assets and transaction history",
  }));
  expect(getMatchCopy("transaction")).toEqual(expect.objectContaining({
    label: "Transaction",
    context: "Tick and contract metadata",
  }));
  expect(getMatchCopy("tick")).toEqual(expect.objectContaining({
    label: "Tick",
    context: "Transactions for this tick",
  }));
  expect(getMatchCopy("token")).toEqual(expect.objectContaining({
    label: "Token",
    context: "Asset issuance details",
  }));
  expect(getMatchCopy("contract")).toEqual(expect.objectContaining({
    label: "Contract",
    context: "Published contract metadata",
  }));
});

test("recent lookups stay bounded, newest first, and deduplicated", () => {
  const first = direct(identity);
  const second: DirectQueryMatch = {
    kind: "transaction",
    value: transaction,
    href: `/transaction/${transaction}`,
  };
  const third = direct("12");
  const fourth = direct("13");

  const recent = rememberRecentLookup(
    rememberRecentLookup(
      rememberRecentLookup([first], second),
      third,
    ),
    fourth,
  );

  expect(recent).toEqual([fourth, third, second]);
  expect(rememberRecentLookup(recent, first)).toEqual([first, fourth, third]);
  expect(rememberRecentLookup(recent, second)).toEqual([second, fourth, third]);
});
