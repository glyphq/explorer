"use client";

import { useTickData, useTransactionsForTick } from "@/lib/rpc/queries";
import { formatAtomicAmount, formatIdentifier, formatTransactionHash } from "@/lib/rpc/validation";

import {
  CopyButton,
  ExplorerFrame,
  ExplorerLink,
  InvalidLookup,
  Panel,
  QueryRefreshMeta,
  QueryState,
} from "./primitives";
import { formatNumber } from "./utils";
import { hasReportedContractIndex, toTickTransactionRows, type TickTransactionRow } from "./tick-transactions";

function IdentifierCell({ value }: { value: string | undefined }) {
  return value ? (
    <code className="font-mono text-xs text-[var(--glyph-ink)]" title={value}>
      {formatIdentifier(value)}
    </code>
  ) : (
    <span className="text-[var(--glyph-tertiary)]">Not reported</span>
  );
}

function TransactionTable({ rows, tick }: { rows: TickTransactionRow[]; tick: number }) {
  const showContractIndex = hasReportedContractIndex(rows);

  return (
    <div className="-mx-4 overflow-x-auto sm:mx-0">
      <table className="min-w-[760px] w-full border-collapse text-left" aria-label={`Transactions in tick ${tick}`}>
        <caption className="sr-only">Transactions included in tick {tick}</caption>
        <thead>
          <tr className="border-b border-[var(--glyph-line)] text-[0.68rem] uppercase tracking-[0.08em] text-[var(--glyph-tertiary)]">
            <th className="px-4 pb-3 font-medium sm:px-0" scope="col">Transaction</th>
            <th className="px-4 pb-3 font-medium" scope="col">Source</th>
            <th className="px-4 pb-3 font-medium" scope="col">Destination</th>
            <th className="px-4 pb-3 text-right font-medium" scope="col">Amount</th>
            <th className="px-4 pb-3 text-right font-medium" scope="col">Input type</th>
            {showContractIndex ? <th className="px-4 pb-3 text-right font-medium" scope="col">Contract index</th> : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--glyph-line)]">
          {rows.map((row) => (
            <tr key={row.key} className="align-top text-sm text-[var(--glyph-muted)]">
              <td className="px-4 py-4 sm:px-0">
                {row.hash ? (
                  <ExplorerLink href={`/transaction/${row.hash}`}>
                    <span title={row.hash}>{formatTransactionHash(row.hash)}</span>
                  </ExplorerLink>
                ) : (
                  <span className="text-[var(--glyph-tertiary)]">Hash not reported</span>
                )}
              </td>
              <td className="px-4 py-4"><IdentifierCell value={row.source} /></td>
              <td className="px-4 py-4"><IdentifierCell value={row.destination} /></td>
              <td className="whitespace-nowrap px-4 py-4 text-right font-mono text-xs text-[var(--glyph-ink)]">
                {row.amount !== undefined ? `${formatAtomicAmount(row.amount)} raw units` : "Not reported"}
              </td>
              <td className="px-4 py-4 text-right font-mono text-xs text-[var(--glyph-ink)]">
                {formatNumber(row.inputType)}
              </td>
              {showContractIndex ? (
                <td className="px-4 py-4 text-right font-mono text-xs text-[var(--glyph-ink)]">
                  {row.contractIndex ?? "Not reported"}
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TickTransactionsPage({ tick }: { tick: number | null }) {
  const archive = useTickData(tick);
  const transactions = useTransactionsForTick(tick, { enabled: archive.data !== undefined });

  if (tick === null) {
    return (
      <ExplorerFrame>
        <InvalidLookup
          expected="Use a whole-number tick from 0 through 4,294,967,295."
          label="Tick"
          value="Invalid route parameter"
        />
      </ExplorerFrame>
    );
  }

  return (
    <ExplorerFrame>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4 border-b border-[var(--glyph-line)] pb-4">
        <div>
          <p className="text-xs uppercase tracking-[0.1em] text-[var(--glyph-tertiary)]">Tick transactions</p>
          <h1 className="mt-2 font-mono text-2xl font-semibold tracking-[-0.05em] text-[var(--glyph-ink)]">{formatNumber(tick)}</h1>
        </div>
        <div className="flex items-center gap-3">
          <ExplorerLink href={`/tick/${tick}`}>Tick record</ExplorerLink>
          <CopyButton label="Copy tick" value={String(tick)} />
        </div>
      </div>

      <Panel title="Transactions">
        <QueryState
          label="archive tick record"
          noResultMessage="No archive record was found for this tick."
          query={archive}
        >
          {archive.data ? (
            <QueryState
              emptyMessage="No transactions were returned for this tick."
              emptyWhen={(data) => Array.isArray(data) && data.length === 0}
              label="tick transactions"
              noResultMessage="No transaction response was returned for this tick."
              query={transactions}
            >
              {Array.isArray(transactions.data) ? (
                <>
                  <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2 border-b border-[var(--glyph-line)] pb-3">
                    <p className="font-mono text-xs text-[var(--glyph-muted)]">
                      {formatNumber(transactions.data.length)} transactions returned
                    </p>
                    <p className="text-xs text-[var(--glyph-tertiary)]">
                      Archive tick {formatNumber(archive.data.tickNumber ?? tick)}
                    </p>
                  </div>
                  <TransactionTable rows={toTickTransactionRows(transactions.data)} tick={tick} />
                </>
              ) : null}
            </QueryState>
          ) : null}
        </QueryState>
        {archive.data ? <QueryRefreshMeta query={transactions} /> : <QueryRefreshMeta query={archive} />}
      </Panel>
    </ExplorerFrame>
  );
}
