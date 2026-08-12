"use client";

import { useTransactionByHash } from "@/lib/rpc/queries";
import { formatAtomicAmount } from "@/lib/rpc/validation";
import { IdentityIdentifier } from "@/components/identity";

import {
  ExplorerFrame,
  CopyButton,
  ExplorerLink,
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
      <div className="mb-4 flex items-start gap-2 border-b border-[var(--glyph-line)] pb-4">
        <code className="min-w-0 flex-1 break-all font-mono text-xs leading-5 text-[var(--glyph-ink)]">{hash}</code>
        <CopyButton label="Copy transaction hash" value={hash} />
      </div>

      <Panel title="Transaction record">
        <QueryState
          label="transaction"
          noResultMessage="No transaction was found for this hash."
          query={query}
        >
          {transaction ? (
            <>
              <KeyValueList
                items={[
                  { label: "Archive record", value: "Available" },
                  { label: "Amount", value: transaction.amount !== undefined && transaction.amount !== null ? `${formatAtomicAmount(transaction.amount)} raw units` : "Amount not reported" },
                  { label: "Tick", value: transaction.tickNumber !== undefined ? <ExplorerLink href={`/tick/${transaction.tickNumber}`}>{formatNumber(transaction.tickNumber)}</ExplorerLink> : "Not reported" },
                  { label: "Timestamp", value: formatTimestamp(transaction.timestamp) },
                  { label: "Source", value: <IdentityIdentifier label="Source" value={transaction.source} />, wide: true },
                  { label: "Destination", value: <IdentityIdentifier label="Destination" value={transaction.destination} />, wide: true },
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
