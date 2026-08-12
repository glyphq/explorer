import * as officialContracts from "@qubic.org/contracts";
import { contractIndexToIdentity } from "@qubic.org/crypto";
import { describe, expect, test } from "bun:test";

import {
  CONTRACTS_CATALOGUE,
  filterContracts,
  getContractIdentityHref,
  getPublishedProcedureCount,
} from "../contracts-catalogue";

const packageExports = officialContracts as unknown as Record<string, unknown>;

function getQearn() {
  const qearn = CONTRACTS_CATALOGUE.find((contract) => contract.exportName === "qearn");
  if (!qearn) throw new Error("Expected the generated qearn namespace");
  return qearn;
}

describe("generated contracts catalogue", () => {
  test("has one row for every generated contract namespace and index export", () => {
    const exportedIndices = Object.entries(packageExports)
      .filter(([name, value]) => name.endsWith("_CONTRACT_INDEX") && typeof value === "number")
      .map(([, value]) => value as number)
      .sort((left, right) => Number(left) - Number(right));

    expect(CONTRACTS_CATALOGUE.map((contract) => contract.index)).toEqual(exportedIndices);
    expect(CONTRACTS_CATALOGUE.every((contract) => contract.identity === contractIndexToIdentity(contract.index))).toBe(true);
  });

  test("publishes input type constants from the official generated exports", () => {
    const qearn = getQearn();

    expect(qearn).toMatchObject({
      name: "Qearn",
      index: 9,
      identity: contractIndexToIdentity(9),
    });
    expect(qearn.inputTypes).toEqual(expect.arrayContaining([
      expect.objectContaining({ exportName: "QEARN_LOCK_INPUT_TYPE", inputType: 1 }),
      expect.objectContaining({ exportName: "QEARN_UNLOCK_INPUT_TYPE", inputType: 2 }),
      expect.objectContaining({ exportName: "QEARN_GET_STATE_OF_ROUND_INPUT_TYPE", inputType: 3 }),
    ]));
    expect(qearn.inputTypes.every((input) => input.exportName in packageExports)).toBe(true);
  });

  test("counts published procedures from the generated input type exports", () => {
    expect(getPublishedProcedureCount(getQearn())).toBe(getQearn().inputTypes.length);
    expect(getPublishedProcedureCount({ inputTypes: [] })).toBe(0);
  });

  test("filters by generated name, index, and identity", () => {
    const qearn = getQearn();

    expect(filterContracts(CONTRACTS_CATALOGUE, "qearn")).toEqual([qearn]);
    expect(filterContracts(CONTRACTS_CATALOGUE, String(qearn.index))).toContainEqual(qearn);
    expect(filterContracts(CONTRACTS_CATALOGUE, qearn.identity)).toEqual([qearn]);
    expect(filterContracts(CONTRACTS_CATALOGUE, "does-not-exist")).toEqual([]);
  });

  test("URL-encodes canonical identities for internal identity links", () => {
    expect(getContractIdentityHref("identity/with spaces")).toBe("/identity/identity%2Fwith%20spaces");
    expect(getContractIdentityHref(getQearn().identity)).toBe(`/identity/${getQearn().identity}`);
  });
});
