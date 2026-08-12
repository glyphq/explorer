import type { AssetIssuance, QueryEvent } from "@qubic.org/rpc";

import type { ExplorerAssetIssuanceEventsPage } from "./rpc/adapter";
import { normalizeAssetIndex } from "./rpc/validation";

export interface AssetIssuanceRow {
  readonly key: string;
  readonly universeIndex?: number;
  readonly issuerIdentity?: string;
  readonly assetName?: string;
  readonly numberOfShares?: string;
  readonly numberOfDecimalPlaces?: number;
  readonly unitOfMeasurement?: string;
  readonly epoch?: number;
  readonly tickNumber?: number;
  readonly transactionHash?: string;
  readonly logId?: string;
}

function nonEmptyString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized ? normalized : undefined;
}

function reportedNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function rowKey(event: QueryEvent, index: number, offset: number): string {
  const logId = nonEmptyString(event.logId);
  if (logId) return `log-${event.epoch ?? "unknown"}-${logId}`;

  const transactionHash = nonEmptyString(event.transactionHash);
  if (transactionHash) return `transaction-${transactionHash}`;

  return `issuance-${event.epoch ?? "unknown"}-${event.tickNumber ?? "unknown"}-${offset + index}`;
}

export function normalizeAssetIssuanceEvent(
  event: QueryEvent,
  index = 0,
  offset = 0,
): AssetIssuanceRow {
  const issuance = event.assetIssuance;

  return {
    key: rowKey(event, index, offset),
    issuerIdentity: nonEmptyString(issuance?.assetIssuer),
    assetName: nonEmptyString(issuance?.assetName),
    numberOfShares: nonEmptyString(issuance?.numberOfShares),
    numberOfDecimalPlaces: reportedNumber(issuance?.numberOfDecimalPlaces),
    unitOfMeasurement: nonEmptyString(issuance?.unitOfMeasurement),
    epoch: reportedNumber(event.epoch),
    tickNumber: reportedNumber(event.tickNumber),
    transactionHash: nonEmptyString(event.transactionHash),
    logId: nonEmptyString(event.logId),
  };
}

export function normalizeAssetIssuance(issuance: AssetIssuance): AssetIssuanceRow {
  const data = issuance.data;
  const universeIndex = normalizeAssetIndex(issuance.universeIndex) ?? undefined;

  return {
    key: `asset-${universeIndex ?? "unknown"}`,
    universeIndex,
    issuerIdentity: nonEmptyString(data?.issuerIdentity),
    assetName: nonEmptyString(data?.name),
    numberOfDecimalPlaces: reportedNumber(data?.numberOfDecimalPlaces),
    unitOfMeasurement: formatReportedUnit(data?.unitOfMeasurement),
    tickNumber: reportedNumber(issuance.tick),
  };
}

export function getAssetIssuanceHref(index: unknown): string | null {
  const normalized = normalizeAssetIndex(index);
  return normalized === null ? null : `/tokens/${normalized}`;
}

export function normalizeAssetIssuances(issuances: readonly AssetIssuance[]): AssetIssuanceRow[] {
  return issuances
    .map(normalizeAssetIssuance)
    .sort((left, right) => (left.assetName ?? "").localeCompare(right.assetName ?? ""));
}
export function normalizeAssetIssuancePage(page: ExplorerAssetIssuanceEventsPage): AssetIssuanceRow[] {
  return page.eventLogs.map((event, index) =>
    normalizeAssetIssuanceEvent(event, index, page.requestedOffset ?? page.hits.from ?? 0),
  );
}

export function getNextAssetIssuanceOffset(
  page: ExplorerAssetIssuanceEventsPage,
): number | undefined {
  const from = page.hits.from ?? page.requestedOffset ?? 0;
  const returned = page.eventLogs.length;
  const next = from + returned;
  const total = page.hits.total;

  if (
    returned <= 0 ||
    (total !== undefined && next >= total) ||
    (page.requestedSize !== undefined && returned < page.requestedSize)
  ) {
    return undefined;
  }
  return next;
}

export function formatReportedUnit(value: string | number[] | undefined): string {
  if (typeof value === "string" && value.trim()) return value;
  if (Array.isArray(value)) return `[${value.join(", ")}]`;
  return "Not reported";
}
