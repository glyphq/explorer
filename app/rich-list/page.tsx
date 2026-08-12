import type { Metadata } from "next";

import { RichListPage } from "@/components/explorer/rich-list";

export const metadata: Metadata = {
  title: "Rich list",
  description: "Reported balances from the official Qubic Stats API.",
};

export default function RichListRoute() {
  return <RichListPage />;
}
