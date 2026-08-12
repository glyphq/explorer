import { TokenPage } from "@/components/explorer/token";
import { normalizeAssetIndex } from "@/lib/rpc/validation";

export default async function TokenRoute({
  params,
}: {
  params: Promise<{ index: string }>;
}) {
  const { index } = await params;
  return <TokenPage index={normalizeAssetIndex(index)} />;
}
