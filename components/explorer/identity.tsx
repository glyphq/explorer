"use client";

import { ArrowLeft01Icon, ArrowRight01Icon, Cancel01Icon, Clock01Icon, Coins01Icon, Copy01Icon, CopyCheckIcon, FunctionIcon, QrCode01Icon, Tick01Icon, TransactionIcon, UserArrowLeftRightIcon, UserIcon } from "@hugeicons/core-free-icons";
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
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode, type SyntheticEvent } from "react";
import type { QueryTransaction } from "@qubic.org/rpc";
import { useQuery } from "@tanstack/react-query";

import { IdentityAvatar } from "@/components/identity";
import { GlyphMark } from "@/components/shell/glyph-mark";
import { GlyphButton } from "@/components/ui/button";
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
  createGlyphTransferClient,
  createIdentityTransferDraft,
  type GlyphTransferClient,
} from "@/lib/glyph";

import {
  ExplorerFrame,
  ExplorerLink,
  InvalidLookup,
  QueryRefreshMeta,
  QueryState,
  TableHeaderLabel,
  TableScroll,
} from "./primitives";

import { SkeletonLine } from "./skeletons";
import { formatNumber, formatTimestamp } from "./utils";

const assetQueryPolicy = { staleTime: 30_000, gcTime: 5 * 60_000 } as const;
const identityActionClass = "inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center border-0 bg-transparent p-0 text-[var(--glyph-muted)] transition-colors hover:text-[var(--glyph-ink)] focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[var(--glyph-focus)] disabled:cursor-not-allowed disabled:opacity-50";

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

function querySummaryValue<T>(
  query: { data: T | undefined; isPending: boolean; isError: boolean },
  format: (data: T) => string,
): ReactNode {
  if (query.isPending && query.data === undefined) return <SkeletonLine className="inline-block w-20 align-middle" />;
  if (query.isError && query.data === undefined) return "Unavailable";
  if (query.data === undefined) return "Not reported";
  return format(query.data);
}

function queryUsdBalance(
  balance: ReturnType<typeof useQubicBalance>,
  stats: ReturnType<typeof useLatestStats>,
): ReactNode {
  if (balance.isPending && balance.data === undefined) return <SkeletonLine className="inline-block w-16 align-middle" />;
  if (balance.isError && balance.data === undefined) return "Unavailable";
  if (balance.data === undefined) return "Not reported";
  if (stats.isPending && stats.data === undefined) return <SkeletonLine className="inline-block w-16 align-middle" />;
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
        size={18}
        strokeWidth={1.5}
      />
    </button>
  );
}

function IdentityQrDialog({ identity }: { identity: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeTimerRef = useRef<number | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [visible, setVisible] = useState(false);
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
    return () => {
      if (closeTimerRef.current !== undefined) window.clearTimeout(closeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      const frame = window.requestAnimationFrame(() => setVisible(true));
      return () => window.cancelAnimationFrame(frame);
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const close = () => {
    if (!open || closing) return;
    setClosing(true);
    setVisible(false);
    closeTimerRef.current = window.setTimeout(() => {
      setOpen(false);
      setClosing(false);
      closeTimerRef.current = undefined;
    }, 150);
  };
  const handleCancel = (event: SyntheticEvent<HTMLDialogElement>) => {
    event.preventDefault();
    close();
  };
  const label = "Show QR code";

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
        <HugeiconsIcon aria-hidden="true" focusable="false" icon={QrCode01Icon} size={18} strokeWidth={1.5} />
      </button>
      <dialog
        aria-labelledby="identity-qr-dialog-title"
        className={`m-auto w-[min(92vw,24rem)] origin-center rounded-2xl border border-[var(--glyph-line-strong)] bg-[var(--glyph-canvas)] p-0 text-[var(--glyph-ink)] shadow-[0_24px_80px_var(--glyph-shadow)] transition-[opacity,transform] duration-150 ease-out motion-reduce:transform-none motion-reduce:transition-none ${visible && !closing ? "scale-100 opacity-100" : "scale-95 opacity-0"} backdrop:bg-black/45`}
        id="identity-qr-dialog"
        onCancel={handleCancel}
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
              <div className="rounded-xl bg-white p-3">
                <Image
                  alt={`QR code for ${identity}`}
                  className="size-60 max-w-full rounded-lg"
                  height={240}
                  src={qrCode}
                  unoptimized
                  width={240}
                />
              </div>
            ) : <p className="text-sm text-[var(--glyph-muted)]" role="status">Preparing QR code…</p>}
            <code className="max-w-full break-all text-center font-mono text-xs text-[var(--glyph-muted)]">{identity}</code>
          </div>
        </div>
      </dialog>
    </>
  );
}

function glyphDappOrigin(): string {
  const configuredOrigin = process.env.NEXT_PUBLIC_GLYPH_DAPP_ORIGIN?.trim();
  return configuredOrigin ?? "";
}

function glyphCallbackPublicKeys(): string[] {
  const configuredKeys = process.env.NEXT_PUBLIC_GLYPH_WALLET_CALLBACK_PUBLIC_KEYS
    ?? process.env.NEXT_PUBLIC_GLYPH_WALLET_CALLBACK_PUBLIC_KEY
    ?? "";
  return configuredKeys.split(",").map((key) => key.trim()).filter(Boolean);
}

function IdentityGlyphSendButton({ identity }: { identity: string }) {
  const transferDraft = createIdentityTransferDraft(identity);
  const [client] = useState<GlyphTransferClient>(() => createGlyphTransferClient({
    dappOrigin: glyphDappOrigin(),
    recipient: transferDraft.to,
    recipientOnly: true,
    trustedPublicKeys: glyphCallbackPublicKeys(),
  }));
  const state = useSyncExternalStore(client.subscribe, client.getState, client.getState);
  const label = "Send with Glyph Wallet";
  const unavailableReasonId = "identity-glyph-send-unavailable-reason";
  const [unavailableHelpOpen, setUnavailableHelpOpen] = useState(false);
  const isPreparing = state.status === "preparing";
  const isWaiting = state.status === "waiting";
  const isRetry = state.status === "failed" || state.status === "rejected" || state.status === "signed";

  const handleClick = () => {
    if (state.status === "unavailable") {
      setUnavailableHelpOpen(true);
      return;
    }
    if (isPreparing || isWaiting) return;
    if (isRetry) client.reset();
    void client.prepare().catch(() => undefined);
  };

  return (
    <div className="group relative inline-flex items-center">
      <button
        aria-describedby={state.status === "unavailable" ? unavailableReasonId : undefined}
        aria-label={label}
        aria-busy={isPreparing || isWaiting}
        aria-disabled={state.status === "unavailable" ? true : undefined}
        aria-expanded={state.status === "unavailable" ? unavailableHelpOpen : undefined}
        className={identityActionClass}
        data-glyph-recipient={transferDraft.to}
        disabled={isPreparing || isWaiting}
        onClick={handleClick}
        title={state.status === "unavailable"
          ? state.reason
          : isPreparing
            ? "Preparing Glyph Wallet"
            : isWaiting
              ? "Waiting for Glyph Wallet"
              : state.status === "ready"
                ? "Enter amount to send with Glyph Wallet"
                : isRetry
                  ? `Retry ${label}`
                  : label}
        type="button"
      >
        <GlyphMark className="inline-flex size-[18px] shrink-0" />
      </button>
      {state.status === "unavailable" ? (
        <span
          className={`pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-[min(80vw,24rem)] -translate-x-1/2 rounded-lg border border-[var(--glyph-danger-line)] bg-[var(--glyph-danger-surface)] px-3 py-2 text-left text-xs leading-5 text-[var(--glyph-danger-ink)] shadow-[0_8px_24px_var(--glyph-shadow)] transition-opacity motion-reduce:transition-none ${unavailableHelpOpen ? "opacity-100" : "opacity-0 group-focus-within:opacity-100 group-hover:opacity-100"}`}
          id={unavailableReasonId}
          role="tooltip"
        >
          {state.reason}
        </span>
      ) : null}
    </div>
  );
}

function IdentityAssetChips({ assets }: { assets: ReturnType<typeof useIdentityAssets> }) {
  const records = (assets.owned.data ?? []).map((asset) => ({
    asset,
    name: asset.data?.issuedAsset?.name,
    units: asset.data?.numberOfUnits,
  }));
  const chips = new Map<string, { label: string; index?: number }>();

  for (const record of records) {
    const index = record.asset.info?.universeIndex;
    const name = record.name?.trim();
    if (record.units === undefined) continue;
    const label = name || (index === undefined ? undefined : `#${formatNumber(index)}`);
    if (!label) continue;

    const key = index === undefined ? `name:${label}` : `index:${index}`;
    chips.set(key, { index, label: `${label} · ${formatAtomicAmount(record.units)}` });
  }

  if (chips.size === 0) return null;

  return (
    <div aria-label="Assets held by this identity" className="mt-3 flex max-w-full flex-wrap justify-center gap-2" role="list">
      {[...chips.values()].map(({ index, label }) => (
        <span
          className="inline-flex max-w-full items-center rounded-full border border-[var(--glyph-line-strong)] bg-[var(--glyph-surface)] px-3 py-1 text-xs font-medium text-[var(--glyph-muted)]"
          key={index === undefined ? label : index}
          role="listitem"
          title={index === undefined ? label : `Asset ${formatNumber(index)}`}
        >
          <span className="break-all">{label}</span>
        </span>
      ))}
    </div>
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

export function getIdentityTransactionTypeDisplay(transaction: QueryTransaction): { label: string; detail?: string } {
  return { label: transaction.inputType === 0 ? "Transfer" : "Smart-contract call" };
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
    cell: ({ row }) => {
      const type = getIdentityTransactionTypeDisplay(row.original);
      return (
        <span
          aria-label={type.detail ? `${type.label}. ${type.detail}` : undefined}
          className="whitespace-nowrap text-xs text-[var(--glyph-ink)]"
          title={type.detail}
        >
          {type.label}
        </span>
      );
    },
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
  const hasNextPage = query.data
    ? getNextIdentityTransactionsOffset(query.data, offset, IDENTITY_TRANSACTION_PAGE_SIZE) !== undefined
    : false;

  return (
    <section aria-labelledby="identity-transactions" className="border-t border-[var(--glyph-line)] pt-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold tracking-[-0.03em] text-[var(--glyph-ink)]" id="identity-transactions">Transactions</h2>
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
            <option value="normal">Transfer (input type 0)</option>
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
            <TransactionTable transactions={transactions} />
            <nav aria-label="Transaction pages" className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <GlyphButton
                aria-label="Previous identity transaction page"
                className="rounded-lg"
                disabled={page === 0 || query.isFetching}
                icon={ArrowLeft01Icon}
                onClick={() => setPage((current) => Math.max(0, current - 1))}
                size="sm"
                variant="secondary"
              >
                Previous
              </GlyphButton>
              <span aria-live="polite" className="font-mono text-xs text-[var(--glyph-muted)]">
                Page {formatNumber(page + 1)}
              </span>
              <GlyphButton
                aria-label="Next identity transaction page"
                className="rounded-lg"
                disabled={!hasNextPage || query.isFetching}
                icon={ArrowRight01Icon}
                onClick={() => setPage((current) => current + 1)}
                size="sm"
                variant="secondary"
              >
                Next
              </GlyphButton>
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
      <header className="mb-4 pb-5 text-center">
        <div className="flex min-w-0 flex-col items-center">
          <IdentityAvatar identity={identity} label="Wallet identity avatar" radius={12} size={64} />
          <div className="mt-3 min-w-0 max-w-full">
            <div className="flex min-w-0 items-center justify-center">
              <h1 className="min-w-0 break-all font-mono text-2xl leading-7 text-[var(--glyph-ink)]">{identity}</h1>
            </div>
          </div>
        </div>
        <section aria-busy={balance.isPending || stats.isPending || assets.owned.isPending} aria-labelledby="identity-balance" className="mt-4">
          <h2 className="sr-only" id="identity-balance">Identity balance</h2>
          <p className="mt-1 font-mono text-2xl font-medium tracking-[0.01em] text-[var(--glyph-ink)]">
            {querySummaryValue(balance, (data) => formatAtomicAmount(data.balance))} <span className="text-base font-medium tracking-[0.02em] text-[var(--glyph-muted)]">QUBIC</span>
          </p>
          <p className="mt-1 text-sm text-[var(--glyph-muted)]">
            <span className="font-mono text-[var(--glyph-muted)]">≈ {queryUsdBalance(balance, stats)}</span>
          </p>
          <IdentityAssetChips assets={assets} />
          <div className="mt-2 flex items-center justify-center gap-0">
            <IdentityGlyphSendButton identity={identity} />
            <IdentityQrDialog identity={identity} />
            <IdentityCopyButton value={identity} />
          </div>
        </section>
      </header>

      <div className="space-y-8">
        <TransactionHistory request={historyRequest} />
      </div>
    </ExplorerFrame>
  );
}
