import { contractIndexToIdentity } from "@qubic.org/crypto";
import { describe, expect, test } from "bun:test";

import { formatContractInvocation, identifyContractInvocation } from "../contracts";

function base64ForByteLength(length: number): string {
  return btoa(String.fromCharCode(...new Uint8Array(length)));
}

describe("contract invocation metadata", () => {
  test("recognizes a generated Qearn procedure from RPC transaction fields", () => {
    const invocation = identifyContractInvocation({
      destination: contractIndexToIdentity(9),
      inputType: 2,
      inputSize: 12,
      inputData: base64ForByteLength(12),
    });

    expect(invocation).toEqual({
      status: "recognized",
      contractIndex: 9,
      contractName: "Qearn",
      procedureName: "Unlock",
      inputType: 2,
      inputSize: 12,
      payloadSize: 12,
    });
    expect(formatContractInvocation(invocation)).toEqual({
      title: "Qearn · Unlock",
      description: "Contract index 9 · input type 2 · 12 reported bytes · 12 decoded bytes.",
    });
  });

  test("recognizes procedures without an input builder when the generated decoder identifies them", () => {
    const invocation = identifyContractInvocation({
      destination: contractIndexToIdentity(28),
      inputType: 9,
      inputSize: 0,
      inputData: "",
    });

    expect(invocation).toMatchObject({
      status: "recognized",
      contractName: "GGWP",
      procedureName: "Finalize Unstake",
      inputType: 9,
      payloadSize: 0,
    });
  });

  test("does not guess for an unrecognized contract destination", () => {
    const invocation = identifyContractInvocation({
      destination: contractIndexToIdentity(100),
      inputType: 1,
      inputData: "",
    });

    expect(invocation).toEqual({ status: "unknown", reason: "destination" });
    expect(formatContractInvocation(invocation).title).toBe("Unrecognized contract invocation");
  });

  test("does not guess for an unknown procedure on a known contract", () => {
    const invocation = identifyContractInvocation({
      destination: contractIndexToIdentity(9),
      inputType: 99,
      inputData: "",
    });

    expect(invocation).toEqual({
      status: "unknown",
      reason: "input-type",
      contractName: "Qearn",
      contractIndex: 9,
      inputType: 99,
    });
  });

  test("reports invalid base64 instead of decoding guessed data", () => {
    const invocation = identifyContractInvocation({
      destination: contractIndexToIdentity(9),
      inputType: 2,
      inputData: "not base64",
    });

    expect(invocation).toMatchObject({
      status: "invalid",
      reason: "input-data",
      contractName: "Qearn",
      procedureName: "Unlock",
    });
    expect(formatContractInvocation(invocation).title).toBe("Contract invocation unavailable");
  });

  test("reports a payload size mismatch as invalid data", () => {
    const invocation = identifyContractInvocation({
      destination: contractIndexToIdentity(9),
      inputType: 2,
      inputSize: 11,
      inputData: base64ForByteLength(12),
    });

    expect(invocation).toMatchObject({ status: "invalid", reason: "input-size" });
  });

  test("reports missing RPC fields as unavailable", () => {
    expect(identifyContractInvocation({})).toEqual({ status: "unavailable", reason: "destination" });
    expect(
      identifyContractInvocation({ destination: contractIndexToIdentity(9) }),
    ).toEqual({ status: "unavailable", reason: "input-type" });
  });
});
