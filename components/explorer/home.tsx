"use client";

import {
  AlertCircleIcon,
  RefreshIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { useLastProcessedTick, useLiveTickInfo } from "@/lib/rpc/queries";
import { useLatestStats, type LatestStats } from "@/lib/stats";

import {
  ExplorerFrame,
  IconButton,
  StatusMessage,
} from "./primitives";
import { formatNumber } from "./utils";

function formatBigInt(value: bigint | undefined): string {
  return value === undefined ? "—" : new Intl.NumberFormat("en-US").format(value);
}

function formatCompactBigInt(value: bigint | undefined): string {
  if (value === undefined) return "—";
  const units = [
    { threshold: BigInt("1000000000000"), suffix: "T" },
    { threshold: BigInt("1000000000"), suffix: "B" },
    { threshold: BigInt("1000000"), suffix: "M" },
    { threshold: BigInt("1000"), suffix: "K" },
  ];
  const unit = units.find(({ threshold }) => value >= threshold);
  if (!unit) return formatBigInt(value);
  const amount = Number(value) / Number(unit.threshold);
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(amount)}${unit.suffix}`;
}

function formatPrice(value: number | undefined): string {
  if (value === undefined) return "—";
  return `$${value < 0.01 ? value.toFixed(8).replace(/0+$/, "").replace(/\.$/, "") : value.toFixed(2)}`;
}

function formatQuality(value: number): string {
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value)}%`;
}

function formatStatsTimestamp(value: number): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  }).format(new Date(value * 1_000));
}

function TickQualityStrip({ quality }: { quality: number }) {
  const filled = Math.round(Math.min(100, Math.max(0, quality)));
  const title = `Epoch tick quality ${formatQuality(quality)}`;

  return (
    <svg
      aria-label={title}
      className="block h-3 w-full"
      role="img"
      viewBox="0 0 100 8"
      preserveAspectRatio="none"
    >
      <title>{title}</title>
      {Array.from({ length: 100 }, (_, index) => (
        <rect
          fill={index < filled ? "var(--glyph-ink)" : "var(--glyph-line-strong)"}
          height="8"
          key={index}
          rx="0.7"
          width="0.72"
          x={index + 0.14}
          y="0"
        />
      ))}
    </svg>
  );
}

function Metric({ label, value, detail }: { label: string; value: React.ReactNode; detail?: string }) {
  return (
    <div className="min-w-0 px-4 py-4 first:pl-0 sm:px-5 lg:px-4">
      <dt className="truncate text-xs text-[var(--glyph-tertiary)]">{label}</dt>
      <dd className="mt-1 truncate font-mono text-sm font-medium text-[var(--glyph-ink)]">{value}</dd>
      {detail ? <p className="mt-1 truncate text-[0.68rem] text-[var(--glyph-tertiary)]">{detail}</p> : null}
    </div>
  );
}

function StatsContent({
  stats,
  liveTick,
  indexedTick,
}: {
  stats: LatestStats;
  liveTick: number | undefined;
  indexedTick: number | undefined;
}) {
  return (
    <>
      <div className="p-5 md:p-7">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-xs text-[var(--glyph-tertiary)]">Current tick</p>
            <p className="mt-2 font-mono text-5xl font-semibold tracking-[-0.08em] text-[var(--glyph-ink)] md:text-7xl">
              {formatNumber(stats.currentTick)}
            </p>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-xs text-[var(--glyph-tertiary)]">Epoch</p>
            <p className="mt-1 font-mono text-lg font-medium text-[var(--glyph-ink)]">{formatNumber(stats.epoch)}</p>
            <p className="mt-1 text-xs text-[var(--glyph-tertiary)]">epoch progress · {formatNumber(stats.ticksInCurrentEpoch)} ticks</p>
            <time className="mt-1 block font-mono text-[0.68rem] text-[var(--glyph-tertiary)]" dateTime={new Date(stats.timestamp * 1_000).toISOString()}>
              {formatStatsTimestamp(stats.timestamp)}
            </time>
          </div>
        </div>

        <div className="mt-7" aria-label="Epoch tick quality">
          <TickQualityStrip quality={stats.epochTickQuality} />
          <div className="mt-2 flex flex-wrap justify-between gap-x-4 gap-y-1 font-mono text-xs text-[var(--glyph-muted)]">
            <span>{formatQuality(stats.epochTickQuality)} quality</span>
            <span>{formatNumber(stats.ticksInCurrentEpoch)} total · {formatNumber(stats.emptyTicksInCurrentEpoch)} empty</span>
          </div>
        </div>
      </div>


      <dl className="grid grid-cols-2 divide-x divide-y divide-[var(--glyph-line)] border-t border-[var(--glyph-line)] sm:grid-cols-3 lg:grid-cols-4">
        <Metric detail="current epoch" label="Epoch" value={formatNumber(stats.epoch)} />
        <Metric detail="query endpoint" label="Indexed tick" value={formatNumber(indexedTick)} />
        <Metric detail="live endpoint" label="Live tick" value={formatNumber(liveTick)} />
        <Metric label="Active addresses" value={formatNumber(stats.activeAddresses)} />
        <Metric detail="QUS" label="Circulating supply" value={formatCompactBigInt(stats.circulatingSupply)} />
        <Metric detail="QUS" label="Burned" value={formatCompactBigInt(stats.burnedQus)} />
        <Metric label="Price" value={formatPrice(stats.price)} />
        <Metric detail="USD" label="Market cap" value={`$${formatCompactBigInt(stats.marketCap)}`} />
      </dl>
    </>
  );
}

function StatsSurface({
  query,
  liveTick,
  indexedTick,
}: {
  query: ReturnType<typeof useLatestStats>;
  liveTick: number | undefined;
  indexedTick: number | undefined;
}) {
  const hasData = query.data !== undefined;

  if (query.isPending && !hasData) {
    return (
      <div className="p-4">
        <StatusMessage status="loading" title="Loading network telemetry…" />
      </div>
    );
  }

  if (query.isError && !hasData) {
    return (
      <div className="p-4">
        <StatusMessage
          action={<IconButton icon={RefreshIcon} label="Retry telemetry" onClick={() => void query.refetch()} />}
          description="The official telemetry response was unavailable or invalid."
          status="error"
          title="Telemetry unavailable"
        />
      </div>
    );
  }

  if (!query.data) {
    return (
      <div className="p-4">
        <StatusMessage status="empty" title="No telemetry returned" />
      </div>
    );
  }

  return (
    <>
      {query.isError ? (
        <div className="flex items-center gap-3 border-b border-[var(--glyph-line)] bg-[var(--glyph-canvas)] px-4 py-3 text-xs text-[var(--glyph-muted)]" role="alert">
          <HugeiconsIcon aria-hidden="true" className="shrink-0" focusable="false" icon={AlertCircleIcon} size={18} strokeWidth={1.5} />
          <span className="min-w-0 flex-1">Showing the last successful telemetry response.</span>
          <IconButton icon={RefreshIcon} label="Retry telemetry" onClick={() => void query.refetch()} size="sm" />
        </div>
      ) : null}
      <StatsContent indexedTick={indexedTick} liveTick={liveTick} stats={query.data} />
    </>
  );
}

export function ExplorerHome() {
  const stats = useLatestStats();
  const live = useLiveTickInfo();
  const indexed = useLastProcessedTick();
  const refreshing = stats.isFetching || live.isFetching || indexed.isFetching;

  async function refreshOverview() {
    await Promise.all([stats.refetch(), live.refetch(), indexed.refetch()]);
  }

  return (
    <ExplorerFrame>
      <div className="flex justify-end">
        <IconButton
          aria-busy={refreshing}
          disabled={refreshing}
          icon={RefreshIcon}
          label="Refresh telemetry"
          onClick={() => void refreshOverview()}
        />
      </div>

      <section aria-label="Network telemetry" className="mt-4 border border-[var(--glyph-line)] bg-[var(--glyph-surface)]">
        <StatsSurface
          indexedTick={indexed.data?.tickNumber}
          liveTick={live.data?.tick}
          query={stats}
        />
      </section>
    </ExplorerFrame>
  );
}
