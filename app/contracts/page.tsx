import type { Metadata } from "next";

import { explorerPageMetadata } from "@/lib/metadata";

import {
  CONTRACTS_CATALOGUE,
  type ContractCatalogueEntry,
} from "@/components/explorer/contracts-catalogue";
import { ContractsPage } from "@/components/explorer/contracts-page";

export const metadata: Metadata = explorerPageMetadata(
  "Contracts",
  "Generated Qubic contract identities and published procedures from the installed official package.",
  "/contracts",
);

export default function ContractsRoute() {
  const contracts: readonly ContractCatalogueEntry[] = CONTRACTS_CATALOGUE;
  return <ContractsPage contracts={contracts} />;
}
