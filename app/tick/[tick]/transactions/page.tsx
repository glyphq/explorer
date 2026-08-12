import { TickTransactionsPage } from "@/components/explorer/tick-transactions-page";
import { normalizeTick } from "@/lib/rpc/validation";

export default async function TickTransactionsRoute({
  params,
}: {
  params: Promise<{ tick: string }>;
}) {
  const { tick } = await params;
  return <TickTransactionsPage tick={normalizeTick(tick)} />;
}
