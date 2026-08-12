"use client";

import type { AssetIssuance } from "@qubic.org/rpc";

import { isExplorerRpcError } from "@/lib/rpc/errors";
import { formatReportedUnit } from "@/lib/assets";
import { useAssetIssuance } from "@/lib/rpc/queries";
import {
  formatIdentifier,
  formatTick,
  normalizeIdentity,
} from "@/lib/rpc/validation";

import {
  ExplorerFrame,
  ExplorerLink,
  InvalidLookup,
  KeyValueList,
  QueryRefreshMeta,
  QueryState,
  StatusMessage,
} from "./primitives";
import { formatNumber } from "./utils";

function isUnsupportedAssetApi(error: unknown): boolean {
  return (
    isExplorerRpcError(error) &&
    error.kind === "http" &&
    [405, 501].includes(error.status ?? 0)
  );
}

function isMissingAssetIssuance(error: unknown): boolean {
  return isExplorerRpcError(error) && error.kind === "http" && error.status === 404;
}

function IssuerValue({ value }: { value: string | undefined }) {
  const identity = normalizeIdentity(value);
  if (!value) return <span className="text-[var(--glyph-tertiary)]">Not reported</span>;

  return identity ? (
    <ExplorerLink href={`/identity/${identity}`}>
      <span title={identity}>{formatIdentifier(identity)}</span>
    </ExplorerLink>
  ) : (
    <code className="break-all font-mono text-xs">{value}</code>
  );
}

function Detail({ issuance }: { issuance: AssetIssuance }) {
  const data = issuance.data;

  return (
    <>
      <header className="mb-5 flex flex-wrap items-end justify-between gap-4 border-b border-[var(--glyph-line)] pb-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.05em] text-[var(--glyph-ink)]">
            {data?.name ?? "Asset issuance"}
          </h1>
          <p className="mt-1 text-sm text-[var(--glyph-muted)]">Reported issuance details.</p>
        </div>
        <ExplorerLink href="/tokens">Back to tokens</ExplorerLink>
      </header>

      <KeyValueList
        items={[
          { label: "Issuer", value: <IssuerValue value={data?.issuerIdentity} /> },
          { label: "Asset name", value: data?.name ?? <span className="text-[var(--glyph-tertiary)]">Not reported</span> },
          { label: "Type", value: data?.type === undefined ? "Not reported" : formatNumber(data.type) },
          { label: "Decimal places", value: data?.numberOfDecimalPlaces === undefined ? "Not reported" : formatNumber(data.numberOfDecimalPlaces) },
          { label: "Unit measurement", value: <code className="break-all font-mono text-xs">{formatReportedUnit(data?.unitOfMeasurement)}</code> },
          { label: "Universe index", value: issuance.universeIndex === undefined ? "Not reported" : formatNumber(issuance.universeIndex) },
          { label: "Issuance tick", value: issuance.tick === undefined ? "Not reported" : formatTick(issuance.tick) },
        ]}
      />
    </>
  );
}

export function TokenPage({ index }: { index: number | null }) {
  const query = useAssetIssuance(index);

  if (index === null) {
    return (
      <ExplorerFrame>
        <InvalidLookup
          expected="Use a whole-number universe index from 0 through 4,294,967,295."
          label="Asset index"
          value="Invalid route parameter"
        />
      </ExplorerFrame>
    );
  }

  return (
    <ExplorerFrame>
      {query.isError && !query.data && isMissingAssetIssuance(query.error) ? (
        <StatusMessage
          description="The official live asset API did not return an issuance for this universe index."
          status="empty"
          title="Asset issuance not found"
        />
      ) : query.isError && !query.data && isUnsupportedAssetApi(query.error) ? (
        <StatusMessage
          description="The documented official asset issuance detail endpoint is not available on the selected RPC service."
          status="error"
          title="Asset issuance detail is unavailable"
        />
      ) : (
        <QueryState
          emptyMessage="No official asset issuance was returned for this universe index."
          emptyWhen={(data) => {
            if (!data || typeof data !== "object") return true;
            return !(data as AssetIssuance).data;
          }}
          label="asset issuance"
          noResultMessage="No official asset issuance was returned for this universe index."
          query={query}
        >
          {query.data ? <Detail issuance={query.data} /> : null}
        </QueryState>
      )}
      <QueryRefreshMeta query={query} />
    </ExplorerFrame>
  );
}
