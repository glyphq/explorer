import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import { GlyphShell } from "@/components/shell";
import { explorerMetadataBase } from "@/lib/metadata";
import "./globals.css";

import ExplorerProviders from "./providers";

const themeBootstrapScript = `
(function () {
  try {
    var key = "glyph-explorer:theme";
    var theme = window.localStorage.getItem(key);
    if (theme !== "light" && theme !== "dark" && theme !== "system") theme = "system";
    document.documentElement.setAttribute("data-theme", theme);
  } catch (_) {
    document.documentElement.setAttribute("data-theme", "system");
  }
})();
`;

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
      data-theme="system"
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body>
        <ExplorerProviders>
          <GlyphShell>{children}</GlyphShell>
        </ExplorerProviders>
      </body>
    </html>
  );
}
