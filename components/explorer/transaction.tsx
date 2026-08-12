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
import { formatContractInvocation, identifyContractInvocation } from "./contracts";
import { formatNumber, formatTimestamp } from "./utils";

function RawTransactionValue({ label, value }: { label: string; value: string | undefined }) {
  if (!value) {
    return <span className="text-[var(--glyph-tertiary)]">Not reported</span>;
  }

  return (
    <div className="flex min-w-0 items-start gap-2">
      <details className="min-w-0 flex-1">
        <summary className="cursor-pointer text-sm font-semibold text-[var(--glyph-ink)] underline decoration-[var(--glyph-line-strong)] underline-offset-4">
          View full {label.toLowerCase()} <span className="font-mono text-xs font-normal text-[var(--glyph-tertiary)]">({formatNumber(value.length)} chars)</span>
        </summary>
        <code className="mt-2 block max-h-40 max-w-full overflow-auto whitespace-pre-wrap break-all border border-[var(--glyph-line)] bg-[var(--glyph-canvas)] p-2 font-mono text-xs leading-5 text-[var(--glyph-ink)]">
          {value}
        </code>
      </details>
      <CopyButton label={`Copy ${label.toLowerCase()}`} value={value} />
    </div>
  );
}

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
  const contractInvocation = transaction ? identifyContractInvocation(transaction) : null;
  const contractInvocationDisplay = contractInvocation
    ? formatContractInvocation(contractInvocation)
    : null;

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
                    { label: "Input data", value: <RawTransactionValue label="Input data" value={transaction.inputData} />, wide: true },
                    { label: "Signature", value: <RawTransactionValue label="Signature" value={transaction.signature} />, wide: true },
                  ]}
                />
              </div>

              {contractInvocationDisplay ? (
                <div className="mt-8 border-t border-[var(--glyph-line)] pt-5">
                  <p className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--glyph-tertiary)]">Contract invocation</p>
                  <p className="mt-2 text-sm font-semibold text-[var(--glyph-ink)]">{contractInvocationDisplay.title}</p>
                  <p className="mt-1 text-sm leading-6 text-[var(--glyph-muted)]">{contractInvocationDisplay.description}</p>
                </div>
              ) : null}
            </>
          ) : null}
        </QueryState>
        <QueryRefreshMeta query={query} />
      </Panel>
    </ExplorerFrame>
  );
}
