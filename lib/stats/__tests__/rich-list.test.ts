import { describe, expect, test } from "bun:test";

import {
  DEFAULT_RICH_LIST_PAGE_SIZE,
  fetchRichList,
  MAX_RICH_LIST_PAGE_SIZE,
  normalizeRichListPage,
  RICH_LIST_STATS_ENDPOINT,
} from "../rich-list";

const FIRST_IDENTITY = `J${"A".repeat(59)}`;
const SECOND_IDENTITY = `B${"C".repeat(59)}`;
const VALID_PAYLOAD = {
  pagination: {
    totalRecords: 10_000,
    currentPage: 2,
    totalPages: 400,
    pageSize: 25,
  },
  epoch: 225,
  richList: {
    entities: [
      { identity: FIRST_IDENTITY, balance: "33199432059093" },
      { identity: SECOND_IDENTITY, balance: "15973555583259" },
    ],
  },
};

describe("Qubic rich-list stats", () => {
  test("normalizes pagination and preserves reported balance precision", () => {
    expect(normalizeRichListPage(VALID_PAYLOAD)).toEqual({
      epoch: 225,
      pagination: {
        totalRecords: 10_000,
        currentPage: 2,
        totalPages: 400,
        pageSize: 25,
      },
      entries: [
        { identity: FIRST_IDENTITY, balance: BigInt("33199432059093") },
        { identity: SECOND_IDENTITY, balance: BigInt("15973555583259") },
      ],
    });
  });

  test("rejects missing pagination, entries, and reported balances", () => {
    expect(() => normalizeRichListPage({ ...VALID_PAYLOAD, pagination: undefined })).toThrow(/pagination/);
    expect(() => normalizeRichListPage({ ...VALID_PAYLOAD, richList: { entities: undefined } })).toThrow(/entities/);
    expect(() => normalizeRichListPage({
      ...VALID_PAYLOAD,
      richList: { entities: [{ identity: "not-an-identity", balance: "1" }] },
    })).toThrow(/identity/);
    expect(() => normalizeRichListPage({
      ...VALID_PAYLOAD,
      richList: { entities: [{ identity: FIRST_IDENTITY, balance: "not-a-number" }] },
    })).toThrow(/balance/);
  });

  test("requests one bounded API page and does not fan out", async () => {
    const requested: string[] = [];
    const result = await fetchRichList({
      page: 2,
      pageSize: 1_000,
      fetcher: async (input) => {
        requested.push(String(input));
        return new Response(JSON.stringify(VALID_PAYLOAD), { status: 200 });
      },
    });

    expect(requested).toHaveLength(1);
    const url = new URL(requested[0]);
    expect(url.origin + url.pathname).toBe(RICH_LIST_STATS_ENDPOINT);
    expect(url.searchParams.get("page")).toBe("2");
    expect(url.searchParams.get("pageSize")).toBe(String(MAX_RICH_LIST_PAGE_SIZE));
    expect(result.entries).toHaveLength(2);
  });

  test("uses the bounded first page by default", async () => {
    let requestedUrl = "";
    await fetchRichList({
      fetcher: async (input) => {
        requestedUrl = String(input);
        return new Response(JSON.stringify({
          ...VALID_PAYLOAD,
          pagination: { ...VALID_PAYLOAD.pagination, currentPage: 1, pageSize: DEFAULT_RICH_LIST_PAGE_SIZE },
        }), { status: 200 });
      },
    });

    const url = new URL(requestedUrl);
    expect(url.searchParams.get("page")).toBe("1");
    expect(url.searchParams.get("pageSize")).toBe(String(DEFAULT_RICH_LIST_PAGE_SIZE));
  });

  test("normalizes HTTP failures against the official endpoint", async () => {
    await expect(fetchRichList({
      fetcher: async () => new Response(null, { status: 503 }),
    })).rejects.toMatchObject({
      endpoint: RICH_LIST_STATS_ENDPOINT,
      kind: "http",
      retryable: true,
      status: 503,
    });
  });
});
