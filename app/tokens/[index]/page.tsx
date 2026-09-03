import type { Metadata } from "next";

import { TokenPage } from "@/components/explorer/token";
import { explorerPageMetadata } from "@/lib/metadata";
import { normalizeAssetIndex } from "@/lib/rpc/validation";

export async function generateMetadata({ params }: PageProps<"/tokens/[index]">): Promise<Metadata> {
  const { index } = await params;
  const normalized = normalizeAssetIndex(index);
  return normalized !== null
    ? explorerPageMetadata("Token", `Reported Qubic asset issuance at universe index ${normalized}.`, `/tokens/${normalized}`)
    : { title: "Invalid token", robots: { index: false, follow: false } };
}

export default async function TokenRoute({ params }: PageProps<"/tokens/[index]">) {
  const { index } = await params;
  return <TokenPage index={normalizeAssetIndex(index)} />;
}
