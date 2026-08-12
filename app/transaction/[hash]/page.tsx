import { TransactionPage } from "@/components/explorer/transaction";
import { normalizeTransactionHash } from "@/lib/rpc/validation";

export default async function TransactionRoute({
  params,
}: {
  params: Promise<{ hash: string }>;
}) {
  const { hash } = await params;
  return <TransactionPage hash={normalizeTransactionHash(hash)} />;
}
