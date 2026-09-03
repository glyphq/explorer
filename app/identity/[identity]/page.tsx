import type { Metadata } from "next";

import { IdentityPage } from "@/components/explorer/identity";
import { explorerPageMetadata } from "@/lib/metadata";
import { normalizeIdentity } from "@/lib/rpc/validation";

export async function generateMetadata({
  params,
}: PageProps<"/identity/[identity]">): Promise<Metadata> {
  const { identity } = await params;
  const normalized = normalizeIdentity(identity);
  return normalized
    ? explorerPageMetadata("Identity", `Public Qubic account activity and assets for ${normalized}.`, `/identity/${normalized}`)
    : { title: "Invalid identity", robots: { index: false, follow: false } };
}

export default async function IdentityRoute({
  params,
}: PageProps<"/identity/[identity]">) {
  const { identity } = await params;
  return <IdentityPage identity={normalizeIdentity(identity)} />;
}
