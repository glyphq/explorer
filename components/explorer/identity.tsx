"use client";

import {
  createColumnHelper,
  createSortedRowModel,
  rowSortingFeature,
  tableFeatures,
  type SortingState,
  useTable,
} from "@tanstack/react-table";
import { useMemo, useState } from "react";
import type { QueryTransaction } from "@qubic.org/rpc";
import { useQuery } from "@tanstack/react-query";

import { IdentityAvatar } from "@/components/identity";
import {
  IDENTITY_TRANSACTION_PAGE_SIZE,
  type IdentityTransactionFilter,
  useQubicBalance,
  useTransactionsForIdentity,
} from "@/lib/rpc/queries";
import { explorerData, type ExplorerTransactionsForIdentityRequest } from "@/lib/rpc/adapter";
import { formatAtomicAmount, formatIdentifier, formatTransactionHash } from "@/lib/rpc/validation";

import {
  CopyButton,
  ExplorerFrame,
  ExplorerLink,
  InvalidLookup,
  QueryRefreshMeta,
  QueryState,
} from "./primitives";
import { formatNumber, formatTimestamp } from "./utils";

const assetQueryPolicy = { staleTime: 30_000, gcTime: 5 * 60_000 } as const;

function useIdentityAssets(identity: string | null) {
  const issued = useQuery({
    queryKey: ["qubic", "live", "assets", "issued", identity] as const,
    queryFn: ({ signal }: { signal: AbortSignal }) => explorerData.getIssuedAssets(identity ?? "", { signal }),
    ...assetQueryPolicy,
    enabled: Boolean(identity),
  });
  const owned = useQuery({
    queryKey: ["qubic", "live", "assets", "owned", identity] as const,
    queryFn: ({ signal }: { signal: AbortSignal }) => explorerData.getOwnedAssets(identity ?? "", { signal }),
    ...assetQueryPolicy,
    enabled: Boolean(identity),
  });
  const possessed = useQuery({
    queryKey: ["qubic", "live", "assets", "possessed", identity] as const,
    queryFn: ({ signal }: { signal: AbortSignal }) => explorerData.getPossessedAssets(identity ?? "", { signal }),
    ...assetQueryPolicy,
    enabled: Boolean(identity),
  });

  return { issued, owned, possessed };
}

function SummaryChip({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="min-w-[10rem] flex-1 border border-[var(--glyph-line)] bg-[var(--glyph-surface)] px-4 py-3" role="listitem">
      <dt className="text-[0.68rem] font-medium uppercase tracking-[0.08em] text-[var(--glyph-tertiary)]">{label}</dt>
      <dd className="mt-1 font-mono text-sm font-semibold text-[var(--glyph-ink)]">{value}</dd>
      {detail ? <p className="mt-1 text-xs text-[var(--glyph-muted)]">{detail}</p> : null}
    </div>
  );
}

function querySummaryValue<T>(
  query: { data: T | undefined; isPending: boolean; isError: boolean },
  format: (data: T) => string,
): string {
  if (query.isPending && query.data === undefined) return "Loading…";
  if (query.isError && query.data === undefined) return "Unavailable";
  if (query.data === undefined) return "Not reported";
  return format(query.data);
}

function IdentitySummary({
  balance,
  assets,
}: {
  balance: ReturnType<typeof useQubicBalance>;
  assets: ReturnType<typeof useIdentityAssets>;
}) {
  return (
    <section aria-labelledby="identity-summary" className="border-b border-[var(--glyph-line)] pb-7">
      <h2 className="sr-only" id="identity-summary">Identity summary</h2>
      <dl className="flex flex-wrap gap-3" role="list">
        <SummaryChip
          detail="Current account balance"
          label="Balance"
          value={querySummaryValue(balance, (data) => `${formatAtomicAmount(data.balance)} raw units`)}
        />
        <SummaryChip
          detail="Assets issued by this identity"
          label="Issued assets"
          value={querySummaryValue(assets.issued, (data) => formatNumber(data.length))}
        />
        <SummaryChip
          detail="Assets owned by this identity"
          label="Owned assets"
          value={querySummaryValue(assets.owned, (data) => formatNumber(data.length))}
        />
        <SummaryChip
          detail="Assets possessed by this identity"
          label="Possessed assets"
          value={querySummaryValue(assets.possessed, (data) => formatNumber(data.length))}
        />
      </dl>
      {balance.data?.validForTick !== undefined ? (
        <p className="mt-3 text-xs text-[var(--glyph-tertiary)]">
          Balance snapshot valid through tick <span className="font-mono text-[var(--glyph-muted)]">{formatNumber(balance.data.validForTick)}</span>.
        </p>
      ) : null}
      <QueryRefreshMeta query={balance} />
    </section>
  );
}

function TransactionIdentityCell({ value, label }: { value: string | undefined; label: string }) {
  if (!value) return <span className="text-[var(--glyph-tertiary)]">Not reported</span>;

  return (
    <span className="flex min-w-0 items-center gap-2" title={value}>
      <IdentityAvatar identity={value} label={`${label} identicon`} radius={4} size={20} />
      <code className="font-mono text-xs text-[var(--glyph-ink)]">{formatIdentifier(value)}</code>
    </span>
  );
}

function timestampSortValue(value: string | undefined): number | null {
  if (!value) return null;
  if (/^-?\d+$/.test(value)) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return null;
    return Math.abs(numeric) >= 100_000_000_000 ? numeric : numeric * 1_000;
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function amountSortValue(value: string | undefined): bigint | undefined {
  if (!value || !/^\d+$/.test(value)) return undefined;
  try {
    return BigInt(value);
  } catch {
    return undefined;
  }
}

function transactionTypeLabel(inputType: number | undefined): string {
  if (inputType === 0) return "Normal transaction";
  if (typeof inputType === "number" && inputType > 0) return "Smart-contract call";
  return "Input type not reported";
}

const identityTableFeatures = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
});
const identityColumnHelper = createColumnHelper<typeof identityTableFeatures, QueryTransaction>();
const identityColumns = identityColumnHelper.columns([
  identityColumnHelper.display({
    id: "hash",
    header: "Transaction",
    enableSorting: false,
    cell: ({ row }) => {
      const hash = row.original.hash;
      return hash ? (
        <ExplorerLink href={`/transaction/${hash}`}>
          <span title={hash}>{formatTransactionHash(hash)}</span>
        </ExplorerLink>
      ) : (
        <span className="text-[var(--glyph-tertiary)]">Hash not reported</span>
      );
    },
  }),
  identityColumnHelper.accessor("source", {
    header: "Source",
    enableSorting: false,
    cell: ({ row }) => <TransactionIdentityCell label="Source" value={row.original.source} />,
  }),
  identityColumnHelper.accessor("destination", {
    header: "Destination",
    enableSorting: false,
    cell: ({ row }) => <TransactionIdentityCell label="Destination" value={row.original.destination} />,
  }),
  identityColumnHelper.accessor("inputType", {
    header: "Type",
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-xs text-[var(--glyph-ink)]">
        {transactionTypeLabel(row.original.inputType)}
        {row.original.inputType !== undefined ? (
          <span className="ml-1 font-mono text-[var(--glyph-tertiary)]">({formatNumber(row.original.inputType)})</span>
        ) : null}
      </span>
    ),
  }),
  identityColumnHelper.accessor("tickNumber", {
    header: "Tick",
    cell: ({ row }) => {
      const tick = row.original.tickNumber;
      return tick !== undefined ? (
        <ExplorerLink href={`/tick/${tick}`}>{formatNumber(tick)}</ExplorerLink>
      ) : (
        <span className="text-[var(--glyph-tertiary)]">Not reported</span>
      );
    },
  }),
  identityColumnHelper.accessor((transaction) => timestampSortValue(transaction.timestamp) ?? undefined, {
    id: "timestamp",
    header: "Time",
    cell: ({ row }) => <span className="whitespace-nowrap text-xs text-[var(--glyph-muted)]">{formatTimestamp(row.original.timestamp)}</span>,
  }),
  identityColumnHelper.accessor((transaction) => amountSortValue(transaction.amount), {
    id: "amount",
    header: "Amount",
    cell: ({ row }) => (
      <span className="whitespace-nowrap font-mono text-xs text-[var(--glyph-ink)]">
        {row.original.amount !== undefined && row.original.amount !== null
          ? `${formatAtomicAmount(row.original.amount)} raw units`
          : "Not reported"}
      </span>
    ),
  }),
]);

function TransactionTable({ transactions }: { transactions: QueryTransaction[] }) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "tickNumber", desc: true }]);
  const table = useTable({
    features: identityTableFeatures,
    data: transactions,
    columns: identityColumns,
    state: { sorting },
    onSortingChange: setSorting,
    getRowId: (row, index) => `${row.hash ?? "transaction"}-${index}`,
  });

  return (
    <div className="-mx-4 overflow-x-auto sm:mx-0">
      <table className="min-w-[980px] w-full border-collapse text-left" aria-label="Identity transaction history">
        <caption className="sr-only">Identity transaction history</caption>
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr className="border-b border-[var(--glyph-line)] text-[0.68rem] uppercase tracking-[0.08em] text-[var(--glyph-tertiary)]" key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const label = String(header.column.columnDef.header ?? "Column");
                const sorted = header.column.getIsSorted();
                return (
                  <th className="px-4 pb-3 font-medium first:sm:pl-0 last:sm:pr-0" key={header.id} scope="col" aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : "none"}>
                    {header.isPlaceholder ? null : header.column.getCanSort() ? (
                      <button
                        aria-label={`Sort by ${label}`}
                        className="inline-flex min-h-8 items-center gap-1 text-left hover:text-[var(--glyph-ink)]"
                        onClick={header.column.getToggleSortingHandler()}
                        type="button"
                      >
                        <table.FlexRender header={header} />
                        <span aria-hidden="true">{sorted === "asc" ? "↑" : sorted === "desc" ? "↓" : "↕"}</span>
                      </button>
                    ) : (
                      <table.FlexRender header={header} />
                    )}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-[var(--glyph-line)]">
          {table.getRowModel().rows.map((row) => (
            <tr className="align-top text-sm" key={row.id}>
              {row.getAllCells().map((cell) => (
                <td className="px-4 py-3 first:sm:pl-0 last:sm:pr-0" key={cell.id}>
                  <table.FlexRender cell={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function isEmptyTransactionQueryData(data: unknown): boolean {
  if (!data || typeof data !== "object" || !("pages" in data)) return false;
  const pages = (data as { pages?: unknown }).pages;
  return Array.isArray(pages) && pages.every((page) => {
    if (!page || typeof page !== "object" || !("transactions" in page)) return false;
    const transactions = (page as { transactions?: unknown }).transactions;
    return Array.isArray(transactions) && transactions.length === 0;
  });
}

function TransactionHistory({ request }: { request: ExplorerTransactionsForIdentityRequest }) {
  const [filter, setFilter] = useState<IdentityTransactionFilter>("all");
  const query = useTransactionsForIdentity(request, filter, IDENTITY_TRANSACTION_PAGE_SIZE);
  const transactions = useMemo(
    () => query.data?.pages.flatMap((page) => page.transactions) ?? [],
    [query.data],
  );
  const total = query.data?.pages[0]?.hits.total;
  const validForTick = query.data?.pages[0]?.validForTick;

  return (
    <section aria-labelledby="identity-transactions" className="border-t border-[var(--glyph-line)] pt-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold tracking-[-0.03em] text-[var(--glyph-ink)]" id="identity-transactions">Transactions</h2>
          <p className="mt-1 text-sm text-[var(--glyph-muted)]">Archive history for this identity.</p>
        </div>
        <label className="flex items-center gap-2 text-xs text-[var(--glyph-muted)]">
          <span>Type</span>
          <select
            aria-label="Transaction type filter"
            className="min-h-10 border border-[var(--glyph-line-strong)] bg-[var(--glyph-surface)] px-3 font-medium text-[var(--glyph-ink)]"
            onChange={(event) => setFilter(event.target.value as IdentityTransactionFilter)}
            value={filter}
          >
            <option value="all">All transactions</option>
            <option value="normal">Normal transaction (input type 0)</option>
            <option value="smart-contract">Smart-contract call (input type &gt; 0)</option>
          </select>
        </label>
      </div>

      <QueryState
        emptyMessage="No transactions match this filter."
        emptyWhen={isEmptyTransactionQueryData}
        label="identity transaction history"
        query={query}
      >
        {query.data ? (
          <>
            <div className="mb-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--glyph-tertiary)]" aria-live="polite">
              <span>
                <span className="mr-1 uppercase tracking-[0.08em]">Loaded</span>
                <span className="font-mono text-[var(--glyph-ink)]">{formatNumber(transactions.length)}</span>
              </span>
              {total !== undefined ? (
                <span>
                  <span className="mr-1 uppercase tracking-[0.08em]">Matches</span>
                  <span className="font-mono text-[var(--glyph-ink)]">{formatNumber(total)}</span>
                </span>
              ) : null}
              {validForTick !== undefined ? (
                <span>
                  <span className="mr-1 uppercase tracking-[0.08em]">Valid tick</span>
                  <span className="font-mono text-[var(--glyph-ink)]">{formatNumber(validForTick)}</span>
                </span>
              ) : null}
            </div>
            <TransactionTable transactions={transactions} />
            <div className="mt-5 flex flex-wrap items-center gap-3">
              {query.hasNextPage ? (
                <button
                  className="min-h-11 border border-[var(--glyph-line-strong)] bg-[var(--glyph-ink)] px-4 text-sm font-semibold text-[var(--glyph-canvas)] disabled:cursor-wait disabled:opacity-60"
                  disabled={query.isFetchingNextPage}
                  onClick={() => void query.fetchNextPage()}
                  type="button"
                >
                  {query.isFetchingNextPage ? "Loading more…" : "Load more transactions"}
                </button>
              ) : (
                <p className="text-xs text-[var(--glyph-tertiary)]">All available transactions are loaded.</p>
              )}
              {query.isFetchingNextPage ? <span aria-live="polite" className="text-xs text-[var(--glyph-muted)]">Loading the next page…</span> : null}
            </div>
          </>
        ) : null}
      </QueryState>
      <QueryRefreshMeta query={query} />
    </section>
  );
}

export function IdentityPage({ identity }: { identity: string | null }) {
  const balance = useQubicBalance(identity);
  const assets = useIdentityAssets(identity);
  const historyRequest: ExplorerTransactionsForIdentityRequest | null = identity ? { identity } : null;

  if (!identity || !historyRequest) {
    return (
      <ExplorerFrame>
        <InvalidLookup
          expected="Use the canonical 60-character uppercase Qubic identity format."
          label="Identity"
          value="Invalid route parameter"
        />
      </ExplorerFrame>
    );
  }

  return (
    <ExplorerFrame>
      <header className="mb-7 border-b border-[var(--glyph-line)] pb-6">
        <div className="flex flex-col items-start gap-4">
          <IdentityAvatar identity={identity} label="Wallet identity avatar" radius={16} size={72} />
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--glyph-tertiary)]">Canonical identity</p>
            <div className="mt-2 flex items-start gap-2">
              <h1 className="min-w-0 break-all font-mono text-sm leading-6 text-[var(--glyph-ink)]">{identity}</h1>
              <CopyButton label="Copy identity" value={identity} />
            </div>
            <p className="mt-2 text-sm text-[var(--glyph-muted)]">Wallet identity and archive activity.</p>
          </div>
        </div>
      </header>

      <div className="space-y-8">
        <IdentitySummary assets={assets} balance={balance} />
        <TransactionHistory request={historyRequest} />
      </div>
    </ExplorerFrame>
  );
}
