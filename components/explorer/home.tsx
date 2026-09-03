"use client";

import { RefreshIcon } from "@hugeicons/core-free-icons";

import { Sparkline } from "@/components/dither-kit/sparkline";
import { useQubicMarket } from "@/lib/market";
import { useLastProcessedTick, useTransactionsForTick } from "@/lib/rpc/queries";
import { formatAtomicAmount, formatTransactionHash } from "@/lib/rpc/validation";
import { useLatestStats, type LatestStats } from "@/lib/stats";

import {
  ExplorerFrame,
  ExplorerLink,
  IconButton,
  StatusMessage,
  TableScroll,
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
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
      <div>
        <p className="text-[0.68rem] font-medium uppercase tracking-[0.15em] text-[var(--glyph-tertiary)]">{eyebrow}</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.055em] text-[var(--glyph-ink)]" id={id}>{title}</h2>
        <p className="mt-2 max-w-2xl text-sm text-[var(--glyph-muted)]">{description}</p>
      </div>
      {action}
    </div>
  );
}

function NetworkPulse({ query, stats }: { query: ReturnType<typeof useLatestStats>; stats: LatestStats }) {
  return (
    <section aria-labelledby="network-pulse-heading">
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
        description="A live readout from the public Qubic network statistics service."
        eyebrow="Network"
        id="network-pulse-heading"
        title="Network pulse"
      />

      <div className="mt-8">
        <p className="text-xs font-medium uppercase tracking-[0.1em] text-[var(--glyph-tertiary)]">Latest network tick</p>
        <ExplorerLink href={`/tick/${stats.currentTick}`}>
          <span className="mt-2 font-mono text-5xl font-semibold tracking-[-0.09em] text-[var(--glyph-ink)] sm:text-7xl">{formatNumber(stats.currentTick)}</span>
        </ExplorerLink>
        <p className="mt-3 text-sm text-[var(--glyph-muted)]">The latest unit of reported network activity. Updated {formatStatsTimestamp(stats.timestamp)}.</p>
      </div>

      <dl className="mt-10 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <dt className="text-xs text-[var(--glyph-tertiary)]">Epoch</dt>
          <dd className="mt-2 font-mono text-xl font-semibold tracking-[-0.045em] text-[var(--glyph-ink)]">{formatNumber(stats.epoch)}</dd>
        </div>
        <div>
          <dt className="text-xs text-[var(--glyph-tertiary)]">Network health</dt>
          <dd className="mt-2 font-mono text-xl font-semibold tracking-[-0.045em] text-[var(--glyph-ink)]">{new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(stats.epochTickQuality)}%</dd>
          <p className="mt-1 text-xs text-[var(--glyph-muted)]">Tick quality this epoch</p>
        </div>
        <div>
          <dt className="text-xs text-[var(--glyph-tertiary)]">Active accounts</dt>
          <dd className="mt-2 font-mono text-xl font-semibold tracking-[-0.045em] text-[var(--glyph-ink)]">{formatNumber(stats.activeAddresses)}</dd>
        </div>
        <div>
          <dt className="text-xs text-[var(--glyph-tertiary)]">Circulating supply</dt>
          <dd className="mt-2 font-mono text-xl font-semibold tracking-[-0.045em] text-[var(--glyph-ink)]">{formatCompact(stats.circulatingSupply)} <span className="text-sm font-normal text-[var(--glyph-muted)]">QUS</span></dd>
        </div>
        <div>
          <dt className="text-xs text-[var(--glyph-tertiary)]">Burned</dt>
          <dd className="mt-2 font-mono text-xl font-semibold tracking-[-0.045em] text-[var(--glyph-ink)]">{formatCompact(stats.burnedQus)} <span className="text-sm font-normal text-[var(--glyph-muted)]">QUS</span></dd>
        </div>
      </dl>
    </section>
  );
}

function NetworkSection() {
  const stats = useLatestStats();

  if (stats.isPending && !stats.data) {
    return <OverviewStatsSkeleton className="py-8" />;
  }

  if (!stats.data) {
    return (
      <section aria-labelledby="network-pulse-heading">
        <SectionHeading
          description="The public Qubic statistics service is temporarily unavailable."
          eyebrow="Network"
          id="network-pulse-heading"
          title="Network pulse"
        />
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

  return <NetworkPulse query={stats} stats={stats.data} />;
}

function MarketSection() {
  const market = useQubicMarket();
  const snapshot = market.data;

  return (
    <section aria-labelledby="market-heading">
      <SectionHeading
        action={(
          <a className="font-mono text-xs text-[var(--glyph-tertiary)] hover:text-[var(--glyph-ink)]" href="https://www.coingecko.com/en/coins/qubic" rel="noreferrer" target="_blank">
            Market data by CoinGecko
          </a>
        )}
        description="A wider market view of Qubic, separate from network telemetry."
        eyebrow="Market"
        id="market-heading"
        title="Qubic in the market"
      />

      {market.isPending && !snapshot ? <p className="mt-8 text-sm text-[var(--glyph-muted)]">Loading market context…</p> : null}
      {market.isError && !snapshot ? <p className="mt-8 text-sm text-[var(--glyph-muted)]">Market context is unavailable right now.</p> : null}
      {snapshot ? (
        <>
          <div className="mt-8">
            <p className="text-xs font-medium uppercase tracking-[0.1em] text-[var(--glyph-tertiary)]">Qubic price</p>
            <p className="mt-2 font-mono text-4xl font-semibold tracking-[-0.08em] text-[var(--glyph-ink)] sm:text-6xl">{formatUsd(snapshot.priceUsd)}</p>
            <p className="mt-2 text-sm text-[var(--glyph-muted)]">Per QUBIC. Market data last updated {new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(snapshot.lastUpdated))}.</p>
          </div>

          {snapshot.history.length > 1 ? (
            <div aria-label="30-day Qubic price trend" className="mt-8 h-36 w-full">
              <Sparkline
                animate={false}
                color="green"
                data={snapshot.history.map((point) => point.priceUsd)}
                variant="hatched"
              />
            </div>
          ) : null}

          <dl className="mt-8 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-xs text-[var(--glyph-tertiary)]">Market cap</dt>
              <dd className="mt-2 font-mono text-xl font-semibold tracking-[-0.045em] text-[var(--glyph-ink)]">{formatUsd(snapshot.marketCapUsd)}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--glyph-tertiary)]">24-hour movement</dt>
              <dd className="mt-2 font-mono text-xl font-semibold tracking-[-0.045em] text-[var(--glyph-ink)]">{formatPercent(snapshot.priceChange24h)}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--glyph-tertiary)]">7-day movement</dt>
              <dd className="mt-2 font-mono text-xl font-semibold tracking-[-0.045em] text-[var(--glyph-ink)]">{formatPercent(snapshot.priceChange7d)}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--glyph-tertiary)]">24-hour volume</dt>
              <dd className="mt-2 font-mono text-xl font-semibold tracking-[-0.045em] text-[var(--glyph-ink)]">{formatUsd(snapshot.volume24hUsd)}</dd>
            </div>
          </dl>
        </>
      ) : null}
    </section>
  );
}

function LatestActivity() {
  const processedTick = useLastProcessedTick();
  const tick = processedTick.data?.tickNumber;
  const transactions = useTransactionsForTick(tick);

  if (processedTick.isPending || !processedTick.data) return null;

  return (
    <section aria-labelledby="latest-activity-heading">
      <SectionHeading
        action={<ExplorerLink href={`/tick/${tick}/transactions`}>View tick activity</ExplorerLink>}
        description={`Transactions reported in indexed tick ${formatNumber(tick)}. The archive can lag the live network.`}
        eyebrow="Archive"
        id="latest-activity-heading"
        title="Latest indexed activity"
      />

      {transactions.isPending ? <p className="mt-8 text-sm text-[var(--glyph-muted)]">Loading reported transactions…</p> : null}
      {transactions.data?.length ? (
        <div className="mt-8">
          <TableScroll>
            <table aria-label="Latest indexed Qubic activity" className="glyph-table min-w-[720px] w-full border-collapse text-left">
              <caption className="sr-only">Latest indexed Qubic activity</caption>
              <thead>
                <tr>
                  <th scope="col">Transaction</th>
                  <th scope="col">Kind</th>
                  <th className="text-right" scope="col">Amount</th>
                  <th className="text-right" scope="col">Tick</th>
                </tr>
              </thead>
              <tbody>
                {transactions.data.slice(0, 8).map((transaction, index) => (
                  <tr className="align-top text-sm" key={`${transaction.hash ?? "transaction"}-${index}`}>
                    <td className="py-3">
                      {transaction.hash ? (
                        <ExplorerLink href={`/transaction/${transaction.hash}`}><code className="font-mono text-xs">{formatTransactionHash(transaction.hash)}</code></ExplorerLink>
                      ) : <span className="text-[var(--glyph-tertiary)]">Hash not reported</span>}
                    </td>
                    <td className="py-3 text-xs text-[var(--glyph-muted)]">{transaction.inputType === 0 ? "Transfer" : "Application activity"}</td>
                    <td className="py-3 text-right font-mono text-xs text-[var(--glyph-ink)]">{transaction.amount === undefined || transaction.amount === null ? "Not reported" : formatAtomicAmount(transaction.amount)}</td>
                    <td className="py-3 text-right font-mono text-xs"><ExplorerLink href={`/tick/${tick}`}>{formatNumber(tick)}</ExplorerLink></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
        </div>
      ) : transactions.isSuccess ? <p className="mt-8 text-sm text-[var(--glyph-muted)]">No transactions were reported for this indexed tick.</p> : null}
    </section>
  );
}

export function ExplorerHome() {
  return (
    <ExplorerFrame>
      <OverviewHero />
      <div className="space-y-20 pb-8 md:space-y-28">
        <NetworkSection />
        <MarketSection />
        <LatestActivity />
      </div>
    </ExplorerFrame>
  );
}
