import { TickPage } from "@/components/explorer/tick";
import { normalizeTick } from "@/lib/rpc/validation";

export default async function TickRoute({
  params,
}: {
  params: Promise<{ tick: string }>;
}) {
  const { tick } = await params;
  return <TickPage tick={normalizeTick(tick)} />;
}
