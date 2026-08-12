"use client";

import { useLastProcessedTick, useLiveTickInfo } from "@/lib/rpc/queries";
import { GlyphButton } from "@/components/ui/button";

import {
  ExplorerFrame,
  ExplorerPageHeader,
  Panel,
  QueryRefreshMeta,
  QueryState,
  SearchForm,
  type ExplorerQuery,
} from "./primitives";
import { formatNumber } from "./utils";

function HealthRow({
  label,
  query,
}: {
  label: string;
  query: Pick<ExplorerQuery<unknown>, "data" | "isError" | "isPending" | "isFetching">;
}) {
  const state = query.isPending && query.data === undefined
    ? "Loading"
    : query.isError && query.data === undefined
      ? "Unavailable"
      : query.isError
        ? "Stale data"
        : query.data === undefined
          ? "No data"
          : query.isFetching
            ? "Refreshing"
            : "Available";
  const stateClass = state === "Available" || state === "Refreshing"
    ? "text-[var(--glyph-ink)]"
    : state === "Stale data" || state === "Loading"
      ? "text-[var(--glyph-muted)]"
      : "text-[var(--glyph-tertiary)]";

  return (
    <div className="flex items-center justify-between gap-4 py-2.5 text-sm">
      <span className="text-[var(--glyph-muted)]">{label}</span>
      <span className={`font-mono text-xs font-medium ${stateClass}`}>
        <span aria-hidden="true">● </span>{state}
      </span>
    </div>
  );
}

export function ExplorerHome() {
  const live = useLiveTickInfo();
  const indexed = useLastProcessedTick();
  const refreshing = live.isFetching || indexed.isFetching;

  async function refreshOverview() {
    await Promise.all([live.refetch(), indexed.refetch()]);
  }

  return (
    <ExplorerFrame>
      <ExplorerPageHeader
        description="Live network state and archive coverage."
        eyebrow="Explorer / overview"
        title="Network overview"
      >
        <GlyphButton
          aria-busy={refreshing}
          disabled={refreshing}
          onClick={() => void refreshOverview()}
          size="sm"
          variant="secondary"
        >
          {refreshing ? "Refreshing…" : "Refresh"}
        </GlyphButton>
      </ExplorerPageHeader>

      <section aria-labelledby="lookup-heading" className="mb-6 border-b border-[var(--glyph-line)] pb-6">
        <div className="mb-3 flex items-baseline justify-between gap-4">
          <h2 className="text-base font-semibold tracking-[-0.02em]" id="lookup-heading">Lookup</h2>
          <span className="font-mono text-[0.65rem] uppercase tracking-[0.12em] text-[var(--glyph-tertiary)]">Read only</span>
        </div>
        <SearchForm compact />
      </section>

      <section aria-labelledby="metrics-heading">
        <div className="mb-3 flex items-baseline justify-between gap-4">
          <h2 className="text-base font-semibold tracking-[-0.02em]" id="metrics-heading">Network metrics</h2>
          <span className="text-xs text-[var(--glyph-tertiary)]">RPC-backed</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Panel eyebrow="Live" title="Current tick">
            <QueryState label="current tick" noResultMessage="No live tick" query={live}>
              {live.data ? (
                <>
                  <p className="font-mono text-3xl font-semibold tracking-[-0.05em]">{formatNumber(live.data.tick)}</p>
                  <p className="mt-2 text-xs text-[var(--glyph-tertiary)]">Epoch {formatNumber(live.data.epoch)}</p>
                </>
              ) : null}
            </QueryState>
            <QueryRefreshMeta query={live} />
          </Panel>

          <Panel eyebrow="Archive" title="Indexed tick">
            <QueryState label="indexed tick" noResultMessage="No indexed tick" query={indexed}>
              {indexed.data ? (
                <>
                  <p className="font-mono text-3xl font-semibold tracking-[-0.05em]">{formatNumber(indexed.data.tickNumber)}</p>
                  <p className="mt-2 text-xs text-[var(--glyph-tertiary)]">Epoch {formatNumber(indexed.data.epoch)}</p>
                </>
              ) : null}
            </QueryState>
            <QueryRefreshMeta query={indexed} />
          </Panel>

          <Panel eyebrow="Live endpoint" title="Live API">
            <HealthRow label="Status" query={live} />
            <p className="mt-3 border-t border-[var(--glyph-line)] pt-3 text-xs text-[var(--glyph-tertiary)]">
              Tick info endpoint
            </p>
          </Panel>

          <Panel eyebrow="Archive endpoint" title="Query API">
            <HealthRow label="Status" query={indexed} />
            <p className="mt-3 border-t border-[var(--glyph-line)] pt-3 text-xs text-[var(--glyph-tertiary)]">
              Archive progress endpoint
            </p>
          </Panel>
        </div>
      </section>

      <p className="mt-4 text-xs leading-5 text-[var(--glyph-tertiary)]">
        Available means the latest response returned data. Stale data means refresh failed after an earlier response.
      </p>
    </ExplorerFrame>
  );
}
