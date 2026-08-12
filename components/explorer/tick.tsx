"use client";

import { useTickData } from "@/lib/rpc/queries";

import {
  ExplorerFrame,
  CopyButton,
  ExplorerLink,
  IdentifierValue,
  InvalidLookup,
  QueryRefreshMeta,
  QueryState,
} from "./primitives";
import { SkeletonKeyValueList } from "./skeletons";
import { formatNumber, formatTimestamp } from "./utils";

export function TickPage({ tick }: { tick: number | null }) {
  const tickData = useTickData(tick);

  if (tick === null) {
    return (
      <ExplorerFrame>
        <InvalidLookup
          expected="Use a whole-number tick from 0 through 4,294,967,295."
          label="Tick"
          value="Invalid route parameter"
        />
      </ExplorerFrame>
    );
  }

  return (
    <ExplorerFrame>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--glyph-line)] pb-4">
        <p className="min-w-0 flex-1 font-mono text-2xl font-semibold tracking-[-0.05em] text-[var(--glyph-ink)]">{formatNumber(tick)}</p>
        <div className="flex items-center gap-3">
          <ExplorerLink href={`/tick/${tick}/transactions`}>Transactions</ExplorerLink>
          <CopyButton label="Copy tick" value={String(tick)} />
        </div>
      </div>

      <section aria-labelledby="tick-metadata">
        <h2 className="mb-4 text-base font-semibold tracking-[-0.03em] text-[var(--glyph-ink)]" id="tick-metadata">Metadata</h2>
        <QueryState
          label="tick data"
          loading={<SkeletonKeyValueList label="Loading tick metadata" rows={7} />}
          noResultMessage="No tick data."
          query={tickData}
        >
          {tickData.data ? (
            <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <dt className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--glyph-tertiary)]">Tick</dt>
                <dd className="mt-1 font-mono text-sm text-[var(--glyph-ink)]">{formatNumber(tickData.data.tickNumber ?? tick)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--glyph-tertiary)]">Epoch</dt>
                <dd className="mt-1 font-mono text-sm text-[var(--glyph-ink)]">{formatNumber(tickData.data.epoch)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--glyph-tertiary)]">Computor</dt>
                <dd className="mt-1 font-mono text-sm text-[var(--glyph-ink)]">{formatNumber(tickData.data.computorIndex)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--glyph-tertiary)]">Timestamp</dt>
                <dd className="mt-1 text-sm text-[var(--glyph-ink)]">{formatTimestamp(tickData.data.timestamp)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--glyph-tertiary)]">Transaction hashes</dt>
                <dd className="mt-1 font-mono text-sm text-[var(--glyph-ink)]">{formatNumber(tickData.data.transactionHashes?.length)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--glyph-tertiary)]">Contract fees</dt>
                <dd className="mt-1 font-mono text-sm text-[var(--glyph-ink)]">
                  {tickData.data.contractFees?.length ? formatNumber(tickData.data.contractFees.length) : "None reported"}
                </dd>
              </div>
              <div className="sm:col-span-2 lg:col-span-4">
                <dt className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--glyph-tertiary)]">Signature</dt>
                <dd className="mt-1 flex items-start gap-2 text-sm text-[var(--glyph-ink)]">
                  <span className="min-w-0 flex-1"><IdentifierValue value={tickData.data.signature} /></span>
                  {tickData.data.signature ? <CopyButton label="Copy signature" value={tickData.data.signature} /> : null}
                </dd>
              </div>
            </dl>
          ) : null}
        </QueryState>
        <QueryRefreshMeta query={tickData} />
      </section>

    </ExplorerFrame>
  );
}
