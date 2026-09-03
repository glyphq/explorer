"use client";

import { Coins01Icon, HashtagIcon, IdentityCardIcon, Tick01Icon } from "@hugeicons/core-free-icons";
import { useMemo, useState } from "react";

import { IdentityAvatar } from "@/components/identity";
import { getAssetIssuanceHref, normalizeAssetIssuances, type AssetIssuanceRow } from "@/lib/assets";
import { useAssetIssuances } from "@/lib/rpc/queries";
import {
  formatIdentifier,
  formatTick,
  normalizeIdentity,
  normalizeTick,
} from "@/lib/rpc/validation";

import {
  ExplorerFrame,
  ExplorerLink,
  QueryRefreshMeta,
  QueryState,
  TableHeaderLabel,
  TableScroll,
} from "./primitives";
import { SkeletonTable } from "./skeletons";
import { formatNumber } from "./utils";

function IssuerCell({ value }: { value: string | undefined }) {
  const identity = normalizeIdentity(value);
  if (!value) return <span className="text-[var(--glyph-tertiary)]">—</span>;

  return identity ? (
    <span className="flex min-w-0 items-center gap-2" title={identity}>
      <IdentityAvatar identity={identity} label="Issuer identicon" radius={4} size={20} />
      <ExplorerLink href={`/identity/${identity}`}>{formatIdentifier(identity)}</ExplorerLink>
    </span>
  ) : (
    <code className="font-mono text-xs text-[var(--glyph-muted)]" title={value}>
      {formatIdentifier(value)}
    </code>
  );
}

function TickCell({ value }: { value: number | undefined }) {
  const tick = normalizeTick(value);
  return tick === null ? (
    <span className="text-[var(--glyph-tertiary)]">—</span>
  ) : (
    <ExplorerLink href={`/tick/${tick}`}>{formatTick(tick)}</ExplorerLink>
  );
}

function TokenNameCell({ row }: { row: AssetIssuanceRow }) {
  const name = row.assetName ?? <span className="font-normal text-[var(--glyph-tertiary)]">Unnamed</span>;
  const href = getAssetIssuanceHref(row.universeIndex);
  return href ? <ExplorerLink href={href}>{name}</ExplorerLink> : name;
}

function TokenTable({ rows }: { rows: readonly AssetIssuanceRow[] }) {
  return (
    <TableScroll>
      <table className="glyph-table min-w-[760px] w-full border-collapse text-left" aria-label="Qubic tokens">
        <caption className="sr-only">Tokens reported by the official Qubic live API</caption>
        <thead>
          <tr>
            <th className="font-medium" scope="col"><TableHeaderLabel icon={Coins01Icon}>Token</TableHeaderLabel></th>
            <th className="text-right font-medium" scope="col"><TableHeaderLabel icon={HashtagIcon}>Index</TableHeaderLabel></th>
            <th className="font-medium" scope="col"><TableHeaderLabel icon={IdentityCardIcon}>Issuer</TableHeaderLabel></th>
            <th className="text-right font-medium" scope="col"><TableHeaderLabel icon={Tick01Icon}>Issued at</TableHeaderLabel></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr className="align-top text-sm" key={row.key}>
              <td className="py-3 font-semibold text-[var(--glyph-ink)]">
                <TokenNameCell row={row} />
              </td>
              <td className="whitespace-nowrap py-3 text-right font-mono text-xs text-[var(--glyph-ink)]">
                {row.universeIndex === undefined ? "—" : formatNumber(row.universeIndex)}
              </td>
              <td className="py-3"><IssuerCell value={row.issuerIdentity} /></td>
              <td className="whitespace-nowrap py-3 text-right font-mono text-xs"><TickCell value={row.tickNumber} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableScroll>
  );
}

export function TokensPage() {
  const query = useAssetIssuances();
  const [search, setSearch] = useState("");
  const rows = useMemo(() => normalizeAssetIssuances(query.data ?? []), [query.data]);
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const filteredRows = useMemo(() => {
    if (!normalizedSearch) return rows;
    return rows.filter((row) =>
      [row.assetName, row.issuerIdentity, row.universeIndex?.toString()]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLocaleLowerCase().includes(normalizedSearch)),
    );
  }, [normalizedSearch, rows]);

  return (
    <ExplorerFrame>
      <header className="mb-5 flex flex-wrap items-end justify-between gap-4 border-b border-[var(--glyph-line)] pb-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.05em] text-[var(--glyph-ink)]">Tokens</h1>
        </div>
        <div className="flex items-center gap-3">
          <label className="sr-only" htmlFor="token-search">Filter tokens</label>
          <input
            className="glyph-input h-9 w-48 px-3 text-sm text-[var(--glyph-ink)] placeholder:text-[var(--glyph-tertiary)] focus-visible:outline-1 focus-visible:outline-offset-1 focus-visible:outline-[var(--glyph-focus)]"
            id="token-search"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Filter tokens"
            type="search"
            value={search}
          />
          <span className="font-mono text-xs text-[var(--glyph-tertiary)]">
            {formatNumber(filteredRows.length)}{normalizedSearch ? ` / ${formatNumber(rows.length)}` : ""}
          </span>
        </div>
      </header>

      <QueryState
        emptyMessage="No tokens match this filter."
        emptyWhen={() => query.isSuccess && filteredRows.length === 0}
        label="tokens"
        loading={<SkeletonTable columns={4} label="Loading token rows" minWidth="min-w-[760px]" rows={8} />}
        query={query}
      >
        {filteredRows.length > 0 ? <TokenTable rows={filteredRows} /> : null}
      </QueryState>

      <QueryRefreshMeta query={query} />
    </ExplorerFrame>
  );
}
