"use client";

import { useTickData } from "@/lib/rpc/queries";

import {
  ExplorerFrame,
  CopyButton,
  ExplorerLink,
  IdentifierValue,
  InvalidLookup,
  KeyValueList,
  PageHeader,
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
      <PageHeader
        eyebrow="Network tick"
        title={<span className="font-mono">{formatNumber(tick)}</span>}
        description="Timing, computor, and transaction information reported for this tick."
        actions={<div className="flex items-center gap-3">
          <ExplorerLink href={`/tick/${tick}/transactions`}>Transactions</ExplorerLink>
          <CopyButton label="Copy tick" value={String(tick)} />
        </div>}
      />

      <section aria-labelledby="tick-metadata">
        <h2 className="mb-4 text-base font-semibold tracking-[-0.03em] text-[var(--glyph-ink)]" id="tick-metadata">Metadata</h2>
        <QueryState
          label="tick data"
          loading={<SkeletonKeyValueList label="Loading tick metadata" rows={7} />}
          noResultMessage="No tick data."
          query={tickData}
        >
          {tickData.data ? (
            <KeyValueList
              items={[
                { label: "Tick", value: <span className="font-mono">{formatNumber(tickData.data.tickNumber ?? tick)}</span> },
                { label: "Epoch", value: <span className="font-mono">{formatNumber(tickData.data.epoch)}</span> },
                { label: "Computor", value: <span className="font-mono">{formatNumber(tickData.data.computorIndex)}</span> },
                { label: "Timestamp", value: formatTimestamp(tickData.data.timestamp) },
                { label: "Transactions", value: <span className="font-mono">{formatNumber(tickData.data.transactionHashes?.length)}</span> },
                { label: "Contract fees", value: tickData.data.contractFees?.length ? formatNumber(tickData.data.contractFees.length) : "None reported" },
                { label: "Signature", wide: true, value: (
                  <span className="flex items-start gap-2 text-sm text-[var(--glyph-ink)]">
                  <span className="min-w-0 flex-1"><IdentifierValue value={tickData.data.signature} /></span>
                  {tickData.data.signature ? <CopyButton label="Copy signature" value={tickData.data.signature} /> : null}
                  </span>
                ) },
              ]}
            />
          ) : null}
        </QueryState>
        <QueryRefreshMeta query={tickData} />
      </section>

    </ExplorerFrame>
  );
}
