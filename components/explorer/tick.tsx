"use client";

import { useTickData } from "@/lib/rpc/queries";

import {
  ExplorerFrame,
  CopyButton,
  ExplorerLink,
  IdentifierValue,
  InvalidLookup,
  KeyValueList,
  Panel,
  QueryRefreshMeta,
  QueryState,
} from "./primitives";
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
      <div className="mb-4 flex items-center gap-2 border-b border-[var(--glyph-line)] pb-4">
        <p className="min-w-0 flex-1 font-mono text-2xl font-semibold tracking-[-0.05em] text-[var(--glyph-ink)]">{formatNumber(tick)}</p>
        <CopyButton label="Copy tick" value={String(tick)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <Panel title="Tick record">
          <QueryState
            label="tick data"
            noResultMessage="No tick record was found for this tick."
            query={tickData}
          >
            {tickData.data ? (
              <KeyValueList
                items={[
                  { label: "Tick", value: formatNumber(tickData.data.tickNumber ?? tick) },
                  { label: "Archive record", value: "Available" },
                  { label: "Epoch", value: formatNumber(tickData.data.epoch) },
                  { label: "Computor index", value: formatNumber(tickData.data.computorIndex) },
                  { label: "Timestamp", value: formatTimestamp(tickData.data.timestamp) },
                  { label: "Transaction hashes", value: formatNumber(tickData.data.transactionHashes?.length) },
                  { label: "Contract fees", value: tickData.data.contractFees?.length ? `${formatNumber(tickData.data.contractFees.length)} reported` : "None reported" },
                  { label: "Signature", value: <IdentifierValue value={tickData.data.signature} />, wide: true },
                ]}
              />
            ) : null}
          </QueryState>
          <QueryRefreshMeta query={tickData} />
        </Panel>

        <Panel title="Transactions in tick">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-mono text-sm text-[var(--glyph-ink)]">
                {tickData.data ? `${formatNumber(tickData.data.transactionHashes?.length)} transaction hashes` : "Archive record required"}
              </p>
              <p className="mt-1 text-xs text-[var(--glyph-tertiary)]">Source · destination · amount · input type</p>
            </div>
            <ExplorerLink href={`/tick/${tick}/transactions`}>View transactions</ExplorerLink>
          </div>
        </Panel>
      </div>

    </ExplorerFrame>
  );
}
