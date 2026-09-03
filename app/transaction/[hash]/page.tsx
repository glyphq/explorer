import type { Metadata } from "next";

import { TransactionPage } from "@/components/explorer/transaction";
import { explorerPageMetadata } from "@/lib/metadata";
import { normalizeTransactionHash } from "@/lib/rpc/validation";

export async function generateMetadata({
  params,
}: PageProps<"/transaction/[hash]">): Promise<Metadata> {
  const { hash } = await params;
  const normalized = normalizeTransactionHash(hash);
  return normalized
    ? explorerPageMetadata("Transaction", `Public Qubic transaction ${normalized}.`, `/transaction/${normalized}`)
    : { title: "Invalid transaction", robots: { index: false, follow: false } };
}

export default async function TransactionRoute({
  params,
}: PageProps<"/transaction/[hash]">) {
  const { hash } = await params;
  return <TransactionPage hash={normalizeTransactionHash(hash)} />;
}
