"use client";

import { useLastProcessedTick, useLiveTickInfo } from "@/lib/rpc/queries";
import { GlyphButton } from "@/components/ui/button";

import {
  ExplorerFrame,
  ExplorerPageHeader,
  KeyValueList,
  Panel,
  QueryRefreshMeta,
  QueryState,
  SearchForm,
} from "./primitives";
import { formatNumber } from "./utils";

function OverviewStatus({
  liveReady,
  indexedReady,
  loading,
}: {
  liveReady: boolean;
  indexedReady: boolean;
  loading: boolean;
}) {
  const label = loading
    ? "Loading network data"
    : liveReady && indexedReady
      ? "Live and indexed data available"
      : liveReady
        ? "Live data available"
        : indexedReady
          ? "Indexed data available"
          : "Network data unavailable";

  return (
    <div className="inline-flex items-center gap-2 border border-[var(--glyph-line-strong)] bg-[var(--glyph-surface)] px-3 py-2 text-xs font-medium text-[var(--glyph-muted)]">
      <span aria-hidden="true" className="h-2 w-2 rounded-full bg-[var(--glyph-ink)]" />
      <span>{label}</span>
    </div>
  );
}

export function ExplorerHome() {
  const live = useLiveTickInfo();
  const indexed = useLastProcessedTick();
  const hasLiveData = live.data !== undefined && !live.isError;
  const hasIndexedData = indexed.data !== undefined && !indexed.isError;
  const refreshing = live.isFetching || indexed.isFetching;

  async function refreshOverview() {
    await Promise.all([live.refetch(), indexed.refetch()]);
  }

  return (
    <ExplorerFrame>
      <ExplorerPageHeader
        eyebrow="Glyph Explorer / network overview"
        title="Read the network as it moves."
        description="A direct, read-only view of Qubic live activity and archive coverage. Values below come from the configured RPC services and are never filled with placeholders."
      >
        <OverviewStatus
          indexedReady={hasIndexedData}
          liveReady={hasLiveData}
          loading={live.isPending || indexed.isPending}
        />
      </ExplorerPageHeader>

      <section aria-labelledby="explorer-search-heading" className="mb-12">
        <div className="border border-[var(--glyph-ink)] bg-[var(--glyph-ink)] p-5 text-[var(--glyph-canvas)] md:p-8">
          <p className="font-mono text-[0.65rem] font-medium uppercase tracking-[0.16em] text-[var(--glyph-line-strong)]">
            Read-only lookup
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] md:text-3xl" id="explorer-search-heading">
            Find an identity, transaction, or tick.
          </h2>
          <div className="mt-6 [&_input]:border-[var(--glyph-muted)] [&_input]:bg-[var(--glyph-canvas)] [&_input]:text-[var(--glyph-ink)] [&_label]:text-[var(--glyph-canvas)] [&_p]:text-[var(--glyph-line-strong)]">
            <SearchForm />
          </div>
        </div>
      </section>

      <section aria-labelledby="network-overview-heading">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-[0.65rem] font-medium uppercase tracking-[0.16em] text-[var(--glyph-tertiary)]">
              Network pulse
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em]" id="network-overview-heading">
              Current and indexed progress
            </h2>
          </div>
          <GlyphButton
            aria-busy={refreshing}
            disabled={refreshing}
            onClick={() => void refreshOverview()}
            size="sm"
            variant="secondary"
          >
            {refreshing ? "Refreshing…" : "Refresh overview"}
          </GlyphButton>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Panel eyebrow="Live RPC" title="Network tick">
            <QueryState
              label="live network tick"
              noResultMessage="No live tick data was returned."
              query={live}
            >
              {live.data ? (
                <KeyValueList
                  items={[
                    { label: "Current tick", value: formatNumber(live.data.tick) },
                    { label: "Current epoch", value: formatNumber(live.data.epoch) },
                    { label: "Epoch initial tick", value: formatNumber(live.data.initialTick) },
                  ]}
                />
              ) : null}
            </QueryState>
            <QueryRefreshMeta query={live} />
          </Panel>

          <Panel eyebrow="Archive query RPC" title="Indexed archive">
            <QueryState
              label="indexed tick"
              noResultMessage="No indexed tick data was returned."
              query={indexed}
            >
              {indexed.data ? (
                <KeyValueList
                  items={[
                    { label: "Indexed tick", value: formatNumber(indexed.data.tickNumber) },
                    { label: "Indexed epoch", value: formatNumber(indexed.data.epoch) },
                    { label: "Indexed event-log tick", value: formatNumber(indexed.data.logTickNumber) },
                  ]}
                />
              ) : null}
            </QueryState>
            <QueryRefreshMeta query={indexed} />
          </Panel>
        </div>
      </section>

      <p className="mt-8 max-w-3xl text-xs leading-5 text-[var(--glyph-tertiary)]">
        “Current tick” is supplied by the live network endpoint. “Indexed tick” is supplied by the archive endpoint and can trail the live network. Each timestamp above describes the last successful response for that panel.
      </p>
    </ExplorerFrame>
  );
}

