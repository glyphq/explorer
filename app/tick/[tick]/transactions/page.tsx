import type { Metadata } from "next";

import { TickTransactionsPage } from "@/components/explorer/tick-transactions-page";
import { explorerPageMetadata } from "@/lib/metadata";
import { normalizeTick } from "@/lib/rpc/validation";

export async function generateMetadata({ params }: PageProps<"/tick/[tick]/transactions">): Promise<Metadata> {
  const { tick } = await params;
  const normalized = normalizeTick(tick);
  return normalized !== null
    ? explorerPageMetadata("Tick transactions", `Public Qubic transactions recorded in tick ${normalized}.`, `/tick/${normalized}/transactions`)
    : { title: "Invalid tick", robots: { index: false, follow: false } };
}

export default async function TickTransactionsRoute({ params }: PageProps<"/tick/[tick]/transactions">) {
  const { tick } = await params;
  return <TickTransactionsPage tick={normalizeTick(tick)} />;
}
