import { describe, expect, test } from "bun:test";
import { contractIndexToIdentity } from "@qubic.org/crypto";
import type { QueryTransaction } from "@qubic.org/rpc";

import { getIdentityTransactionTypeDisplay } from "../identity";
import {
  createIdentityTransactionsPageRequest,
  getIdentityTransactionFilter,
  getNextIdentityTransactionsOffset,
  type TransactionsForIdentity,
} from "@/lib/rpc/queries";

const IDENTITY = "A".repeat(60);

function page({
  from,
  size,
  total,
  count,
}: {
  from?: number;
  size?: number;
  total?: number;
  count: number;
}): TransactionsForIdentity {
  return {
    transactions: Array.from({ length: count }, (_, index) => ({
      hash: `${String(index).padStart(2, "0")}${"a".repeat(58)}`,
      inputType: index % 2,
    })),
    hits: { from, size, total },
    validForTick: 1,
  };
}

describe("identity transaction query helpers", () => {
  test("maps normal and smart-contract filters to documented inputType clauses", () => {
    expect(getIdentityTransactionFilter("all")).toEqual({});
    expect(getIdentityTransactionFilter("normal")).toEqual({ filters: { inputType: "0" } });
    expect(getIdentityTransactionFilter("smart-contract")).toEqual({ ranges: { inputType: { gt: "0" } } });
  });

  test("builds each page request without inventing unsupported pagination fields", () => {
    expect(
      createIdentityTransactionsPageRequest(
        { identity: IDENTITY, pagination: { offset: 999, size: 999 } },
        "smart-contract",
        12,
        12,
      ),
    ).toEqual({
      identity: IDENTITY,
      ranges: { inputType: { gt: "0" } },
      pagination: { offset: 12, size: 12 },
    });
  });

  test("continues from the reported offset until the official hit total is reached", () => {
    expect(getNextIdentityTransactionsOffset(page({ from: 0, size: 2, total: 5, count: 2 }), 0, 2)).toBe(2);
    expect(getNextIdentityTransactionsOffset(page({ from: 2, size: 2, total: 4, count: 2 }), 2, 2)).toBeUndefined();
    expect(getNextIdentityTransactionsOffset(page({ from: 0, size: 2, total: 5, count: 1 }), 0, 2)).toBeUndefined();
  });

  test("stops at the archive pagination cap when the response omits a total", () => {
    expect(getNextIdentityTransactionsOffset(page({ from: 9_996, size: 4, count: 4 }), 9_996, 4)).toBeUndefined();
  });
});

describe("identity transaction type display", () => {
  test("shows a recognized procedure while retaining contract details for hover", () => {
    const transaction: QueryTransaction = {
      destination: contractIndexToIdentity(9),
      inputData: btoa(String.fromCharCode(...new Uint8Array(12))),
      inputSize: 12,
      inputType: 2,
    };

    expect(getIdentityTransactionTypeDisplay(transaction)).toEqual({
      label: "Unlock",
      detail: "Qearn\nContract index 9 · input type 2 · 12 reported bytes · 12 payload bytes",
    });
  });
});
