import { ExplorerFrame } from "@/components/explorer/primitives";
import { TokensPageSkeleton } from "@/components/explorer/skeletons";

export default function Loading() {
  return (
    <ExplorerFrame>
      <TokensPageSkeleton />
    </ExplorerFrame>
  );
}
