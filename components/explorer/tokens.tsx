"use client";

import { ArrowDown01Icon } from "@hugeicons/core-free-icons";

import { GlyphButton } from "@/components/ui/button";
import { isExplorerRpcError } from "@/lib/rpc/errors";
import {
  normalizeAssetIssuancePage,
  type AssetIssuanceRow,
} from "@/lib/assets";
import { useAssetIssuanceEvents } from "@/lib/rpc/queries";
import {
  formatAtomicAmount,
  formatIdentifier,
  formatTick,
  normalizeIdentity,
  normalizeTick,
  normalizeTransactionHash,
} from "@/lib/rpc/validation";

import {
  ExplorerFrame,
  ExplorerLink,
  Panel,
  QueryRefreshMeta,
  QueryState,
  StatusMessage,
} from "./primitives";
import { formatNumber } from "./utils";

const PAGE_SIZE = 30;

function formatTotal(total: number | undefined): string | null {
  if (total === undefined) return null;
  return total >= 10_000 ? "10,000+" : formatNumber(total);
}

function isUnsupportedAssetApi(error: unknown): boolean {
  return (
    isExplorerRpcError(error) &&
    error.kind === "http" &&
    [404, 405, 501].includes(error.status ?? 0)
  );
}

function formatShares(value: string | undefined): string {
  if (!value) return "Not reported";
  try {
    BigInt(value);
    return `${formatAtomicAmount(value)} raw shares`;
  } catch {
    return `${value} (reported)`;
  }
}

function IssuerCell({ value }: { value: string | undefined }) {
  const identity = normalizeIdentity(value);
  if (!value) return <span className="text-[var(--glyph-tertiary)]">Not reported</span>;

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

function TransactionCell({ value }: { value: string | undefined }) {
  const hash = normalizeTransactionHash(value);
  if (!value) return <span className="text-[var(--glyph-tertiary)]">Not reported</span>;

  return hash ? (
    <ExplorerLink href={`/transaction/${hash}`}>
      <span title={hash}>{formatIdentifier(hash, 7, 7)}</span>
    </ExplorerLink>
  ) : (
    <code className="font-mono text-xs text-[var(--glyph-muted)]" title={value}>
      {formatIdentifier(value, 7, 7)}
    </code>
  );
}

function TickCell({ value }: { value: number | undefined }) {
  const tick = normalizeTick(value);
  return tick === null ? (
    <span className="text-[var(--glyph-tertiary)]">Not reported</span>
  ) : (
    <ExplorerLink href={`/tick/${tick}`}>{formatTick(tick)}</ExplorerLink>
  );
}

function IssuanceTable({ rows }: { rows: AssetIssuanceRow[] }) {
  return (
    <div className="-mx-4 overflow-x-auto sm:mx-0">
      <table className="min-w-[980px] w-full border-collapse text-left" aria-label="Qubic asset issuance events">
        <caption className="sr-only">Asset issuance events reported by the Qubic query API</caption>
        <thead>
          <tr className="border-b border-[var(--glyph-line)] text-[0.68rem] uppercase tracking-[0.08em] text-[var(--glyph-tertiary)]">
            <th className="px-4 pb-3 font-medium sm:px-0" scope="col">Asset</th>
            <th className="px-4 pb-3 font-medium" scope="col">Issuer</th>
            <th className="px-4 pb-3 text-right font-medium" scope="col">Supply</th>
            <th className="px-4 pb-3 text-right font-medium" scope="col">Decimals</th>
            <th className="px-4 pb-3 font-medium" scope="col">Unit measurement</th>
            <th className="px-4 pb-3 text-right font-medium" scope="col">Tick</th>
            <th className="px-4 pb-3 font-medium" scope="col">Issuance transaction</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--glyph-line)]">
          {rows.map((row) => (
            <tr className="align-top text-sm text-[var(--glyph-muted)]" key={row.key}>
              <td className="px-4 py-3 font-semibold text-[var(--glyph-ink)] sm:px-0">
                {row.assetName ?? <span className="font-normal text-[var(--glyph-tertiary)]">Not reported</span>}
              </td>
              <td className="px-4 py-3"><IssuerCell value={row.issuerIdentity} /></td>
              <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-xs text-[var(--glyph-ink)]">
                {formatShares(row.numberOfShares)}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-xs text-[var(--glyph-ink)]">
                {row.numberOfDecimalPlaces === undefined ? "Not reported" : formatNumber(row.numberOfDecimalPlaces)}
              </td>
              <td className="px-4 py-3">
                {row.unitOfMeasurement ? (
                  <code className="font-mono text-xs text-[var(--glyph-ink)]" title="Raw unitOfMeasurement reported by the query API">
                    {row.unitOfMeasurement}
                  </code>
                ) : (
                  <span className="text-[var(--glyph-tertiary)]">Not reported</span>
                )}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-xs"><TickCell value={row.tickNumber} /></td>
              <td className="px-4 py-3"><TransactionCell value={row.transactionHash} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TokensPage() {
  const query = useAssetIssuanceEvents(PAGE_SIZE);
  const pages = query.data?.pages ?? [];
  const rows = pages.flatMap(normalizeAssetIssuancePage);
  const total = pages[0]?.hits.total;
  const totalLabel = formatTotal(total);

  return (
    <ExplorerFrame>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4 border-b border-[var(--glyph-line)] pb-4">
        <div>
          <p className="text-xs uppercase tracking-[0.1em] text-[var(--glyph-tertiary)]">Qubic assets</p>
          <h1 className="mt-2 font-mono text-2xl font-semibold tracking-[-0.05em] text-[var(--glyph-ink)]">Tokens</h1>
        </div>
        <div className="text-right text-xs text-[var(--glyph-tertiary)]">
          <p>Official issuance events</p>
          {totalLabel ? <p className="mt-1 font-mono text-[var(--glyph-muted)]">{formatNumber(rows.length)} of {totalLabel}</p> : null}
        </div>
      </div>

      <Panel title="Asset issuance registry">
        <p className="mb-5 max-w-3xl text-sm leading-6 text-[var(--glyph-muted)]">
          This list uses the official Qubic query API&apos;s paginated asset-issuance events. Supply, decimals, and unit measurements are shown only when reported by the API. Prices and off-chain metadata are not inferred.
        </p>

        {query.isError && !query.data && isUnsupportedAssetApi(query.error) ? (
          <StatusMessage
            description="The documented Qubic event-log endpoint is not available on the selected RPC service, so no token list can be shown."
            status="error"
            title="Official asset issuance data is unavailable"
          />
        ) : (
          <QueryState
            emptyMessage="The official query API returned no asset issuance events."
            emptyWhen={(data) => {
              if (!data || typeof data !== "object") return false;
              const result = data as { pages?: unknown[] };
              return Array.isArray(result.pages) && result.pages.length > 0 && rows.length === 0;
            }}
            label="asset issuance events"
            query={query}
          >
            {rows.length > 0 ? <IssuanceTable rows={rows} /> : null}
            {query.hasNextPage ? (
              <div className="mt-5 flex justify-center border-t border-[var(--glyph-line)] pt-5">
                <GlyphButton
                  disabled={query.isFetchingNextPage}
                  icon={ArrowDown01Icon}
                  onClick={() => void query.fetchNextPage()}
                  size="sm"
                  variant="secondary"
                >
                  {query.isFetchingNextPage ? "Loading…" : "Load more"}
                </GlyphButton>
              </div>
            ) : null}
          </QueryState>
        )}

        <QueryRefreshMeta query={query} />
      </Panel>
    </ExplorerFrame>
  );
}
