import type { Metadata } from "next";

import {
  CONTRACTS_CATALOGUE,
  type ContractCatalogueEntry,
} from "@/components/explorer/contracts-catalogue";
import { ContractsPage } from "@/components/explorer/contracts-page";

export const metadata: Metadata = {
  title: "Contracts",
  description: "Generated contract identities and published input types from the installed official package.",
};

export default function ContractsRoute() {
  const contracts: readonly ContractCatalogueEntry[] = CONTRACTS_CATALOGUE;
  return <ContractsPage contracts={contracts} />;
}
