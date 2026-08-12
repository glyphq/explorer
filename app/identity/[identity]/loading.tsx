import { ExplorerFrame } from "@/components/explorer/primitives";
import { IdentityPageSkeleton } from "@/components/explorer/skeletons";

export default function Loading() {
  return (
    <ExplorerFrame>
      <IdentityPageSkeleton />
    </ExplorerFrame>
  );
}
