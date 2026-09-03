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

test("command lookup classifies supported routes without contracts", () => {
  expect(classifyCommandQuery(identity)).toEqual(expect.objectContaining({ kind: "identity" }));
  expect(classifyCommandQuery(transaction)).toEqual(expect.objectContaining({ kind: "ambiguous" }));
  expect(classifyCommandQuery("token:9")).toEqual(expect.objectContaining({ kind: "token", href: "/tokens/9" }));
  expect(classifyCommandQuery("tick:9")).toEqual(expect.objectContaining({ kind: "tick", href: "/tick/9" }));
  expect(classifyCommandQuery("contract:9")).toEqual({ kind: "invalid", value: "contract:9" });
});

test("quick routes omit contract registry surfaces", () => {
  expect(getNavigationCommands("").map(({ id }) => id)).toEqual(["overview", "tokens", "rich-list"]);
  expect(getNavigationCommands("contracts")).toEqual([]);
});

test("recent lookups remain bounded and typed", () => {
  const lookup: DirectQueryMatch = { kind: "tick", value: 8, href: "/tick/8" };
  expect(rememberRecentLookup([], lookup)).toEqual([lookup]);
  expect(getMatchCopy("token")).toEqual(expect.objectContaining({ label: "Token" }));
});
