import type { Metadata } from "next";

import { TokensPage } from "@/components/explorer/tokens";
import { explorerPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = explorerPageMetadata(
  "Tokens",
  "Reported Qubic asset issuances from the official public RPC service.",
  "/tokens",
);

export default function TokensRoute() {
  return <TokensPage />;
}
