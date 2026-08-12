"use client";

import { useQuery } from "@tanstack/react-query";
import type { IssuedAsset, OwnedAsset, PossessedAsset } from "@qubic.org/rpc";

import {
  useQubicBalance,
  useTransactionsForIdentity,
} from "@/lib/rpc/queries";
import { explorerData, type ExplorerTransactionsForIdentityRequest } from "@/lib/rpc/adapter";
import { formatAtomicAmount, formatIdentity } from "@/lib/rpc/validation";
import { IdentityAvatar } from "@/components/identity";

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
    <ul className="divide-y divide-[var(--glyph-line)]">
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
          <li className="grid gap-2 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center" key={`${info?.universeIndex ?? index}-${name ?? "asset"}`}>
            <div>
              <p className="font-medium text-[var(--glyph-ink)]">{name || "Unnamed asset"}</p>
              <p className="mt-1 text-xs text-[var(--glyph-tertiary)]">
                Universe index: {formatNumber(info?.universeIndex)} · Tick: {formatNumber(info?.tick)}
              </p>
            </div>
            {units !== undefined ? (
              <p className="font-mono text-sm text-[var(--glyph-ink)]">{formatAtomicAmount(units)} raw units</p>
            ) : null}
          </li>
        );
      })}
    </ul>
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
    <Panel title={title}>
      {Array.isArray(query.data) ? (
        <div className="mb-4 flex items-baseline justify-between border-b border-[var(--glyph-line)] pb-3 text-xs">
          <span className="text-[var(--glyph-tertiary)]">Assets returned</span>
          <span className="font-mono text-[var(--glyph-ink)]">{formatNumber(query.data.length)}</span>
        </div>
      ) : null}
      <QueryState
        emptyMessage={`No ${kind} assets were returned for this identity.`}
        emptyWhen={(data) => Array.isArray(data) && data.length === 0}
        label={`${kind} assets`}
        query={query}
      >
        {Array.isArray(query.data) ? <AssetList assets={query.data} kind={kind} /> : null}
      </QueryState>
      <QueryRefreshMeta query={query} />
    </Panel>
  );
}

function TransactionHistory({
  identity,
  query,
}: {
  identity: string;
  query: ReturnType<typeof useTransactionsForIdentity>;
}) {
  return (
    <Panel title="Transaction history">
      <QueryState
        emptyMessage="No transactions were returned for this identity."
        emptyWhen={(data) => {
          if (!data || typeof data !== "object") return false;
          const result = data as { transactions?: unknown[] };
          return Array.isArray(result.transactions) && result.transactions.length === 0;
        }}
        label="identity transaction history"
        query={query}
      >
        {query.data ? (
          <>
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2 border-b border-[var(--glyph-line)] pb-4">
              <p className="text-sm text-[var(--glyph-muted)]">
                Returned {formatNumber(query.data.transactions.length)} of {formatNumber(query.data.hits.total)} indexed matches.
              </p>
              <p className="text-xs text-[var(--glyph-tertiary)]">
                Response valid for tick {formatNumber(query.data.validForTick)}
              </p>
            </div>
            <ul className="divide-y divide-[var(--glyph-line)]">
              {query.data.transactions.map((transaction, index) => (
                <li className="py-4" key={`${transaction.hash ?? "transaction"}-${index}`}>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      {transaction.hash ? (
                        <ExplorerLink href={`/transaction/${transaction.hash}`}>
                          {transaction.hash}
                        </ExplorerLink>
                      ) : (
                        <p className="font-mono text-xs text-[var(--glyph-tertiary)]">Hash not reported</p>
                      )}
                      <p className="mt-2 text-xs text-[var(--glyph-tertiary)]">
                        Tick {formatNumber(transaction.tickNumber)} · {formatTimestamp(transaction.timestamp)}
                      </p>
                    </div>
                    <p className="font-mono text-sm text-[var(--glyph-ink)]">
                      {transaction.amount !== undefined && transaction.amount !== null ? `${formatAtomicAmount(transaction.amount)} raw units` : "Amount not reported"}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </QueryState>
      <p className="mt-5 border-t border-[var(--glyph-line)] pt-4 text-xs text-[var(--glyph-tertiary)]">
        <code className="font-mono">{formatIdentity(identity)}</code> · first 8 results
      </p>
      <QueryRefreshMeta query={query} />
    </Panel>
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

      <div>
        <Panel title="Balance">
          <QueryState label="identity balance" noResultMessage="No balance was returned for this identity." query={balance}>
            {balance.data ? (
              <KeyValueList
                items={[
                  { label: "Balance", value: `${formatAtomicAmount(balance.data.balance)} raw units`, wide: true },
                  { label: "Balance valid for tick", value: formatNumber(balance.data.validForTick) },
                  { label: "Incoming transfers", value: formatNumber(balance.data.numberOfIncomingTransfers) },
                  { label: "Outgoing transfers", value: formatNumber(balance.data.numberOfOutgoingTransfers) },
                  { label: "Total received", value: `${formatAtomicAmount(balance.data.incomingAmount)} raw units` },
                  { label: "Total sent", value: `${formatAtomicAmount(balance.data.outgoingAmount)} raw units` },
                  { label: "Latest incoming tick", value: formatNumber(balance.data.latestIncomingTransferTick) },
                  { label: "Latest outgoing tick", value: formatNumber(balance.data.latestOutgoingTransferTick) },
                ]}
              />
            ) : null}
          </QueryState>
          <QueryRefreshMeta query={balance} />
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <AssetPanel kind="issued" query={assets.issued} title="Issued assets" />
        <AssetPanel kind="owned" query={assets.owned} title="Owned assets" />
        <AssetPanel kind="possessed" query={assets.possessed} title="Possessed assets" />
      </div>

      <div className="mt-4">
        <TransactionHistory identity={identity} query={history} />
      </div>
    </ExplorerFrame>
  );
}
