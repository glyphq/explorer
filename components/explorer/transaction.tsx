"use client";

import { useTickData, useTransactionByHash } from "@/lib/rpc/queries";
import { formatAtomicAmount } from "@/lib/rpc/validation";
import { IdentityIdentifier } from "@/components/identity";

import {
  ExplorerFrame,
  CopyButton,
  ExplorerLink,
  InvalidLookup,
  KeyValueList,
  QueryRefreshMeta,
  QueryState,
} from "./primitives";
import { formatContractInvocation, identifyContractInvocation, isSmartContractCall, transactionTypeLabel } from "./contracts";
import { TransactionPageSkeleton } from "./skeletons";
import { formatNumber, formatTimestamp } from "./utils";

function RawTransactionValue({ label, value }: { label: string; value: string | undefined }) {
  if (value === undefined) {
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
  const transaction = query.data;
  const shouldDecodeContract = Boolean(transaction && isSmartContractCall(transaction.inputType));
  const tickQuery = useTickData(transaction?.tickNumber, { enabled: shouldDecodeContract });

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

  const contractInvocation = shouldDecodeContract && transaction
    ? identifyContractInvocation({ ...transaction, epoch: tickQuery.data?.epoch })
    : null;
  const contractInvocationDisplay = contractInvocation
    ? formatContractInvocation(contractInvocation)
    : null;
  const decodedArguments = contractInvocation?.status === "recognized" && contractInvocation.argumentDecoding.status === "decoded"
    ? contractInvocation.argumentDecoding.arguments
    : null;

  return (
    <ExplorerFrame>
      <header className="mb-5 border-b border-[var(--glyph-line)] pb-4">
        <h1 className="text-2xl font-semibold tracking-[-0.05em] text-[var(--glyph-ink)]">Transaction</h1>
        <p className="mt-1 text-sm text-[var(--glyph-muted)]">Archive record for this transaction.</p>
        <div className="mt-4 flex items-start gap-2">
          <code className="min-w-0 flex-1 break-all font-mono text-xs leading-5 text-[var(--glyph-ink)]">{hash}</code>
          <CopyButton label="Copy transaction hash" value={hash} />
        </div>
      </header>

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
                { label: "Archive record", value: "Available" },
                { label: "Amount", value: transaction.amount !== undefined && transaction.amount !== null ? formatAtomicAmount(transaction.amount) : "Amount not reported" },
                { label: "Tick", value: transaction.tickNumber !== undefined ? <ExplorerLink href={`/tick/${transaction.tickNumber}`}>{formatNumber(transaction.tickNumber)}</ExplorerLink> : "Not reported" },
                { label: "Timestamp", value: formatTimestamp(transaction.timestamp) },
                { label: "Source", value: <IdentityIdentifier label="Source" value={transaction.source} />, wide: true },
                { label: "Destination", value: <IdentityIdentifier label="Destination" value={transaction.destination} />, wide: true },
                { label: "Type", value: transactionTypeLabel(transaction.inputType) },
                { label: "Input type", value: formatNumber(transaction.inputType) },
                { label: "Input size", value: formatNumber(transaction.inputSize) },
                { label: "Money flew", value: transaction.moneyFlew === undefined ? "Not reported" : transaction.moneyFlew ? "Yes" : "No" },
              ]}
            />

            <div className="mt-8 border-t border-[var(--glyph-line)] pt-5">
              <h2 className="text-base font-semibold tracking-[-0.03em] text-[var(--glyph-ink)]">Payload</h2>
              <KeyValueList
                items={[
                  { label: "Input data", value: <RawTransactionValue label="Input data" value={transaction.inputData} />, wide: true },
                  { label: "Signature", value: <RawTransactionValue label="Signature" value={transaction.signature} />, wide: true },
                ]}
              />
            </div>

            {contractInvocationDisplay ? (
              <div className="mt-8 border-t border-[var(--glyph-line)] pt-5">
                <h2 className="text-base font-semibold tracking-[-0.03em] text-[var(--glyph-ink)]">Contract invocation</h2>
                {contractInvocation?.status === "recognized" && contractInvocationDisplay.availability ? (
                  <>
                    <div className="mt-4">
                      <p className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--glyph-tertiary)]">Procedure</p>
                      <h3 className="mt-1 text-lg font-semibold tracking-[-0.03em] text-[var(--glyph-ink)]">{contractInvocationDisplay.title}</h3>
                      <p className="mt-1 text-sm text-[var(--glyph-muted)]"><span className="font-medium text-[var(--glyph-tertiary)]">Contract</span> {contractInvocationDisplay.description}</p>
                    </div>

                    {contractInvocationDisplay.metadata ? (
                      <details className="group mt-4 border-y border-[var(--glyph-line)] py-3">
                        <summary className="cursor-pointer list-none text-sm font-semibold text-[var(--glyph-ink)] underline decoration-[var(--glyph-line-strong)] underline-offset-4 outline-none marker:hidden focus-visible:ring-2 focus-visible:ring-[var(--glyph-focus)]">
                          Technical details
                          <span aria-hidden="true" className="ml-2 text-[var(--glyph-tertiary)] group-open:hidden">+</span>
                          <span aria-hidden="true" className="ml-2 hidden text-[var(--glyph-tertiary)] group-open:inline">−</span>
                        </summary>
                        <p className="mt-3 font-mono text-xs leading-5 text-[var(--glyph-muted)]">{contractInvocationDisplay.metadata}</p>
                      </details>
                    ) : null}

                    <div className="mt-4 border-l border-[var(--glyph-line-strong)] pl-3" role="status">
                      <p className="text-sm font-semibold text-[var(--glyph-ink)]">{contractInvocationDisplay.availability.title}</p>
                      <p className="mt-1 text-sm leading-6 text-[var(--glyph-muted)]">{contractInvocationDisplay.availability.description}</p>
                      <p className="mt-2 text-xs leading-5 text-[var(--glyph-tertiary)]">{contractInvocationDisplay.availability.provenance}</p>
                    </div>

                    <div className="mt-4">
                      <RawTransactionValue label="Raw input" value={transaction.inputData} />
                    </div>

                    {decodedArguments ? (
                      <div className="mt-5">
                        <h3 className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--glyph-tertiary)]">Decoded arguments</h3>
                        {decodedArguments.length > 0 ? (
                          <KeyValueList
                            items={decodedArguments.map((argument) => ({
                              label: argument.name,
                              value: <code className="font-mono text-xs">{argument.value}</code>,
                            }))}
                          />
                        ) : (
                          <p className="mt-1 text-sm text-[var(--glyph-muted)]">This procedure has no input arguments.</p>
                        )}
                      </div>
                    ) : null}
                  </>
                ) : (
                  <>
                    <p className="mt-2 text-sm font-semibold text-[var(--glyph-ink)]">{contractInvocationDisplay.title}</p>
                    <p className="mt-1 text-sm leading-6 text-[var(--glyph-muted)]">{contractInvocationDisplay.description}</p>
                  </>
                )}
              </div>
            ) : null}
          </>
        ) : null}
      </QueryState>
      <QueryRefreshMeta query={query} />
    </ExplorerFrame>
  );
}
