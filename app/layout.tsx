import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import { GlyphShell } from "@/components/shell";
import { explorerMetadataBase } from "@/lib/metadata";
import "./globals.css";

import ExplorerProviders from "./providers";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: explorerMetadataBase(),
  title: {
    default: "Glyph Explorer",
    template: "%s | Glyph Explorer",
  },
  applicationName: "Glyph Explorer",
  description: "A legible view of public Qubic network activity.",
  openGraph: {
    siteName: "Glyph Explorer",
    type: "website",
  },
  twitter: {
    card: "summary",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={spaceGrotesk.variable}
      data-theme="dark"
    >
      <body>
        <ExplorerProviders>
          <GlyphShell>{children}</GlyphShell>
        </ExplorerProviders>
      </body>
    </html>
  );
}
