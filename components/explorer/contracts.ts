import { contractIndexToIdentity } from "@qubic.org/crypto";
import * as officialContracts from "@qubic.org/contracts";
import type { QueryTransaction } from "@qubic.org/rpc";

type ExportRecord = Record<string, unknown>;

type TransactionContractFields = Pick<
  QueryTransaction,
  "destination" | "inputType" | "inputSize" | "inputData"
>;

export type ContractInvocation =
  | {
      status: "recognized";
      contractIndex: number;
      contractName: string;
      procedureName: string;
      inputType: number;
      inputSize: number | null;
      payloadSize: number | null;
    }
  | {
      status: "unknown";
      reason: "destination" | "input-type";
      contractName?: string;
      contractIndex?: number;
      inputType?: number;
    }
  | {
      status: "unavailable";
      reason: "destination" | "input-type";
    }
  | {
      status: "invalid";
      reason: "input-type" | "input-size" | "input-data";
      contractName?: string;
      contractIndex?: number;
      procedureName?: string;
      inputType?: number;
    };

export interface ContractInvocationDisplay {
  title: string;
  description: string;
}

interface KnownProcedure {
  contractIndex: number;
  contractName: string;
  destination: string;
  inputType: number;
  procedureName: string;
}

interface KnownContract {
  contractIndex: number;
  contractName: string;
  destination: string;
  procedures: KnownProcedure[];
}

const CONTRACT_DISPLAY_NAMES: Record<string, string> = {
  computorControlledFund: "ComputorControlledFund",
  escrow: "Escrow",
  gGWP: "GGWP",
  generalQuorumProposal: "GeneralQuorumProposal",
  msVault: "MsVault",
  myLastMatch: "MyLastMatch",
  nostromo: "Nostromo",
  pulse: "Pulse",
  qBond: "QBond",
  qDuel: "QDuel",
  qIP: "QIP",
  qRWA: "qRWA",
  qRaffle: "QRaffle",
  qReservePool: "QReservePool",
  qThirtyFour: "QThirtyFour",
  qUtil: "QUtil",
  qVAULT: "QVault",
  qbay: "Qbay",
  qdraw: "Qdraw",
  qearn: "Qearn",
  qswap: "Qswap",
  quottery: "Quottery",
  qusino: "Qusino",
  qx: "QX",
  random: "Random",
  randomLottery: "RandomLottery",
  supplyWatcher: "SupplyWatcher",
  vottunBridge: "VottunBridge",
};

const contractExports = officialContracts as unknown as ExportRecord;

function asRecord(value: unknown): ExportRecord | null {
  return typeof value === "object" && value !== null ? (value as ExportRecord) : null;
}

function pascalCaseToConstantPart(value: string): string {
  return value
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toUpperCase();
}

function formatProcedureName(value: string): string {
  const words = value
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(" ")
    .filter(Boolean);

  return words
    .map((word) => (word.length <= 3 ? word.toUpperCase() : `${word[0]?.toUpperCase() ?? ""}${word.slice(1).toLowerCase()}`))
    .join(" ");
}

function getContractIndexExports(): Array<{ index: number; prefix: string }> {
  return Object.entries(contractExports)
    .filter(([key, value]) => key.endsWith("_CONTRACT_INDEX") && typeof value === "number")
    .map(([key, value]) => ({
      index: value as number,
      prefix: key.slice(0, -"_CONTRACT_INDEX".length),
    }));
}

function buildKnownContracts(): KnownContract[] {
  const indexExports = getContractIndexExports();

  return Object.entries(contractExports).flatMap(([namespaceName, value]) => {
    const namespace = asRecord(value);
    const contractIndex = namespace?.contractIndex;
    if (!namespace || typeof contractIndex !== "number") return [];

    const indexExport = indexExports.find((entry) => entry.index === contractIndex);
    const contractName = CONTRACT_DISPLAY_NAMES[namespaceName];
    if (!indexExport || !contractName) return [];

    const destination = contractIndexToIdentity(contractIndex);
    const procedures = Object.keys(namespace)
      .filter((key) => key.startsWith("decode") && key.endsWith("Output"))
      .flatMap((key) => {
        const procedureName = key.slice("decode".length, -"Output".length);
        const inputType = contractExports[
          `${indexExport.prefix}_${pascalCaseToConstantPart(procedureName)}_INPUT_TYPE`
        ];
        if (typeof inputType !== "number") return [];

        return [
          {
            contractIndex,
            contractName,
            destination,
            inputType,
            procedureName: formatProcedureName(procedureName),
          },
        ];
      });

    return [{ contractIndex, contractName, destination, procedures }];
  });
}

const KNOWN_CONTRACTS = buildKnownContracts();
const KNOWN_CONTRACTS_BY_DESTINATION = new Map(
  KNOWN_CONTRACTS.map((contract) => [contract.destination, contract]),
);

const BASE64_PATTERN = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

function decodeBase64(value: string): Uint8Array | null {
  if (!BASE64_PATTERN.test(value)) return null;

  try {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  } catch {
    return null;
  }
}

function normalizeDestination(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim().toUpperCase() : null;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

/**
 * Identifies only metadata exposed by the generated contracts package.
 * The archive schema says inputData is base64 and inputType is a procedure index.
 * The package exposes procedure output decoders and input builders, not input
 * decoders, so this helper intentionally does not invent argument field names.
 */
export function identifyContractInvocation(transaction: TransactionContractFields): ContractInvocation {
  const destination = normalizeDestination(transaction.destination);
  if (!destination) return { status: "unavailable", reason: "destination" };

  const contract = KNOWN_CONTRACTS_BY_DESTINATION.get(destination);
  if (!contract) return { status: "unknown", reason: "destination" };

  if (transaction.inputType === undefined) return { status: "unavailable", reason: "input-type" };
  if (!isPositiveInteger(transaction.inputType)) {
    return {
      status: "invalid",
      reason: "input-type",
      contractName: contract.contractName,
      contractIndex: contract.contractIndex,
    };
  }

  const procedure = contract.procedures.find(({ inputType }) => inputType === transaction.inputType);
  if (!procedure) {
    return {
      status: "unknown",
      reason: "input-type",
      contractName: contract.contractName,
      contractIndex: contract.contractIndex,
      inputType: transaction.inputType,
    };
  }

  if (transaction.inputSize !== undefined && !isNonNegativeInteger(transaction.inputSize)) {
    return {
      status: "invalid",
      reason: "input-size",
      contractName: procedure.contractName,
      contractIndex: procedure.contractIndex,
      procedureName: procedure.procedureName,
      inputType: procedure.inputType,
    };
  }

  let payloadSize: number | null = null;
  if (transaction.inputData !== undefined) {
    if (typeof transaction.inputData !== "string") {
      return {
        status: "invalid",
        reason: "input-data",
        contractName: procedure.contractName,
        contractIndex: procedure.contractIndex,
        procedureName: procedure.procedureName,
        inputType: procedure.inputType,
      };
    }

    const payload = decodeBase64(transaction.inputData);
    if (!payload) {
      return {
        status: "invalid",
        reason: "input-data",
        contractName: procedure.contractName,
        contractIndex: procedure.contractIndex,
        procedureName: procedure.procedureName,
        inputType: procedure.inputType,
      };
    }
    payloadSize = payload.byteLength;
  }

  if (transaction.inputSize !== undefined && payloadSize !== null && transaction.inputSize !== payloadSize) {
    return {
      status: "invalid",
      reason: "input-size",
      contractName: procedure.contractName,
      contractIndex: procedure.contractIndex,
      procedureName: procedure.procedureName,
      inputType: procedure.inputType,
    };
  }

  return {
    status: "recognized",
    contractIndex: procedure.contractIndex,
    contractName: procedure.contractName,
    procedureName: procedure.procedureName,
    inputType: procedure.inputType,
    inputSize: transaction.inputSize ?? null,
    payloadSize,
  };
}

export function formatContractInvocation(invocation: ContractInvocation): ContractInvocationDisplay {
  if (invocation.status === "recognized") {
    const payload = invocation.payloadSize === null ? "payload not reported" : `${invocation.payloadSize} decoded bytes`;
    const reportedSize = invocation.inputSize === null ? "input size not reported" : `${invocation.inputSize} reported bytes`;
    return {
      title: `${invocation.contractName} · ${invocation.procedureName}`,
      description: `Contract index ${invocation.contractIndex} · input type ${invocation.inputType} · ${reportedSize} · ${payload}.`,
    };
  }

  if (invocation.status === "unknown") {
    return {
      title: "Unrecognized contract invocation",
      description:
        invocation.reason === "destination"
          ? "The transaction destination is not a contract published by @qubic.org/contracts."
          : `No published procedure matches input type ${invocation.inputType ?? "not reported"} for ${invocation.contractName ?? "this contract"}.`,
    };
  }

  if (invocation.status === "unavailable") {
    return {
      title: "Contract invocation unavailable",
      description:
        invocation.reason === "destination"
          ? "The RPC transaction does not report a destination."
          : "The RPC transaction does not report an input type.",
    };
  }

  return {
    title: "Contract invocation unavailable",
    description:
      invocation.reason === "input-data"
        ? "The RPC input data is not valid base64."
        : invocation.reason === "input-size"
          ? "The reported input size does not match the decoded RPC payload."
          : "The RPC input type is not a valid positive integer.",
  };
}
