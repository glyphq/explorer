import type { Metadata } from "next";

import { ExplorerHome } from "@/components/explorer/home";
import { explorerPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = explorerPageMetadata(
  "Network overview",
  "Current public Qubic network health, tick quality, supply, market data, and direct explorer lookup.",
  "/",
);

export default function Home() {
  return <ExplorerHome />;
}
