"use client";

import {
  ActivitySparkIcon,
  Calendar03Icon,
  ChartEvaluationIcon,
  ChartIncreaseIcon,
  ChartLineData01Icon,
  Coins01Icon,
  CoinsDollarIcon,
  RefreshIcon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type HugeiconsIconProps } from "@hugeicons/react";
import { Area } from "@/components/dither-kit/area";
import { AreaChart } from "@/components/dither-kit/area-chart";
import { Grid } from "@/components/dither-kit/grid";
import { Tooltip } from "@/components/dither-kit/tooltip";
import { XAxis } from "@/components/dither-kit/x-axis";
import { YAxis } from "@/components/dither-kit/y-axis";
import { useQubicMarket } from "@/lib/market";
import { useLatestStats, type LatestStats } from "@/lib/stats";

import {
  EXPLORER_FRAME_CONTENT_CLASS,
  ExplorerLink,
  IconButton,
  StatusMessage,
} from "./primitives";
import { OverviewHero } from "./overview-hero";
import { OverviewStatsSkeleton } from "./skeletons";
import { formatNumber } from "./utils";

function formatCompact(value: bigint | number | undefined): string {
  if (value === undefined) return "—";
  const numericValue = typeof value === "bigint" ? Number(value) : value;
  if (!Number.isFinite(numericValue)) return "—";

  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(numericValue);
}

function formatBigIntPercent(value: bigint, total: bigint): string {
  if (total <= BigInt(0)) return "—";
  const hundredths = (value * BigInt(10_000)) / total;
  return `${(Number(hundredths) / 100).toFixed(2)}%`;
}

function formatUsd(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  if (value < 0.01) return `$${value.toFixed(9)}`;
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 2,
    style: "currency",
  }).format(value);
}

function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return `${value > 0 ? "+" : ""}${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value)}%`;
}

function formatMarketChartDate(value: unknown): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(value));
}

function formatCompactUsd(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 2,
    style: "currency",
  }).format(value);
}

const MARKET_CHART_CONFIG = {
  priceUsd: { color: "green", label: "Qubic price" },
} as const;

const MARKET_CAP_CHART_CONFIG = {
  value: { color: "green", label: "Market cap" },
} as const;

const MARKET_VOLUME_CHART_CONFIG = {
  value: { color: "green", label: "Daily volume" },
} as const;

type MarketMetricIcon = HugeiconsIconProps["icon"];

function MarketMetric({
  className,
  detail,
  icon,
  label,
  value,
}: {
  className?: string;
  detail: string;
  icon: MarketMetricIcon;
  label: string;
  value: string;
}) {
  return (
    <div className={`glyph-data-card glyph-market-metric${className ? ` ${className}` : ""}`}>
      <HugeiconsIcon
        aria-hidden="true"
        className="glyph-market-metric__mask"
        icon={icon}
        size={52}
        strokeWidth={1.25}
      />
      <dt className="relative text-xs font-medium uppercase tracking-[0.1em] text-[var(--glyph-tertiary)]">{label}</dt>
      <dd className="relative mt-3 font-mono text-xl font-semibold tracking-[-0.045em] text-[var(--glyph-ink)]">{value}</dd>
      <p className="relative mt-1.5 text-xs text-[var(--glyph-muted)]">{detail}</p>
    </div>
  );
}

function formatStatsTimestamp(value: number): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(value * 1_000));
}

function SectionHeading({
  id,
  eyebrow,
  title,
  description,
  action,
}: {
  id: string;
  eyebrow: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
      <div>
        <p className="text-[0.68rem] font-medium uppercase tracking-[0.15em] text-[var(--glyph-tertiary)]">{eyebrow}</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.055em] text-[var(--glyph-ink)]" id={id}>{title}</h2>
        {description ? <p className="mt-2 max-w-2xl text-sm text-[var(--glyph-muted)]">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

function NetworkPulse({
  query,
  showHeading = true,
  stats,
}: {
  query: ReturnType<typeof useLatestStats>;
  showHeading?: boolean;
  stats: LatestStats;
}) {
  return (
    <section aria-label={showHeading ? undefined : "Network data"} aria-labelledby={showHeading ? "network-pulse-heading" : undefined}>
      {showHeading ? (
        <SectionHeading
          action={(
            <IconButton
              aria-busy={query.isFetching}
              disabled={query.isFetching}
              icon={RefreshIcon}
              label="Refresh network data"
              onClick={() => void query.refetch()}
              size="sm"
              variant="quiet"
            />
          )}
          eyebrow="Network"
          id="network-pulse-heading"
          title="The network, right now"
        />
      ) : null}

      {!showHeading ? <p className="text-[0.68rem] font-medium uppercase tracking-[0.15em] text-[var(--glyph-tertiary)]">Network</p> : null}
      <dl className={showHeading ? "glyph-network-grid mt-8" : "glyph-network-grid mt-4"}>
        <div className="glyph-data-card glyph-network-tile glyph-network-tile--lead">
          <HugeiconsIcon aria-hidden="true" className="glyph-network-tile__mask" icon={ActivitySparkIcon} size={72} strokeWidth={1.2} />
          <dt>Live network tick</dt>
          <dd>
            <ExplorerLink href={`/tick/${stats.currentTick}`}>
              <span>{formatNumber(stats.currentTick)}</span>
            </ExplorerLink>
          </dd>
          <p>Reported {formatStatsTimestamp(stats.timestamp)}</p>
        </div>
        <div className="glyph-data-card glyph-network-tile">
          <HugeiconsIcon aria-hidden="true" className="glyph-network-tile__mask" icon={Calendar03Icon} size={44} strokeWidth={1.2} />
          <dt>Epoch</dt>
          <dd>{formatNumber(stats.epoch)}</dd>
          <p>{formatNumber(stats.ticksInCurrentEpoch)} ticks so far</p>
        </div>
        <div className="glyph-data-card glyph-network-tile">
          <HugeiconsIcon aria-hidden="true" className="glyph-network-tile__mask" icon={ActivitySparkIcon} size={44} strokeWidth={1.2} />
          <dt>Network health</dt>
          <dd>{new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(stats.epochTickQuality)}%</dd>
          <p>Productive ticks this epoch</p>
        </div>
        <div className="glyph-data-card glyph-network-tile">
          <HugeiconsIcon aria-hidden="true" className="glyph-network-tile__mask" icon={UserGroupIcon} size={44} strokeWidth={1.2} />
          <dt>Active accounts</dt>
          <dd>{formatNumber(stats.activeAddresses)}</dd>
          <p>Reported in the live snapshot</p>
        </div>
        <div className="glyph-data-card glyph-network-tile">
          <HugeiconsIcon aria-hidden="true" className="glyph-network-tile__mask" icon={Coins01Icon} size={44} strokeWidth={1.2} />
          <dt>Circulating supply</dt>
          <dd>{formatCompact(stats.circulatingSupply)} <span className="glyph-network-tile__unit">QUS</span></dd>
          <p>{formatBigIntPercent(stats.burnedQus, stats.circulatingSupply + stats.burnedQus)} of reported supply</p>
        </div>
      </dl>
    </section>
  );
}

function NetworkSection({ showHeading = true }: { showHeading?: boolean }) {
  const stats = useLatestStats();

  if (stats.isPending && !stats.data) {
    return <OverviewStatsSkeleton className="py-8" />;
  }

  if (!stats.data) {
    return (
      <section aria-label={showHeading ? undefined : "Network data"} aria-labelledby={showHeading ? "network-pulse-heading" : undefined}>
          {showHeading ? <SectionHeading eyebrow="Network" id="network-pulse-heading" title="The network, right now" /> : null}
        <div className="mt-8">
          <StatusMessage
            action={<IconButton icon={RefreshIcon} label="Retry network data" onClick={() => void stats.refetch()} variant="quiet" />}
            status="error"
            title="Network data is unavailable"
          />
        </div>
      </section>
    );
  }

  return <NetworkPulse query={stats} showHeading={showHeading} stats={stats.data} />;
}

function MarketSection({ showHeading = true }: { showHeading?: boolean }) {
  const market = useQubicMarket();
  const snapshot = market.data;

  return (
    <section aria-label={showHeading ? undefined : "Market data"} aria-labelledby={showHeading ? "market-heading" : undefined}>
      {showHeading ? (
        <SectionHeading
          action={(
            <a className="font-mono text-xs text-[var(--glyph-tertiary)] hover:text-[var(--glyph-ink)]" href="https://www.coingecko.com/en/coins/qubic" rel="noreferrer" target="_blank">
              Market data by CoinGecko
            </a>
          )}
          eyebrow="Market"
          id="market-heading"
          title="The market signal"
        />
      ) : (
        <div className="flex items-center justify-between gap-4">
          <p className="text-[0.68rem] font-medium uppercase tracking-[0.15em] text-[var(--glyph-tertiary)]">Market</p>
          <a className="font-mono text-xs text-[var(--glyph-tertiary)] hover:text-[var(--glyph-ink)]" href="https://www.coingecko.com/en/coins/qubic" rel="noreferrer" target="_blank">CoinGecko</a>
        </div>
      )}

      {market.isPending && !snapshot ? <p className="mt-8 text-sm text-[var(--glyph-muted)]">Loading market context…</p> : null}
      {market.isError && !snapshot ? <p className="mt-8 text-sm text-[var(--glyph-muted)]">Market context is unavailable right now.</p> : null}
      {snapshot ? (
        <dl className="glyph-market-bento mt-8">
          <div className="glyph-data-card glyph-market-spot">
            <dt className="text-xs font-medium uppercase tracking-[0.1em] text-[var(--glyph-tertiary)]">Qubic price</dt>
            <dd className="mt-3 font-mono text-4xl font-semibold tracking-[-0.08em] text-[var(--glyph-ink)] sm:text-6xl">{formatUsd(snapshot.priceUsd)}</dd>
            <p className="mt-3 text-sm leading-6 text-[var(--glyph-muted)]">Per QUBIC. Updated {new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(snapshot.lastUpdated))}.</p>
          </div>

          <MarketMetric className="glyph-market-metric--wide" detail="Current network valuation" icon={ChartEvaluationIcon} label="Market cap" value={formatUsd(snapshot.marketCapUsd)} />
            <MarketMetric detail="Change over the latest day" icon={ChartIncreaseIcon} label="24-hour movement" value={formatPercent(snapshot.priceChange24h)} />
            <MarketMetric detail="Direction across seven days" icon={ChartLineData01Icon} label="7-day movement" value={formatPercent(snapshot.priceChange7d)} />
            <MarketMetric className="glyph-market-metric--wide" detail="Reported market turnover" icon={CoinsDollarIcon} label="24-hour volume" value={formatUsd(snapshot.volume24hUsd)} />

          {snapshot.history.length > 1 ? (
            <div className="glyph-market-chart glyph-market-chart--price">
              <dt className="sr-only">30-day price history</dt>
              <dd>
                <figure aria-labelledby="market-chart-title">
                  <figcaption className="flex flex-wrap items-baseline justify-between gap-3">
                    <span className="text-sm font-medium text-[var(--glyph-ink)]" id="market-chart-title">30-day price history</span>
                    <span className="font-mono text-xs text-[var(--glyph-tertiary)]">Daily closes</span>
                  </figcaption>
                  <div className="mt-5 h-64 w-full sm:h-72">
                    <AreaChart
                      animate={false}
                      config={MARKET_CHART_CONFIG}
                      data={snapshot.history}
                      margins={{ bottom: 28, left: 78, right: 16, top: 18 }}
                      mobileMargins={{ bottom: 24, left: 56, right: 0, top: 12 }}
                    >
                      <Grid />
                      <Area dataKey="priceUsd" strokeVariant="solid" variant="hatched" />
                      <XAxis dataKey="timestamp" maxTicks={6} tickFormatter={formatMarketChartDate} />
                      <YAxis tickFormatter={formatUsd} />
                      <Tooltip labelKey="timestamp" valueFormatter={(value) => formatUsd(value)} />
                    </AreaChart>
                  </div>
                </figure>
              </dd>
            </div>
          ) : null}

          {snapshot.marketCapHistory.length > 1 ? (
            <div className="glyph-market-chart">
              <dt className="sr-only">30-day market capitalization</dt>
              <dd>
                <figure aria-labelledby="market-cap-chart-title">
                  <figcaption className="flex flex-wrap items-baseline justify-between gap-3">
                    <span className="text-sm font-medium text-[var(--glyph-ink)]" id="market-cap-chart-title">Market capitalization</span>
                    <span className="font-mono text-xs text-[var(--glyph-tertiary)]">30 days</span>
                  </figcaption>
                  <div className="mt-5 h-56 w-full sm:h-64">
                    <AreaChart
                      animate={false}
                      config={MARKET_CAP_CHART_CONFIG}
                      data={snapshot.marketCapHistory}
                      margins={{ bottom: 28, left: 78, right: 16, top: 18 }}
                      mobileMargins={{ bottom: 24, left: 56, right: 0, top: 12 }}
                    >
                      <Grid />
                      <Area dataKey="value" strokeVariant="solid" variant="hatched" />
                      <XAxis dataKey="timestamp" maxTicks={4} tickFormatter={formatMarketChartDate} />
                      <YAxis tickFormatter={formatCompactUsd} />
                      <Tooltip labelKey="timestamp" valueFormatter={(value) => formatCompactUsd(value)} />
                    </AreaChart>
                  </div>
                </figure>
              </dd>
            </div>
          ) : null}

          {snapshot.volumeHistory.length > 1 ? (
            <div className="glyph-market-chart">
              <dt className="sr-only">30-day trading volume</dt>
              <dd>
                <figure aria-labelledby="market-volume-chart-title">
                  <figcaption className="flex flex-wrap items-baseline justify-between gap-3">
                    <span className="text-sm font-medium text-[var(--glyph-ink)]" id="market-volume-chart-title">Trading volume</span>
                    <span className="font-mono text-xs text-[var(--glyph-tertiary)]">30 days</span>
                  </figcaption>
                  <div className="mt-5 h-56 w-full sm:h-64">
                    <AreaChart
                      animate={false}
                      config={MARKET_VOLUME_CHART_CONFIG}
                      data={snapshot.volumeHistory}
                      margins={{ bottom: 28, left: 78, right: 16, top: 18 }}
                      mobileMargins={{ bottom: 24, left: 56, right: 0, top: 12 }}
                    >
                      <Grid />
                      <Area dataKey="value" strokeVariant="solid" variant="hatched" />
                      <XAxis dataKey="timestamp" maxTicks={4} tickFormatter={formatMarketChartDate} />
                      <YAxis tickFormatter={formatCompactUsd} />
                      <Tooltip labelKey="timestamp" valueFormatter={(value) => formatCompactUsd(value)} />
                    </AreaChart>
                  </div>
                </figure>
              </dd>
            </div>
          ) : null}

        </dl>
      ) : null}
    </section>
  );
}

function IntelligenceSection() {
  return (
    <section aria-labelledby="intelligence-heading">
      <SectionHeading
        description="Live network signals and market context, collected in one place."
        eyebrow="Overview"
        id="intelligence-heading"
        title="Qubic, at a glance"
      />
      <div className="glyph-intelligence-stack mt-8">
        <NetworkSection showHeading={false} />
        <MarketSection showHeading={false} />
      </div>
    </section>
  );
}

export function ExplorerHome() {
  return (
    <main className="min-h-[calc(100svh-72px)]">
      <OverviewHero />
      <div className={EXPLORER_FRAME_CONTENT_CLASS}>
        <div className="space-y-20 pb-8 md:space-y-28">
          <IntelligenceSection />
        </div>
      </div>
    </main>
  );
}
