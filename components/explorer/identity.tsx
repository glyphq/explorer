"use client";

import { Cancel01Icon, Clock01Icon, Coins01Icon, Copy01Icon, CopyCheckIcon, FunctionIcon, QrCode01Icon, Tick01Icon, TransactionIcon, UserArrowLeftRightIcon, UserIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Image from "next/image";
import QRCode from "qrcode";
import {
  createColumnHelper,
  createSortedRowModel,
  rowSortingFeature,
  tableFeatures,
  type SortingState,
  useTable,
} from "@tanstack/react-table";
import { useEffect, useRef, useState } from "react";
import type { QueryTransaction } from "@qubic.org/rpc";
import { useQuery } from "@tanstack/react-query";

import { IdentityAvatar } from "@/components/identity";
import {
  getNextIdentityTransactionsOffset,
  IDENTITY_TRANSACTION_PAGE_SIZE,
  type IdentityTransactionFilter,
  useQubicBalance,
  useTransactionsForIdentityPage,
} from "@/lib/rpc/queries";
import { explorerData, type ExplorerTransactionsForIdentityRequest } from "@/lib/rpc/adapter";
import { formatAtomicAmount, formatIdentifier, formatTransactionHash } from "@/lib/rpc/validation";
import { useLatestStats } from "@/lib/stats";

import {
  ExplorerFrame,
  ExplorerLink,
  InvalidLookup,
  QueryRefreshMeta,
  QueryState,
  TableHeaderLabel,
  TableScroll,
} from "./primitives";
import { identifyContractInvocation, isSmartContractCall } from "./contracts";
import { formatNumber, formatTimestamp } from "./utils";

const assetQueryPolicy = { staleTime: 30_000, gcTime: 5 * 60_000 } as const;
const identityActionClass = "inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center border-0 bg-transparent p-0 text-[var(--glyph-muted)] transition-colors hover:text-[var(--glyph-ink)]";

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

function queryUsdBalance(
  balance: ReturnType<typeof useQubicBalance>,
  stats: ReturnType<typeof useLatestStats>,
): string {
  if (balance.isPending && balance.data === undefined) return "Loading…";
  if (balance.isError && balance.data === undefined) return "Unavailable";
  if (balance.data === undefined) return "Not reported";
  if (stats.isPending && stats.data === undefined) return "Price unavailable";
  if (stats.isError && stats.data === undefined) return "Price unavailable";

  const price = stats.data?.price;
  const numericBalance = Number(balance.data.balance);
  if (!Number.isFinite(price) || price === undefined || price <= 0 || !Number.isFinite(numericBalance)) {
    return "Price unavailable";
  }

  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 2,
    style: "currency",
  }).format(numericBalance * price);
}

function IdentityCopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const label = copied ? "Identity copied" : "Copy identity";

  async function copyValue() {
    if (!navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1_500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      aria-label={label}
      className={identityActionClass}
      onClick={() => void copyValue()}
      title={label}
      type="button"
    >
      <HugeiconsIcon
        aria-hidden="true"
        focusable="false"
        icon={copied ? CopyCheckIcon : Copy01Icon}
        size={16}
        strokeWidth={1.5}
      />
    </button>
  );
}

function IdentityQrDialog({ identity }: { identity: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [qrCode, setQrCode] = useState<string>();

  useEffect(() => {
    let active = true;
    void QRCode.toDataURL(identity, {
      color: { dark: "#000000", light: "#ffffff" },
      errorCorrectionLevel: "M",
      margin: 1,
      width: 240,
    }).then((value) => {
      if (active) setQrCode(value);
    }).catch(() => {
      if (active) setQrCode(undefined);
    });

    return () => {
      active = false;
    };
  }, [identity]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const close = () => setOpen(false);
  const label = "Show identity QR code";

  return (
    <>
      <button
        aria-controls="identity-qr-dialog"
        aria-expanded={open}
        aria-label={label}
        className={identityActionClass}
        onClick={() => setOpen(true)}
        title={label}
        type="button"
      >
        <HugeiconsIcon aria-hidden="true" focusable="false" icon={QrCode01Icon} size={16} strokeWidth={1.5} />
      </button>
      <dialog
        aria-labelledby="identity-qr-dialog-title"
        className="m-auto w-[min(92vw,24rem)] border border-[var(--glyph-line-strong)] bg-[var(--glyph-canvas)] p-0 text-[var(--glyph-ink)] shadow-[0_24px_80px_var(--glyph-shadow)] backdrop:bg-black/45"
        id="identity-qr-dialog"
        onCancel={close}
        ref={dialogRef}
      >
        <div className="p-5">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-base font-semibold tracking-[-0.03em]" id="identity-qr-dialog-title">Identity QR code</h2>
            <button
              aria-label="Close identity QR code"
              className={identityActionClass}
              onClick={close}
              title="Close identity QR code"
              type="button"
            >
              <HugeiconsIcon aria-hidden="true" focusable="false" icon={Cancel01Icon} size={16} strokeWidth={1.5} />
            </button>
          </div>
          <div className="mt-5 flex flex-col items-center gap-4">
            {qrCode ? (
              <Image
                alt={`QR code for ${identity}`}
                className="size-60 max-w-full"
                height={240}
                src={qrCode}
                unoptimized
                width={240}
              />
            ) : <p className="text-sm text-[var(--glyph-muted)]" role="status">Preparing QR code…</p>}
            <code className="max-w-full break-all text-center font-mono text-xs text-[var(--glyph-muted)]">{identity}</code>
          </div>
        </div>
      </dialog>
    </>
  );
}

function IdentitySummary({
  assets,
}: {
  assets: ReturnType<typeof useIdentityAssets>;
}) {
  return (
    <section aria-labelledby="identity-summary" className="border-b border-[var(--glyph-line)] pb-7">
      <h2 className="sr-only" id="identity-summary">Identity summary</h2>
      <dl className="flex flex-wrap gap-3" role="list">
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

function transactionTypeLabel(transaction: QueryTransaction): string {
  if (transaction.inputType === 0) return "Normal transaction";
  if (isSmartContractCall(transaction.inputType)) {
    const invocation = identifyContractInvocation(transaction);
    if (invocation.status === "recognized") {
      return `${invocation.contractName} · ${invocation.procedureName}`;
    }
    return "Smart-contract call";
  }
  return "Input type not reported";
}

const identityTableFeatures = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
});
const identityColumnHelper = createColumnHelper<typeof identityTableFeatures, QueryTransaction>();
const identityColumnLabels: Record<string, string> = {
  amount: "Amount",
  destination: "Destination",
  hash: "Transaction",
  inputType: "Type",
  source: "Source",
  tickNumber: "Tick",
  timestamp: "Time",
};
const identityColumns = identityColumnHelper.columns([
  identityColumnHelper.display({
    id: "hash",
    header: () => <TableHeaderLabel icon={TransactionIcon}>Transaction</TableHeaderLabel>,
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
    header: () => <TableHeaderLabel icon={UserIcon}>Source</TableHeaderLabel>,
    enableSorting: false,
    cell: ({ row }) => <TransactionIdentityCell label="Source" value={row.original.source} />,
  }),
  identityColumnHelper.accessor("destination", {
    header: () => <TableHeaderLabel icon={UserArrowLeftRightIcon}>Destination</TableHeaderLabel>,
    enableSorting: false,
    cell: ({ row }) => <TransactionIdentityCell label="Destination" value={row.original.destination} />,
  }),
  identityColumnHelper.accessor("inputType", {
    header: () => <TableHeaderLabel icon={FunctionIcon}>Type</TableHeaderLabel>,
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-xs text-[var(--glyph-ink)]">
        {transactionTypeLabel(row.original)}
        {row.original.inputType !== undefined ? (
          <span className="ml-1 font-mono text-[var(--glyph-tertiary)]">({formatNumber(row.original.inputType)})</span>
        ) : null}
      </span>
    ),
  }),
  identityColumnHelper.accessor("tickNumber", {
    header: () => <TableHeaderLabel icon={Tick01Icon}>Tick</TableHeaderLabel>,
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
    header: () => <TableHeaderLabel icon={Clock01Icon}>Time</TableHeaderLabel>,
    cell: ({ row }) => <span className="whitespace-nowrap text-xs text-[var(--glyph-muted)]">{formatTimestamp(row.original.timestamp)}</span>,
  }),
  identityColumnHelper.accessor((transaction) => amountSortValue(transaction.amount), {
    id: "amount",
    header: () => <TableHeaderLabel icon={Coins01Icon}>Amount</TableHeaderLabel>,
    cell: ({ row }) => (
      <span className="whitespace-nowrap font-mono text-xs text-[var(--glyph-ink)]">
        {row.original.amount !== undefined && row.original.amount !== null
          ? formatAtomicAmount(row.original.amount)
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
    <TableScroll>
      <table className="glyph-table min-w-[980px] w-full border-collapse text-left" aria-label="Identity transaction history">
        <caption className="sr-only">Identity transaction history</caption>
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const label = identityColumnLabels[header.column.id] ?? "Column";
                const sorted = header.column.getIsSorted();
                return (
                  <th className="font-medium" key={header.id} scope="col" aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : "none"}>
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
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr className="align-top text-sm" key={row.id}>
              {row.getAllCells().map((cell) => (
                <td className="py-3" key={cell.id}>
                  <table.FlexRender cell={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </TableScroll>
  );
}

function TransactionHistory({ request }: { request: ExplorerTransactionsForIdentityRequest }) {
  const [filter, setFilter] = useState<IdentityTransactionFilter>("all");
  const [page, setPage] = useState(0);
  const offset = page * IDENTITY_TRANSACTION_PAGE_SIZE;
  const query = useTransactionsForIdentityPage(request, filter, offset, IDENTITY_TRANSACTION_PAGE_SIZE);
  const transactions = query.data?.transactions ?? [];
  const total = query.data?.hits.total;
  const validForTick = query.data?.validForTick;
  const hasNextPage = query.data
    ? getNextIdentityTransactionsOffset(query.data, offset, IDENTITY_TRANSACTION_PAGE_SIZE) !== undefined
    : false;

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
            className="glyph-input min-h-10 px-3 font-medium text-[var(--glyph-ink)] focus-visible:outline-1 focus-visible:outline-offset-1 focus-visible:outline-[var(--glyph-focus)]"
            onChange={(event) => {
              setFilter(event.target.value as IdentityTransactionFilter);
              setPage(0);
            }}
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
        emptyWhen={(data) => {
          if (!data || typeof data !== "object" || !("transactions" in data)) return false;
          return Array.isArray((data as { transactions?: unknown }).transactions)
            && (data as { transactions: unknown[] }).transactions.length === 0;
        }}
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
            <nav aria-label="Transaction pages" className="mt-5 flex flex-wrap items-center gap-3">
              <button
                className="min-h-11 border border-[var(--glyph-line-strong)] bg-[var(--glyph-surface)] px-4 text-sm font-semibold text-[var(--glyph-ink)] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={page === 0 || query.isFetching}
                onClick={() => setPage((current) => Math.max(0, current - 1))}
                type="button"
              >
                Previous
              </button>
              <span aria-live="polite" className="font-mono text-xs text-[var(--glyph-muted)]">
                Page {formatNumber(page + 1)}
              </span>
              <button
                className="min-h-11 border border-[var(--glyph-line-strong)] bg-[var(--glyph-ink)] px-4 text-sm font-semibold text-[var(--glyph-canvas)] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!hasNextPage || query.isFetching}
                onClick={() => setPage((current) => current + 1)}
                type="button"
              >
                Next
              </button>
            </nav>
          </>
        ) : null}
      </QueryState>
      <QueryRefreshMeta query={query} />
    </section>
  );
}

export function IdentityPage({ identity }: { identity: string | null }) {
  const balance = useQubicBalance(identity);
  const stats = useLatestStats();
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
        <div className="flex min-w-0 items-center">
          <div className="min-w-0 max-w-full">
            <div className="flex items-center">
              <h1 className="min-w-0 break-all font-mono text-2xl leading-7 text-[var(--glyph-ink)]">{identity}</h1>
              <span className="flex shrink-0 items-center gap-0">
                <IdentityCopyButton value={identity} />
                <IdentityQrDialog identity={identity} />
              </span>
            </div>
          </div>
        </div>
        <section aria-labelledby="identity-balance" className="mt-6">
          <h2 className="sr-only" id="identity-balance">Identity balance</h2>
          <p className="mt-1 font-mono text-xl font-semibold tracking-[-0.03em] text-[var(--glyph-ink)]">
            {querySummaryValue(balance, (data) => formatAtomicAmount(data.balance))} <span className="text-base font-medium tracking-normal text-[var(--glyph-muted)]">QUBIC</span>
          </p>
          <p className="mt-1 text-sm text-[var(--glyph-muted)]">
            <span className="font-mono text-[var(--glyph-muted)]">≈ {queryUsdBalance(balance, stats)}</span>
          </p>
          <QueryRefreshMeta query={balance} />
        </section>
      </header>

      <div className="space-y-8">
        <IdentitySummary assets={assets} />
        <TransactionHistory request={historyRequest} />
      </div>
    </ExplorerFrame>
  );
}
