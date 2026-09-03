import type { Metadata } from "next";

import { ExplorerHome } from "@/components/explorer/home";
import { explorerPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = explorerPageMetadata(
  "Explore Qubic",
  "Explore current Qubic network activity, find public accounts and transactions, and check ticks, tokens, and market data.",
  "/",
);

export default function Home() {
  return <ExplorerHome />;
}
