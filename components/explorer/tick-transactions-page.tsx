"use client";

import { Coins01Icon, CodeIcon, HashtagIcon, TransactionIcon, UserArrowLeftRightIcon, UserIcon } from "@hugeicons/core-free-icons";
import { IdentityAvatar } from "@/components/identity";
import { useTickData, useTransactionsForTick } from "@/lib/rpc/queries";
import { formatAtomicAmount, formatIdentifier, formatTransactionHash, normalizeIdentity } from "@/lib/rpc/validation";

import {
  CopyButton,
  ExplorerFrame,
  ExplorerLink,
  InvalidLookup,
  PageHeader,
  QueryRefreshMeta,
  QueryState,
  TableHeaderLabel,
  TableScroll,
} from "./primitives";
import { SkeletonKeyValueList, SkeletonTable } from "./skeletons";
import { formatNumber } from "./utils";
import { hasReportedContractIndex, toTickTransactionRows, type TickTransactionRow } from "./tick-transactions";

function IdentifierCell({ value }: { value: string | undefined }) {
  if (!value) return <span className="text-[var(--glyph-tertiary)]">Not reported</span>;

  const identity = normalizeIdentity(value);
  if (!identity) {
    return <code className="font-mono text-xs text-[var(--glyph-ink)]" title={value}>{formatIdentifier(value)}</code>;
  }

  return (
    <span className="flex min-w-0 items-center gap-2" title={identity}>
      <IdentityAvatar identity={identity} label="Transaction identity identicon" radius={4} size={20} />
      <code className="font-mono text-xs text-[var(--glyph-ink)]">{formatIdentifier(identity)}</code>
    </span>
  );
}

function TransactionTable({ rows, tick }: { rows: TickTransactionRow[]; tick: number }) {
  const showContractIndex = hasReportedContractIndex(rows);

  return (
    <TableScroll>
      <table className="glyph-table min-w-[760px] w-full border-collapse text-left" aria-label={`Transactions in tick ${tick}`}>
        <caption className="sr-only">Transactions included in tick {tick}</caption>
        <thead>
          <tr>
            <th className="font-medium" scope="col"><TableHeaderLabel icon={TransactionIcon}>Transaction</TableHeaderLabel></th>
            <th className="font-medium" scope="col"><TableHeaderLabel icon={UserIcon}>Source</TableHeaderLabel></th>
            <th className="font-medium" scope="col"><TableHeaderLabel icon={UserArrowLeftRightIcon}>Destination</TableHeaderLabel></th>
            <th className="text-right font-medium" scope="col"><TableHeaderLabel icon={Coins01Icon}>Amount</TableHeaderLabel></th>
            <th className="text-right font-medium" scope="col"><TableHeaderLabel icon={CodeIcon}>Input type</TableHeaderLabel></th>
            {showContractIndex ? <th className="text-right font-medium" scope="col"><TableHeaderLabel icon={HashtagIcon}>Contract index</TableHeaderLabel></th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="align-top text-sm">
              <td className="py-3">
                {row.hash ? (
                  <ExplorerLink href={`/transaction/${row.hash}`}>
                    <span title={row.hash}>{formatTransactionHash(row.hash)}</span>
                  </ExplorerLink>
                ) : (
                  <span className="text-[var(--glyph-tertiary)]">Hash not reported</span>
                )}
              </td>
              <td className="py-3"><IdentifierCell value={row.source} /></td>
              <td className="py-3"><IdentifierCell value={row.destination} /></td>
              <td className="whitespace-nowrap py-3 text-right font-mono text-xs text-[var(--glyph-ink)]">
                {row.amount !== undefined ? formatAtomicAmount(row.amount) : "Not reported"}
              </td>
              <td className="py-3 text-right font-mono text-xs text-[var(--glyph-ink)]">
                {formatNumber(row.inputType)}
              </td>
              {showContractIndex ? (
                <td className="py-3 text-right font-mono text-xs text-[var(--glyph-ink)]">
                  {row.contractIndex ?? "Not reported"}
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </TableScroll>
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
      <PageHeader
        description="Review every transaction reported for this tick."
        eyebrow="Tick activity"
        title={<>Tick <span className="font-mono">{formatNumber(tick)}</span></>}
        actions={<div className="flex items-center gap-3">
          <ExplorerLink href={`/tick/${tick}`}>Tick record</ExplorerLink>
          <CopyButton label="Copy tick" value={String(tick)} />
        </div>}
      />

      <QueryState
        label="archive tick record"
        loading={<SkeletonKeyValueList label="Loading archive tick record" rows={5} />}
        noResultMessage="No archive record was found for this tick."
        query={archive}
      >
        {archive.data ? (
          <QueryState
            emptyMessage="No transactions were returned for this tick."
            emptyWhen={(data) => Array.isArray(data) && data.length === 0}
            label="tick transactions"
            loading={<SkeletonTable columns={6} label="Loading tick transaction rows" minWidth="min-w-[760px]" rows={7} />}
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
    </ExplorerFrame>
  );
}
