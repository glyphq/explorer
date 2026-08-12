import { contractIndexToIdentity, publicKeyToIdentity } from "@qubic.org/crypto";
import * as officialContracts from "@qubic.org/contracts";
import {
  decodePayload,
  getAbi,
  getProcedure,
  type ContractRegistry,
} from "@qubic.org/registry";
import officialRegistryData from "@qubic.org/registry/registry.json";
import type { QueryTransaction } from "@qubic.org/rpc";

type ExportRecord = Record<string, unknown>;

type TransactionContractFields = Pick<
  QueryTransaction,
  "destination" | "inputType" | "inputSize" | "inputData"
> & {
  /** The epoch containing the transaction, when the archive provides it separately. */
  epoch?: number;
};

export interface DecodedContractArgument {
  name: string;
  value: string;
}

export type ContractArgumentDecoding =
  | {
      status: "decoded";
      epoch: number;
      arguments: DecodedContractArgument[];
    }
  | {
      status: "unavailable";
      reason: "abi" | "decode" | "epoch" | "input-data" | "payload-size" | "procedure" | "registry-stale";
    };

export type ContractInvocation =
  | {
      status: "recognized";
      contractIndex: number;
      contractName: string;
      procedureName: string;
      inputType: number;
      inputSize: number | null;
      payloadSize: number | null;
      argumentDecoding: ContractArgumentDecoding;
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
        const inputTypeExportName = `${indexExport.prefix}_${pascalCaseToConstantPart(procedureName)}_INPUT_TYPE`;
        const inputType = contractExports[inputTypeExportName];
        const inputSizeExportName = `${indexExport.prefix}_${pascalCaseToConstantPart(procedureName)}_INPUT_SIZE`;

        // Generated query functions have an INPUT_SIZE export. Transaction
        // inputType identifies procedures only, so never classify functions as
        // transaction procedures just because they also expose output decoders.
        if (typeof contractExports[inputSizeExportName] === "number") return [];
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

const OFFICIAL_REGISTRY = officialRegistryData as unknown as ContractRegistry;

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

/** A Qubic input type of zero is a normal transfer, not a smart-contract call. */
export function isSmartContractCall(inputType: unknown): inputType is number {
  return isPositiveInteger(inputType);
}

export function transactionTypeLabel(inputType: unknown): string {
  if (inputType === 0) return "Transfer";
  if (isSmartContractCall(inputType)) return "Smart-contract call";
  return "Input type not reported";
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function formatDecodedValue(value: unknown): string {
  if (typeof value === "string" || typeof value === "number" || typeof value === "bigint") {
    return String(value);
  }

  if (value instanceof Uint8Array) {
    return `0x${Array.from(value, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => formatDecodedValue(item)).join(", ")}]`;
  }

  if (typeof value === "object" && value !== null) {
    return `{ ${Object.entries(value)
      .map(([key, item]) => `${key}: ${formatDecodedValue(item)}`)
      .join(", ")} }`;
  }

  return String(value);
}

function decodeOfficialArguments(
  contractIndex: number,
  inputType: number,
  payload: Uint8Array | null,
  epoch: number | undefined,
): ContractArgumentDecoding {
  if (!payload) return { status: "unavailable", reason: "input-data" };
  if (!isNonNegativeInteger(epoch)) return { status: "unavailable", reason: "epoch" };

  let abi: ReturnType<typeof getAbi>;
  try {
    abi = getAbi(OFFICIAL_REGISTRY, contractIndex, epoch);
  } catch {
    return { status: "unavailable", reason: "abi" };
  }

  if (abi.isRegistryPossiblyStale) {
    return { status: "unavailable", reason: "registry-stale" };
  }

  let procedure: ReturnType<typeof getProcedure>;
  try {
    procedure = getProcedure(abi.version, inputType);
  } catch {
    return { status: "unavailable", reason: "procedure" };
  }

  if (procedure.inputSize !== payload.byteLength) {
    return { status: "unavailable", reason: "payload-size" };
  }

  try {
    const decoded = decodePayload(
      payload,
      procedure.inputFields,
      abi.version.structs,
      publicKeyToIdentity,
    );

    return {
      status: "decoded",
      epoch,
      arguments: procedure.inputFields.map((field) => ({
        name: field.name,
        value: formatDecodedValue(decoded[field.name]),
      })),
    };
  } catch {
    return { status: "unavailable", reason: "decode" };
  }
}

/**
 * Identifies metadata exposed by the generated contracts package and decodes
 * arguments only from the official epoch-aware registry ABI. The archive
 * schema says inputData is base64 and inputType is a smart-contract procedure
 * index. A transaction without an epoch, a matching registry ABI, or a payload
 * matching that ABI keeps its raw payload and receives an honest fallback.
 */
export function identifyContractInvocation(transaction: TransactionContractFields): ContractInvocation {
  const destination = normalizeDestination(transaction.destination);
  if (!destination) return { status: "unavailable", reason: "destination" };

  const contract = KNOWN_CONTRACTS_BY_DESTINATION.get(destination);
  if (!contract) return { status: "unknown", reason: "destination" };

  if (transaction.inputType === undefined) return { status: "unavailable", reason: "input-type" };
  if (!isSmartContractCall(transaction.inputType)) {
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

  let payload: Uint8Array | null = null;
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

    payload = decodeBase64(transaction.inputData);
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
  }

  if (transaction.inputSize !== undefined && payload !== null && transaction.inputSize !== payload.byteLength) {
    return {
      status: "invalid",
      reason: "input-size",
      contractName: procedure.contractName,
      contractIndex: procedure.contractIndex,
      procedureName: procedure.procedureName,
      inputType: procedure.inputType,
    };
  }

  const argumentDecoding = decodeOfficialArguments(
    procedure.contractIndex,
    procedure.inputType,
    payload,
    transaction.epoch,
  );

  return {
    status: "recognized",
    contractIndex: procedure.contractIndex,
    contractName: procedure.contractName,
    procedureName: procedure.procedureName,
    inputType: procedure.inputType,
    inputSize: transaction.inputSize ?? null,
    payloadSize: payload?.byteLength ?? null,
    argumentDecoding,
  };
}

export function formatContractInvocation(invocation: ContractInvocation): ContractInvocationDisplay {
  if (invocation.status === "recognized") {
    const payload = invocation.payloadSize === null ? "payload not reported" : `${invocation.payloadSize} decoded bytes`;
    const reportedSize = invocation.inputSize === null ? "input size not reported" : `${invocation.inputSize} reported bytes`;
    const argumentsDescription = invocation.argumentDecoding.status === "decoded"
      ? `${invocation.argumentDecoding.arguments.length} argument${invocation.argumentDecoding.arguments.length === 1 ? "" : "s"} decoded using the official ABI for epoch ${invocation.argumentDecoding.epoch}`
      : `arguments not decoded: ${formatArgumentFallback(invocation.argumentDecoding.reason)}`;
    return {
      title: `${invocation.contractName} · ${invocation.procedureName}`,
      description: `Contract index ${invocation.contractIndex} · input type ${invocation.inputType} · ${reportedSize} · ${payload} · ${argumentsDescription}.`,
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

function formatArgumentFallback(reason: Exclude<ContractArgumentDecoding, { status: "decoded" }>["reason"]): string {
  switch (reason) {
    case "abi":
      return "the official registry has no ABI for this contract at the transaction epoch";
    case "decode":
      return "the official registry decoder could not decode this payload";
    case "epoch":
      return "the transaction epoch is not reported";
    case "input-data":
      return "input data is not reported";
    case "payload-size":
      return "the payload length does not match the official ABI";
    case "procedure":
      return "the official registry has no procedure for this input type at the transaction epoch";
    case "registry-stale":
      return "the installed official registry may be stale for this transaction epoch";
  }
}
