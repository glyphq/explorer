import { IdentityPage } from "@/components/explorer/identity";
import { normalizeIdentity } from "@/lib/rpc/validation";

export default async function IdentityRoute({
  params,
}: {
  params: Promise<{ identity: string }>;
}) {
  const { identity } = await params;
  return <IdentityPage identity={normalizeIdentity(identity)} />;
}
