import { ExplorerFrame } from "@/components/explorer/primitives";
import { RichListPageSkeleton } from "@/components/explorer/skeletons";

export default function Loading() {
  return (
    <ExplorerFrame>
      <RichListPageSkeleton />
    </ExplorerFrame>
  );
}
