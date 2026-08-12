import { ContractPage } from "@/components/explorer/contract";
import { getContractByIndex } from "@/components/explorer/contracts-catalogue";
import { normalizeAssetIndex } from "@/lib/rpc/validation";

export default async function ContractRoute({
  params,
}: {
  params: Promise<{ index: string }>;
}) {
  const { index } = await params;
  const normalizedIndex = normalizeAssetIndex(index);

  return (
    <ContractPage
      contract={getContractByIndex(normalizedIndex)}
      index={normalizedIndex}
      requestedIndex={index}
    />
  );
}
