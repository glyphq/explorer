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
  PageHeader,
  QueryRefreshMeta,
  QueryState,
} from "./primitives";

import { TransactionPageSkeleton } from "./skeletons";
import { formatNumber, formatTimestamp } from "./utils";

function RawTransactionValue({ label, value }: { label: string; value: string | undefined }) {
  if (value === undefined) {
    return <span className="text-[var(--glyph-tertiary)]">Not reported</span>;
  }

  return (
    <div className="flex min-w-0 items-start gap-2">
      <details className="min-w-0 flex-1">
        <summary className="cursor-pointer text-sm font-semibold text-[var(--glyph-muted)] transition-colors hover:text-[var(--glyph-ink)]">
          View full {label.toLowerCase()} <span className="font-mono text-xs font-normal text-[var(--glyph-tertiary)]">({formatNumber(value.length)} chars)</span>
        </summary>
        <code className="mt-3 block max-h-40 max-w-full overflow-auto whitespace-pre-wrap break-all rounded-xl bg-[var(--glyph-canvas)] p-3 font-mono text-xs leading-5 text-[var(--glyph-ink)]">
          {value}
        </code>
      </details>
      <CopyButton label={`Copy ${label.toLowerCase()}`} value={value} />
    </div>
  );
}

export function TransactionPage({ hash }: { hash: string | null }) {
  const query = useTransactionByHash(hash);
  const transaction = query.data;

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

  return (
    <ExplorerFrame>
      <PageHeader
        description={<code className="block max-w-4xl break-all font-mono text-xs leading-5 text-[var(--glyph-muted)]">{hash}</code>}
        eyebrow="Transaction record"
        title="Transaction"
        actions={<CopyButton label="Copy transaction hash" value={hash} />}
      />

      <QueryState
        label="transaction"
        loading={<TransactionPageSkeleton />}
        noResultMessage="No transaction was found for this hash."
        query={query}
      >
        {transaction ? (
          <>
            <KeyValueList
              items={[
                { label: "Amount", value: transaction.amount !== undefined && transaction.amount !== null ? formatAtomicAmount(transaction.amount) : "Amount not reported" },
                { label: "Tick", value: transaction.tickNumber !== undefined ? <ExplorerLink href={`/tick/${transaction.tickNumber}`}>{formatNumber(transaction.tickNumber)}</ExplorerLink> : "Not reported" },
                { label: "Timestamp", value: formatTimestamp(transaction.timestamp) },
                { label: "Source", value: <IdentityIdentifier label="Source" value={transaction.source} />, wide: true },
                { label: "Destination", value: <IdentityIdentifier label="Destination" value={transaction.destination} />, wide: true },
                { label: "Activity", value: transaction.inputType === 0 ? "Transfer" : "Application input" },
                { label: "Input type", value: formatNumber(transaction.inputType) },
                { label: "Input size", value: formatNumber(transaction.inputSize) },
                { label: "Value transferred", value: transaction.moneyFlew === undefined ? "Not reported" : transaction.moneyFlew ? "Yes" : "No" },
              ]}
            />

            <section aria-labelledby="transaction-payload" className="mt-10">
              <h2 className="text-base font-semibold tracking-[-0.03em] text-[var(--glyph-ink)]" id="transaction-payload">Raw transaction fields</h2>
              <p className="mb-4 mt-1 text-sm text-[var(--glyph-muted)]">Original values reported by the network, shown without decoding.</p>
              <KeyValueList
                items={[
                  { label: "Input data", value: <RawTransactionValue label="Input data" value={transaction.inputData} />, wide: true },
                  { label: "Signature", value: <RawTransactionValue label="Signature" value={transaction.signature} />, wide: true },
                ]}
              />
            </section>

          </>
        ) : null}
      </QueryState>
      <QueryRefreshMeta query={query} />
    </ExplorerFrame>
  );
}
