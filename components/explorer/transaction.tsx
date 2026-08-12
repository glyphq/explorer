"use client";

import Link from "next/link";

import { useTransactionByHash } from "@/lib/rpc/queries";
import { formatAtomicAmount } from "@/lib/rpc/validation";

import {
  ExplorerFrame,
  ExplorerPageHeader,
  IdentifierValue,
  InvalidLookup,
  KeyValueList,
  Panel,
  QueryRefreshMeta,
  QueryState,
} from "./primitives";
import { formatNumber, formatTimestamp } from "./utils";

export function TransactionPage({ hash }: { hash: string | null }) {
  const query = useTransactionByHash(hash);

  if (!hash) {
    return (
      <ExplorerFrame>
        <ExplorerPageHeader
          description="The transaction route only accepts a canonical Qubic transaction hash."
          eyebrow="Glyph Explorer / transaction"
          title="Transaction lookup"
        />
        <InvalidLookup
          expected="Use the canonical 60-character lowercase transaction hash format."
          label="Transaction hash"
          value="Invalid route parameter"
        />
      </ExplorerFrame>
    );
  }

  const transaction = query.data;

  return (
    <ExplorerFrame>
      <ExplorerPageHeader
        description="Archive transaction record."
        eyebrow="Glyph Explorer / transaction"
        title="Transaction detail"
      >
        <code className="block max-w-sm break-all border border-[var(--glyph-line-strong)] bg-[var(--glyph-surface)] px-3 py-2 font-mono text-xs leading-5">
          {hash}
        </code>
      </ExplorerPageHeader>

      <Panel title="Transaction record" eyebrow="Archive query RPC">
        <QueryState
          label="transaction"
          noResultMessage="No transaction was found for this hash."
          query={query}
        >
          {transaction ? (
            <>
              <KeyValueList
                items={[
                  { label: "Hash", value: <IdentifierValue value={transaction.hash ?? hash} />, wide: true },
                  { label: "Amount", value: transaction.amount ? `${formatAtomicAmount(transaction.amount)} raw units` : "Amount not reported" },
                  { label: "Tick", value: transaction.tickNumber !== undefined ? <Link className="underline" href={`/tick/${transaction.tickNumber}`}>{formatNumber(transaction.tickNumber)}</Link> : "Not reported" },
                  { label: "Timestamp", value: formatTimestamp(transaction.timestamp) },
                  { label: "Source", value: <IdentifierValue value={transaction.source} />, wide: true },
                  { label: "Destination", value: <IdentifierValue value={transaction.destination} />, wide: true },
                  { label: "Input type", value: formatNumber(transaction.inputType) },
                  { label: "Input size", value: formatNumber(transaction.inputSize) },
                  { label: "Money flew", value: transaction.moneyFlew === undefined ? "Not reported" : transaction.moneyFlew ? "Yes" : "No" },
                ]}
              />

              <div className="mt-8 border-t border-[var(--glyph-line)] pt-5">
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--glyph-tertiary)]">Payload fields</p>
                <KeyValueList
                  items={[
                    { label: "Input data", value: transaction.inputData ? <code className="break-all font-mono text-xs">{transaction.inputData}</code> : "Not reported", wide: true },
                    { label: "Signature", value: transaction.signature ? <code className="break-all font-mono text-xs">{transaction.signature}</code> : "Not reported", wide: true },
                  ]}
                />
              </div>
            </>
          ) : null}
        </QueryState>
        <QueryRefreshMeta query={query} />
      </Panel>
    </ExplorerFrame>
  );
}
