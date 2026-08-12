import * as officialContracts from "@qubic.org/contracts";
import { contractIndexToIdentity } from "@qubic.org/crypto";

type GeneratedExport = Record<string, unknown>;

export type PublishedContractInput = {
  exportName: string;
  name: string;
  inputType: number;
};

export type ContractCatalogueEntry = {
  exportName: string;
  name: string;
  index: number;
  identity: string;
  inputTypes: readonly PublishedContractInput[];
  searchText: string;
};

const generatedExports = officialContracts as unknown as GeneratedExport;

function asRecord(value: unknown): GeneratedExport | null {
  return typeof value === "object" && value !== null
    ? (value as GeneratedExport)
    : null;
}

function isInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

function formatGeneratedName(value: string): string {
  if (!value) return value;
  if (value === value.toLowerCase() && value.length <= 3) return value.toUpperCase();
  return `${value[0]?.toUpperCase() ?? ""}${value.slice(1)}`;
}

function formatInputName(value: string): string {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1).toLowerCase()}`)
    .join(" ");
}

function getContractIndexExports(): Map<number, string> {
  return new Map(
    Object.entries(generatedExports)
      .filter(([exportName, value]) => exportName.endsWith("_CONTRACT_INDEX") && isInteger(value))
      .map(([exportName, value]) => [value as number, exportName.slice(0, -"_CONTRACT_INDEX".length)] as [number, string]),
  );
}

function getPublishedInputTypes(prefix: string): PublishedContractInput[] {
  return Object.entries(generatedExports)
    .filter(
      ([exportName, value]) =>
        exportName.startsWith(`${prefix}_`) &&
        exportName.endsWith("_INPUT_TYPE") &&
        isInteger(value),
    )
    .map(([exportName, value]) => {
      const inputName = exportName.slice(prefix.length + 1, -"_INPUT_TYPE".length);
      return {
        exportName,
        name: formatInputName(inputName),
        inputType: value as number,
      };
    })
    .sort((left, right) => left.inputType - right.inputType || left.exportName.localeCompare(right.exportName));
}

function buildContractsCatalogue(): ContractCatalogueEntry[] {
  const contractPrefixes = getContractIndexExports();

  return Object.entries(generatedExports)
    .flatMap(([exportName, value]) => {
      const namespace = asRecord(value);
      const index = namespace?.contractIndex;
      if (!namespace || !isInteger(index)) return [];

      const prefix = contractPrefixes.get(index);
      if (!prefix) return [];

      const identity = contractIndexToIdentity(index);
      const inputTypes = getPublishedInputTypes(prefix);
      const name = formatGeneratedName(exportName);
      const searchText = [
        name,
        exportName,
        prefix,
        index,
        identity,
      ]
        .join(" ")
        .toLowerCase();

      return [
        {
          exportName,
          name,
          index,
          identity,
          inputTypes,
          searchText,
        },
      ];
    })
    .sort((left, right) => left.index - right.index);
}

export const CONTRACTS_CATALOGUE: readonly ContractCatalogueEntry[] = buildContractsCatalogue();

export function filterContracts(
  contracts: readonly ContractCatalogueEntry[],
  query: string,
): ContractCatalogueEntry[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return [...contracts];
  return contracts.filter((contract) => contract.searchText.includes(normalizedQuery));
}

export function getPublishedProcedureCount(
  contract: Pick<ContractCatalogueEntry, "inputTypes">,
): number {
  return contract.inputTypes.length;
}

export function getContractIdentityHref(identity: string): string {
  return `/identity/${encodeURIComponent(identity)}`;
}
