import { describe, expect, test } from "bun:test";

import {
  formatReportedUnit,
  getNextAssetIssuanceOffset,
  normalizeAssetIssuanceEvent,
  normalizeAssetIssuancePage,
} from "../assets";
import type { ExplorerAssetIssuanceEventsPage } from "../rpc/adapter";

const QPAY_ISSUER = "QPAYNOWSWZMGHFEAEVJXGZAVSHABAZDDBDIHTEBOPCOGHRGBCYCUZOHCVLXG";
const QPAY_TRANSACTION = "jngmiqswjogtsawmoqgpgpxoppdazionxvjhcdmygbnflmykkbxkhmibslel";

const officialPage: ExplorerAssetIssuanceEventsPage = {
  hits: { total: 3, from: 0, size: 2 },
  requestedOffset: 0,
  requestedSize: 2,
  validForTick: 73840061,
  eventLogs: [
    {
      epoch: 225,
      tickNumber: 72120690,
      timestamp: "1785955349000",
      transactionHash: QPAY_TRANSACTION,
      logType: 1,
      logId: "170935",
      logDigest: "d9fe2d567b95a0e6",
      categories: [],
      assetIssuance: {
        assetIssuer: QPAY_ISSUER,
        numberOfShares: "1000000000",
        managingContractIndex: "1",
        assetName: "QPAY",
        numberOfDecimalPlaces: 0,
        unitOfMeasurement: "ISARKdAA0A==",
      },
    },
    {
      epoch: 207,
      tickNumber: 48805756,
      logType: 1,
      logId: "20722186",
      assetIssuance: {
        assetIssuer: "A".repeat(60),
        numberOfShares: "676",
        managingContractIndex: "1",
        assetName: "QUSINO",
        numberOfDecimalPlaces: 0,
        unitOfMeasurement: "AAAAAAAAAA==",
      },
    },
  ],
};

describe("official asset issuance normalization", () => {
  test("keeps issuer, supply, unit, and link fields from a real query response", () => {
    const [row] = normalizeAssetIssuancePage(officialPage);

    expect(row).toMatchObject({
      key: "log-225-170935",
      issuerIdentity: QPAY_ISSUER,
      assetName: "QPAY",
      numberOfShares: "1000000000",
      numberOfDecimalPlaces: 0,
      unitOfMeasurement: "ISARKdAA0A==",
      epoch: 225,
      tickNumber: 72120690,
      transactionHash: QPAY_TRANSACTION,
      logId: "170935",
    });
  });

  test("does not invent missing event fields", () => {
    const [, row] = normalizeAssetIssuancePage(officialPage);

    expect(row?.transactionHash).toBeUndefined();
    expect(row?.unitOfMeasurement).toBe("AAAAAAAAAA==");
    expect(row?.numberOfShares).toBe("676");
  });

  test("uses actual returned rows and official offsets for Load more", () => {
    expect(getNextAssetIssuanceOffset(officialPage)).toBe(2);
    expect(
      getNextAssetIssuanceOffset({
        ...officialPage,
        hits: { total: 3, from: 2, size: 1 },
        requestedOffset: 2,
        requestedSize: 3,
        eventLogs: [officialPage.eventLogs[0]!],
      }),
    ).toBeUndefined();
    expect(
      getNextAssetIssuanceOffset({
        ...officialPage,
        hits: { total: 100, from: 30, size: 30 },
        requestedOffset: 30,
        requestedSize: 1,
        eventLogs: [officialPage.eventLogs[0]!],
      }),
    ).toBe(31);
    expect(
      getNextAssetIssuanceOffset({
        ...officialPage,
        hits: { total: 100, from: 30, size: 30 },
        requestedOffset: 30,
        requestedSize: 30,
        eventLogs: [],
      }),
    ).toBeUndefined();
  });

  test("formats reported units without decoding or replacing the API value", () => {
    expect(formatReportedUnit("ISARKdAA0A==")).toBe("ISARKdAA0A==");
    expect(formatReportedUnit([33, 32, 17, 41, -48, 0, -48])).toBe("[33, 32, 17, 41, -48, 0, -48]");
    expect(formatReportedUnit(undefined)).toBe("Not reported");
  });

  test("normalizes an event without reported optional fields", () => {
    const row = normalizeAssetIssuanceEvent({ epoch: 1, tickNumber: 2 }, 0, 30);
    expect(row).toEqual({
      key: "issuance-1-2-30",
      epoch: 1,
      tickNumber: 2,
    });
  });
});
