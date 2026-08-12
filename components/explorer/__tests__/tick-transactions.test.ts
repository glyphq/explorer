import { describe, expect, test } from "bun:test";

import type { QueryTransaction } from "@qubic.org/rpc";

import { hasReportedContractIndex, toTickTransactionRows } from "../tick-transactions";

describe("tick transaction rows", () => {
  test("preserves the official transaction fields used by the table", () => {
    const transaction: QueryTransaction = {
      hash: "a".repeat(60),
      source: "B".repeat(60),
      destination: "C".repeat(60),
      amount: "1000000",
      inputType: 7,
    };

    expect(toTickTransactionRows([transaction])).toEqual([
      {
        key: `${transaction.hash}-0`,
        hash: transaction.hash,
        source: transaction.source,
        destination: transaction.destination,
        amount: transaction.amount,
        inputType: transaction.inputType,
        contractIndex: undefined,
      },
    ]);
  });

  test("keeps an optional reported contract index and detects its column", () => {
    const transaction = {
      hash: "d".repeat(60),
      contractIndex: "18446744073709551615",
    } as QueryTransaction & { contractIndex: string };
    const rows = toTickTransactionRows([transaction]);

    expect(rows[0]?.contractIndex).toBe("18446744073709551615");
    expect(hasReportedContractIndex(rows)).toBe(true);
    expect(hasReportedContractIndex(toTickTransactionRows([{ hash: "e".repeat(60) }]))).toBe(false);
  });

  test("does not manufacture missing optional values", () => {
    const [row] = toTickTransactionRows([
      { hash: "f".repeat(60), source: "", destination: "", amount: "not-a-number", inputType: undefined },
    ]);

    expect(row).toMatchObject({ key: `${"f".repeat(60)}-0`, hash: "f".repeat(60), amount: "not-a-number" });
    expect(row?.source).toBeUndefined();
    expect(row?.destination).toBeUndefined();
    expect(row?.inputType).toBeUndefined();
  });
});
