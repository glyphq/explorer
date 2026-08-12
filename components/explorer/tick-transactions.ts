import type { QueryTransaction } from "@qubic.org/rpc";

export interface TickTransactionRow {
  key: string;
  hash?: string;
  source?: string;
  destination?: string;
  amount?: string;
  inputType?: number;
  contractIndex?: string;
}

type QueryTransactionWithOptionalContractIndex = QueryTransaction & {
  contractIndex?: unknown;
};

function reportedString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function reportedInputType(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function reportedContractIndex(transaction: QueryTransaction): string | undefined {
  const value = (transaction as QueryTransactionWithOptionalContractIndex).contractIndex;

  if (typeof value === "bigint") return value >= BigInt(0) ? value.toString() : undefined;
  if (typeof value === "number") {
    return Number.isSafeInteger(value) && value >= 0 ? String(value) : undefined;
  }
  if (typeof value === "string" && /^\d+$/.test(value.trim())) return value.trim();
  return undefined;
}

export function toTickTransactionRows(transactions: QueryTransaction[]): TickTransactionRow[] {
  return transactions.map((transaction, index) => ({
    key: `${transaction.hash ?? "transaction"}-${index}`,
    hash: reportedString(transaction.hash),
    source: reportedString(transaction.source),
    destination: reportedString(transaction.destination),
    amount: typeof transaction.amount === "string" ? transaction.amount : undefined,
    inputType: reportedInputType(transaction.inputType),
    contractIndex: reportedContractIndex(transaction),
  }));
}

export function hasReportedContractIndex(rows: TickTransactionRow[]): boolean {
  return rows.some((row) => row.contractIndex !== undefined);
}
