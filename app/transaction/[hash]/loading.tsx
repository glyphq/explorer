import { ExplorerFrame } from "@/components/explorer/primitives";
import { TransactionPageSkeleton } from "@/components/explorer/skeletons";

export default function Loading() {
  return (
    <ExplorerFrame>
      <TransactionPageSkeleton />
    </ExplorerFrame>
  );
}
