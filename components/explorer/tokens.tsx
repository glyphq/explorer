"use client";

import { useMemo, useState } from "react";

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
} from "./primitives";
import { formatNumber } from "./utils";

function IssuerCell({ value }: { value: string | undefined }) {
  const identity = normalizeIdentity(value);
  if (!value) return <span className="text-[var(--glyph-tertiary)]">—</span>;

  return identity ? (
    <ExplorerLink href={`/identity/${identity}`}>
      <span title={identity}>{formatIdentifier(identity)}</span>
    </ExplorerLink>
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
    <div className="-mx-4 overflow-x-auto sm:mx-0">
      <table className="min-w-[760px] w-full border-collapse text-left" aria-label="Qubic tokens">
        <caption className="sr-only">Tokens reported by the official Qubic live API</caption>
        <thead>
          <tr className="border-b border-[var(--glyph-line)] text-[0.68rem] uppercase tracking-[0.08em] text-[var(--glyph-tertiary)]">
            <th className="px-4 pb-3 font-medium sm:px-0" scope="col">Token</th>
            <th className="px-4 pb-3 text-right font-medium" scope="col">Index</th>
            <th className="px-4 pb-3 font-medium" scope="col">Issuer</th>
            <th className="px-4 pb-3 text-right font-medium" scope="col">Issued at</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--glyph-line)]">
          {rows.map((row) => (
            <tr className="align-top text-sm text-[var(--glyph-muted)]" key={row.key}>
              <td className="px-4 py-3 font-semibold text-[var(--glyph-ink)] sm:px-0">
                <TokenNameCell row={row} />
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-xs text-[var(--glyph-ink)]">
                {row.universeIndex === undefined ? "—" : formatNumber(row.universeIndex)}
              </td>
              <td className="px-4 py-3"><IssuerCell value={row.issuerIdentity} /></td>
              <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-xs"><TickCell value={row.tickNumber} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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
            className="h-9 w-48 border border-[var(--glyph-line)] bg-transparent px-3 text-sm text-[var(--glyph-ink)] outline-none placeholder:text-[var(--glyph-tertiary)] focus:border-[var(--glyph-ink)]"
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
        query={query}
      >
        {filteredRows.length > 0 ? <TokenTable rows={filteredRows} /> : null}
      </QueryState>

      <QueryRefreshMeta query={query} />
    </ExplorerFrame>
  );
}
