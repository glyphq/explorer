"use client";

import { useQuery } from "@tanstack/react-query";
import type { IssuedAsset, OwnedAsset, PossessedAsset } from "@qubic.org/rpc";

import {
  useQubicBalance,
  useTransactionsForIdentity,
} from "@/lib/rpc/queries";
import { explorerData, type ExplorerTransactionsForIdentityRequest } from "@/lib/rpc/adapter";
import { formatAtomicAmount, formatTransactionHash } from "@/lib/rpc/validation";
import { IdentityAvatar } from "@/components/identity";

import {
  ExplorerFrame,
  CopyButton,
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

function AssetList({
  assets,
  kind,
}: {
  assets: IssuedAsset[] | OwnedAsset[] | PossessedAsset[];
  kind: "issued" | "owned" | "possessed";
}) {
  if (assets.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-[520px] w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-[var(--glyph-line)] text-[0.68rem] uppercase tracking-[0.08em] text-[var(--glyph-tertiary)]">
            <th className="pb-3 pr-4 font-medium" scope="col">Asset</th>
            {kind !== "issued" ? <th className="pb-3 pr-4 text-right font-medium" scope="col">Units</th> : null}
            <th className="pb-3 pr-4 text-right font-medium" scope="col">Index</th>
            <th className="pb-3 text-right font-medium" scope="col">Tick</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--glyph-line)]">
      {assets.slice(0, 8).map((asset, index) => {
        const data = asset.data;
        const info = asset.info;
        const name =
          kind === "issued"
            ? (data as IssuedAsset["data"])?.name
            : kind === "owned"
              ? (data as OwnedAsset["data"])?.issuedAsset?.name
              : (data as PossessedAsset["data"])?.ownedAsset?.issuedAsset?.name;
        const units =
          kind === "issued"
            ? undefined
            : kind === "owned"
              ? (data as OwnedAsset["data"])?.numberOfUnits
              : (data as PossessedAsset["data"])?.numberOfUnits;

        return (
          <tr className="align-top text-sm" key={`${info?.universeIndex ?? index}-${name ?? "asset"}`}>
            <td className="py-3 pr-4 font-medium text-[var(--glyph-ink)]">{name || "Unnamed asset"}</td>
            {kind !== "issued" ? (
              <td className="whitespace-nowrap py-3 pr-4 text-right font-mono text-xs text-[var(--glyph-ink)]">
                {units !== undefined ? `${formatAtomicAmount(units)} raw units` : "Not reported"}
              </td>
            ) : null}
            <td className="whitespace-nowrap py-3 pr-4 text-right font-mono text-xs text-[var(--glyph-muted)]">{formatNumber(info?.universeIndex)}</td>
            <td className="whitespace-nowrap py-3 text-right font-mono text-xs text-[var(--glyph-muted)]">{formatNumber(info?.tick)}</td>
          </tr>
        );
      })}
        </tbody>
      </table>
    </div>
  );
}

function AssetPanel({
  title,
  kind,
  query,
}: {
  title: string;
  kind: "issued" | "owned" | "possessed";
  query: ReturnType<typeof useIdentityAssets>["issued"];
}) {
  return (
    <div className="min-w-0">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold text-[var(--glyph-ink)]">{title}</h3>
        {Array.isArray(query.data) ? <span className="font-mono text-xs text-[var(--glyph-tertiary)]">{formatNumber(query.data.length)}</span> : null}
      </div>
      <QueryState
        emptyMessage={`No ${kind} assets.`}
        emptyWhen={(data) => Array.isArray(data) && data.length === 0}
        label={`${kind} assets`}
        query={query}
      >
        {Array.isArray(query.data) ? <AssetList assets={query.data} kind={kind} /> : null}
      </QueryState>
      <QueryRefreshMeta query={query} />
    </div>
  );
}

function TransactionHistory({
  query,
}: {
  query: ReturnType<typeof useTransactionsForIdentity>;
}) {
  return (
    <section aria-labelledby="identity-transactions" className="border-t border-[var(--glyph-line)] pt-6">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-base font-semibold tracking-[-0.03em] text-[var(--glyph-ink)]" id="identity-transactions">Transactions</h2>
        {query.data ? (
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--glyph-tertiary)]">
            <span><span className="mr-1 uppercase tracking-[0.08em]">Showing</span><span className="font-mono text-[var(--glyph-ink)]">{formatNumber(query.data.transactions.length)}</span></span>
            <span><span className="mr-1 uppercase tracking-[0.08em]">Matches</span><span className="font-mono text-[var(--glyph-ink)]">{formatNumber(query.data.hits.total)}</span></span>
            <span><span className="mr-1 uppercase tracking-[0.08em]">Valid tick</span><span className="font-mono text-[var(--glyph-ink)]">{formatNumber(query.data.validForTick)}</span></span>
          </div>
        ) : null}
      </div>
      <QueryState
        emptyMessage="No transactions."
        emptyWhen={(data) => {
          if (!data || typeof data !== "object") return false;
          const result = data as { transactions?: unknown[] };
          return Array.isArray(result.transactions) && result.transactions.length === 0;
        }}
        label="identity transaction history"
        query={query}
      >
        {query.data ? (
          <div className="overflow-x-auto">
            <table className="min-w-[680px] w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-[var(--glyph-line)] text-[0.68rem] uppercase tracking-[0.08em] text-[var(--glyph-tertiary)]">
                  <th className="pb-3 pr-4 font-medium" scope="col">Hash</th>
                  <th className="pb-3 pr-4 text-right font-medium" scope="col">Tick</th>
                  <th className="pb-3 pr-4 font-medium" scope="col">Time</th>
                  <th className="pb-3 text-right font-medium" scope="col">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--glyph-line)]">
              {query.data.transactions.map((transaction, index) => (
                <tr className="align-top text-sm" key={`${transaction.hash ?? "transaction"}-${index}`}>
                  <td className="max-w-[22rem] break-all py-3 pr-4">
                    {transaction.hash ? (
                      <ExplorerLink href={`/transaction/${transaction.hash}`}>
                        <span title={transaction.hash}>{formatTransactionHash(transaction.hash)}</span>
                      </ExplorerLink>
                    ) : (
                      <span className="text-xs text-[var(--glyph-tertiary)]">Not reported</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap py-3 pr-4 text-right font-mono text-xs text-[var(--glyph-muted)]">{formatNumber(transaction.tickNumber)}</td>
                  <td className="whitespace-nowrap py-3 pr-4 text-xs text-[var(--glyph-muted)]">{formatTimestamp(transaction.timestamp)}</td>
                  <td className="whitespace-nowrap py-3 text-right font-mono text-xs text-[var(--glyph-ink)]">
                    {transaction.amount !== undefined && transaction.amount !== null ? `${formatAtomicAmount(transaction.amount)} raw units` : "Not reported"}
                  </td>
                </tr>
              ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </QueryState>
      <QueryRefreshMeta query={query} />
    </section>
  );
}

export function IdentityPage({ identity }: { identity: string | null }) {
  const balance = useQubicBalance(identity);
  const assets = useIdentityAssets(identity);
  const historyRequest: ExplorerTransactionsForIdentityRequest | null = identity
    ? {
        identity,
        pagination: { offset: 0, size: 8 },
      }
    : null;
  const history = useTransactionsForIdentity(historyRequest);

  if (!identity) {
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
      <div className="mb-4 flex items-start gap-2 border-b border-[var(--glyph-line)] pb-4">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <IdentityAvatar identity={identity} />
          <code className="min-w-0 break-all pt-2 font-mono text-xs leading-5 text-[var(--glyph-ink)]">{identity}</code>
        </div>
        <CopyButton label="Copy identity" value={identity} />
      </div>

      <div className="space-y-8">
        <section aria-labelledby="identity-balance" className="border-b border-[var(--glyph-line)] pb-7">
          <h2 className="mb-4 text-base font-semibold tracking-[-0.03em] text-[var(--glyph-ink)]" id="identity-balance">Balance</h2>
          <QueryState label="identity balance" noResultMessage="No balance." query={balance}>
            {balance.data ? (
              <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
                <div className="sm:col-span-2 lg:col-span-2">
                  <dt className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--glyph-tertiary)]">Balance</dt>
                  <dd className="mt-1 font-mono text-lg font-semibold text-[var(--glyph-ink)]">{formatAtomicAmount(balance.data.balance)} raw units</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--glyph-tertiary)]">Valid tick</dt>
                  <dd className="mt-1 font-mono text-sm text-[var(--glyph-ink)]">{formatNumber(balance.data.validForTick)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--glyph-tertiary)]">Incoming</dt>
                  <dd className="mt-1 font-mono text-sm text-[var(--glyph-ink)]">{formatNumber(balance.data.numberOfIncomingTransfers)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--glyph-tertiary)]">Outgoing</dt>
                  <dd className="mt-1 font-mono text-sm text-[var(--glyph-ink)]">{formatNumber(balance.data.numberOfOutgoingTransfers)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--glyph-tertiary)]">Received</dt>
                  <dd className="mt-1 font-mono text-sm text-[var(--glyph-ink)]">{formatAtomicAmount(balance.data.incomingAmount)} raw units</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--glyph-tertiary)]">Sent</dt>
                  <dd className="mt-1 font-mono text-sm text-[var(--glyph-ink)]">{formatAtomicAmount(balance.data.outgoingAmount)} raw units</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--glyph-tertiary)]">Latest incoming</dt>
                  <dd className="mt-1 font-mono text-sm text-[var(--glyph-ink)]">{formatNumber(balance.data.latestIncomingTransferTick)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--glyph-tertiary)]">Latest outgoing</dt>
                  <dd className="mt-1 font-mono text-sm text-[var(--glyph-ink)]">{formatNumber(balance.data.latestOutgoingTransferTick)}</dd>
                </div>
              </dl>
            ) : null}
          </QueryState>
          <QueryRefreshMeta query={balance} />
        </section>

        <section aria-labelledby="identity-assets">
          <h2 className="mb-4 text-base font-semibold tracking-[-0.03em] text-[var(--glyph-ink)]" id="identity-assets">Assets</h2>
          <div className="grid gap-7 lg:grid-cols-3 lg:gap-6">
            <AssetPanel kind="issued" query={assets.issued} title="Issued" />
            <AssetPanel kind="owned" query={assets.owned} title="Owned" />
            <AssetPanel kind="possessed" query={assets.possessed} title="Possessed" />
          </div>
        </section>

        <TransactionHistory query={history} />
      </div>
    </ExplorerFrame>
  );
}
