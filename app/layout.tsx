import type { Metadata } from "next";
import { Geist_Mono, Space_Grotesk } from "next/font/google";
import { GlyphShell } from "@/components/shell";
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
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${geistMono.variable}`}
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
