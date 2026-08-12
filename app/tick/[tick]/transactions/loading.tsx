import { ExplorerFrame, Panel, StatusMessage } from "@/components/explorer/primitives";

export default function Loading() {
  return (
    <ExplorerFrame>
      <Panel title="Transactions">
        <StatusMessage status="loading" title="Loading tick transactions…" />
      </Panel>
    </ExplorerFrame>
  );
}
