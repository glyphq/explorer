import type { Metadata } from "next";

import { RichListPage } from "@/components/explorer/rich-list";
import { explorerPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = explorerPageMetadata(
  "Rich list",
  "Reported Qubic balances from the official public Stats API.",
  "/rich-list",
);

export default function RichListRoute() {
  return <RichListPage />;
}
