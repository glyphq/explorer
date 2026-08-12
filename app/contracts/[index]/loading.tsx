import { ExplorerFrame } from "@/components/explorer/primitives";
import { ContractDetailPageSkeleton } from "@/components/explorer/skeletons";

export default function Loading() {
  return (
    <ExplorerFrame>
      <ContractDetailPageSkeleton />
    </ExplorerFrame>
  );
}
