import { expect, test } from "bun:test";

import {
  classifyCommandQuery,
  rememberRecentLookup,
  type DirectQueryMatch,
} from "@/components/shell/command-search";

const identity = "A".repeat(60);
const transaction = "0123456789abcdef".repeat(3) + "0123456789ab";

function direct(input: string): DirectQueryMatch {
  const match = classifyCommandQuery(input);
  if (match.kind === "empty" || match.kind === "invalid") {
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
    kind: "transaction",
    value: transaction,
    href: `/transaction/${transaction}`,
  });
  expect(classifyCommandQuery("4294967295")).toEqual({
    kind: "tick",
    value: 4294967295,
    href: "/tick/4294967295",
  });
});

test("command lookup rejects near misses instead of guessing a route", () => {
  expect(classifyCommandQuery("A".repeat(59)).kind).toBe("invalid");
  expect(classifyCommandQuery("A".repeat(61)).kind).toBe("invalid");
  expect(classifyCommandQuery("G".repeat(60).toLowerCase()).kind).toBe("invalid");
  expect(classifyCommandQuery(transaction.toUpperCase()).kind).toBe("invalid");
  expect(classifyCommandQuery("0123456789abcdef".repeat(3) + "0123456789a").kind).toBe("invalid");
  expect(classifyCommandQuery("4294967296").kind).toBe("invalid");
  expect(classifyCommandQuery("12.5").kind).toBe("invalid");
  expect(classifyCommandQuery(" ").kind).toBe("empty");
});

test("recent lookups stay bounded, newest first, and deduplicated", () => {
  const first = direct(identity);
  const second = direct(transaction);
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
