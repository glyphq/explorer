import type { Metadata } from "next";

import { ContractPage } from "@/components/explorer/contract";
import { getContractByIndex } from "@/components/explorer/contracts-catalogue";
import { explorerPageMetadata } from "@/lib/metadata";
import { normalizeAssetIndex } from "@/lib/rpc/validation";

export async function generateMetadata({ params }: PageProps<"/contracts/[index]">): Promise<Metadata> {
  const { index } = await params;
  const normalized = normalizeAssetIndex(index);
  const contract = getContractByIndex(normalized);
  return normalized !== null
    ? explorerPageMetadata(contract?.name ?? "Contract", `Published Qubic contract metadata for index ${normalized}.`, `/contracts/${normalized}`)
    : { title: "Invalid contract", robots: { index: false, follow: false } };
}

export default async function ContractRoute({ params }: PageProps<"/contracts/[index]">) {
  const { index } = await params;
  const normalizedIndex = normalizeAssetIndex(index);

  return <ContractPage contract={getContractByIndex(normalizedIndex)} index={normalizedIndex} requestedIndex={index} />;
}
