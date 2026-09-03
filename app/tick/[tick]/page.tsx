import type { Metadata } from "next";

import { TickPage } from "@/components/explorer/tick";
import { explorerPageMetadata } from "@/lib/metadata";
import { normalizeTick } from "@/lib/rpc/validation";

export async function generateMetadata({ params }: PageProps<"/tick/[tick]">): Promise<Metadata> {
  const { tick } = await params;
  const normalized = normalizeTick(tick);
  return normalized !== null
    ? explorerPageMetadata("Tick", `Public Qubic metadata for tick ${normalized}.`, `/tick/${normalized}`)
    : { title: "Invalid tick", robots: { index: false, follow: false } };
}

export default async function TickRoute({ params }: PageProps<"/tick/[tick]">) {
  const { tick } = await params;
  return <TickPage tick={normalizeTick(tick)} />;
}
