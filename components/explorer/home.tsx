"use client";

import {
  AlertCircleIcon,
  Calendar03Icon,
  Coins01Icon,
  Dollar01Icon,
  FireIcon,
  RefreshIcon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type HugeiconsIconProps } from "@hugeicons/react";

import { useLatestStats, type LatestStats } from "@/lib/stats";
import { useLastProcessedTick, useTransactionsForTick } from "@/lib/rpc/queries";
import { formatTransactionHash } from "@/lib/rpc/validation";

import {
  ExplorerFrame,
  ExplorerLink,
  IconButton,
  StatusMessage,
} from "./primitives";
import { OverviewHero } from "./overview-hero";
import { OverviewStatsSkeleton } from "./skeletons";
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

function Metric({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  detail?: string;
  icon: HugeiconsIconProps["icon"];
}) {
  return (
    <div className="relative min-w-0 overflow-hidden px-4 py-4 sm:px-5">
      <HugeiconsIcon
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-5 -right-4 size-24 text-[var(--glyph-ink)] opacity-[0.055]"
        focusable="false"
        icon={icon}
        strokeWidth={1.15}
      />
      <dt className="truncate text-xs text-[var(--glyph-tertiary)]">{label}</dt>
      <dd className="mt-1 truncate font-mono text-lg font-semibold leading-tight tracking-[-0.03em] text-[var(--glyph-ink)] sm:text-xl">{value}</dd>
      {detail ? <p className="mt-1 truncate text-[0.68rem] text-[var(--glyph-tertiary)]">{detail}</p> : null}
    </div>
  );
}

function StatsContent({
  query,
  stats,
}: {
  query: ReturnType<typeof useLatestStats>;
  stats: LatestStats;
}) {
  return (
    <>
      <div className="border-b border-[var(--glyph-line)] p-5 md:p-7 lg:border-b-0 lg:border-r">
        <div className="flex items-start justify-between gap-5">
          <dl className="min-w-0 flex-1">
            <div className="min-w-0">
              <dt className="text-xs text-[var(--glyph-tertiary)]">Current tick</dt>
              <dd className="mt-2 truncate font-mono text-4xl font-semibold tracking-[-0.08em] text-[var(--glyph-ink)] md:text-6xl">
                {formatNumber(stats.currentTick)}
              </dd>
            </div>
          </dl>
          <IconButton
            aria-busy={query.isFetching}
            disabled={query.isFetching}
            icon={RefreshIcon}
            label="Refresh network stats"
            onClick={() => void query.refetch()}
            size="sm"
          />
        </div>

        <div className="mt-8" aria-label="Epoch tick quality">
          <div className="mb-2 flex items-baseline justify-between gap-4">
            <span className="text-xs text-[var(--glyph-tertiary)]">Tick quality</span>
            <span className="font-mono text-base font-semibold leading-tight tracking-[-0.03em] text-[var(--glyph-ink)] sm:text-lg">
              {formatQuality(stats.epochTickQuality)}
            </span>
          </div>
          <TickQualityStrip quality={stats.epochTickQuality} />
          <div className="mt-2 flex flex-wrap justify-between gap-x-4 gap-y-1 font-mono text-[0.68rem] text-[var(--glyph-muted)]">
            <span>{formatNumber(stats.ticksInCurrentEpoch)} epoch ticks</span>
            <span>{formatNumber(stats.emptyTicksInCurrentEpoch)} empty</span>
          </div>
        </div>

        <time
          className="mt-7 block font-mono text-[0.68rem] text-[var(--glyph-tertiary)]"
          dateTime={new Date(stats.timestamp * 1_000).toISOString()}
        >
          Updated {formatStatsTimestamp(stats.timestamp)}
        </time>
      </div>

      <dl className="grid grid-cols-2 divide-x divide-y divide-[var(--glyph-line)] sm:grid-cols-3">
        <Metric icon={Calendar03Icon} label="Epoch" value={formatNumber(stats.epoch)} />
        <Metric icon={UserGroupIcon} label="Active addresses" value={formatNumber(stats.activeAddresses)} />
        <Metric icon={Coins01Icon} detail="QUS" label="Circulating supply" value={formatCompactBigInt(stats.circulatingSupply)} />
        <Metric icon={Dollar01Icon} detail="USD" label="Market cap" value={`$${formatCompactBigInt(stats.marketCap)}`} />
        <Metric icon={FireIcon} detail="QUS" label="Burned" value={formatCompactBigInt(stats.burnedQus)} />
      </dl>
    </>
  );
}

function StatsSurface({ query }: { query: ReturnType<typeof useLatestStats> }) {
  const hasData = query.data !== undefined;

  if (query.isPending && !hasData) {
    return <OverviewStatsSkeleton className="p-4" />;
  }

  if (query.isError && !hasData) {
    return (
      <div className="p-4">
        <StatusMessage
          action={<IconButton icon={RefreshIcon} label="Retry network stats" onClick={() => void query.refetch()} />}
          description="Current network stats could not be loaded."
          status="error"
          title="Network stats unavailable"
        />
      </div>
    );
  }

  if (!query.data) {
    return (
      <div className="p-4">
        <StatusMessage status="empty" title="No network stats returned" />
      </div>
    );
  }

  return (
    <>
      {query.isError ? (
        <div className="flex items-center gap-3 border-b border-[var(--glyph-line)] bg-[var(--glyph-canvas)] px-4 py-3 text-xs text-[var(--glyph-muted)]" role="alert">
          <HugeiconsIcon aria-hidden="true" className="shrink-0" focusable="false" icon={AlertCircleIcon} size={18} strokeWidth={1.5} />
          <span className="min-w-0 flex-1">Showing the last successful stats response.</span>
          <IconButton icon={RefreshIcon} label="Retry network stats" onClick={() => void query.refetch()} size="sm" />
        </div>
      ) : null}
      <div className="grid lg:grid-cols-[minmax(20rem,0.9fr)_minmax(0,1.7fr)]">
        <StatsContent query={query} stats={query.data} />
      </div>
    </>
  );
}

function LatestActivity() {
  const processedTick = useLastProcessedTick();
  const tick = processedTick.data?.tickNumber;
  const transactions = useTransactionsForTick(tick);

  if (processedTick.isPending) return null;
  if (!processedTick.data) return null;

  return (
    <section aria-labelledby="latest-activity-heading" className="mt-6 overflow-hidden rounded-[var(--glyph-radius-md)] bg-[var(--glyph-surface)] shadow-[0_12px_32px_var(--glyph-shadow)]">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pb-2 pt-5 sm:px-6">
        <div>
          <h2 className="text-base font-semibold tracking-[-0.03em] text-[var(--glyph-ink)]" id="latest-activity-heading">Latest archived activity</h2>
          <p className="mt-1 text-sm text-[var(--glyph-muted)]">Transactions reported for the latest indexed tick.</p>
        </div>
        <ExplorerLink href={`/tick/${tick}/transactions`}>View tick {formatNumber(tick)}</ExplorerLink>
      </div>
      {transactions.isPending ? <p className="px-5 py-4 text-sm text-[var(--glyph-muted)]">Loading transactions…</p> : null}
      {transactions.data?.length ? (
        <ul className="mt-2 space-y-px bg-[var(--glyph-canvas)] p-2">
          {transactions.data.slice(0, 5).map((transaction, index) => (
            <li className="flex items-center justify-between gap-4 rounded-[calc(var(--glyph-radius-sm)-2px)] bg-[var(--glyph-surface)] px-4 py-3 text-sm" key={`${transaction.hash ?? "transaction"}-${index}`}>
              {transaction.hash ? <ExplorerLink href={`/transaction/${transaction.hash}`}><code className="font-mono text-xs">{formatTransactionHash(transaction.hash)}</code></ExplorerLink> : <span className="text-[var(--glyph-tertiary)]">Transaction hash not reported</span>}
              <span className="shrink-0 font-mono text-xs text-[var(--glyph-tertiary)]">{transaction.inputType === 0 ? "Transfer" : `Input ${formatNumber(transaction.inputType)}`}</span>
            </li>
          ))}
        </ul>
      ) : transactions.isSuccess ? <p className="px-5 py-4 text-sm text-[var(--glyph-muted)]">No transactions were reported for this tick.</p> : null}
    </section>
  );
}

export function ExplorerHome() {
  const stats = useLatestStats();

  return (
    <ExplorerFrame>
      <OverviewHero />
      <section aria-label="Network stats" className="w-full overflow-hidden rounded-[var(--glyph-radius-md)] bg-[var(--glyph-surface)] shadow-[0_12px_32px_var(--glyph-shadow)]">
        <StatsSurface query={stats} />
      </section>
      <LatestActivity />
    </ExplorerFrame>
  );
}
