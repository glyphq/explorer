import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { GlyphShell } from "@/components/shell";
import "./globals.css";

import ExplorerProviders from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Glyph Explorer",
    template: "%s | Glyph Explorer",
  },
  description: "A legible view of Glyph network activity.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <ExplorerProviders>
          <GlyphShell>{children}</GlyphShell>
        </ExplorerProviders>
      </body>
    </html>
  );
}
