import Link from "next/link";

import { GlyphBrand } from "@/components/shell/glyph-mark";

const FOOTER_LINKS = [
  { href: "/", label: "Overview", external: false },
  { href: "https://github.com/glyphq/explorer", label: "Repository", external: true },
] as const;

export function GlyphFooter() {
  return (
    <footer
      aria-label="Explorer footer"
      className="mt-auto border-t border-[var(--glyph-line)] px-[var(--glyph-gutter)] py-8 sm:py-10"
    >
      <div className="flex min-w-0 flex-col gap-7 sm:flex-row sm:items-end sm:justify-between sm:gap-10">
        <div className="min-w-0">
          <Link
            aria-label="Glyph Explorer home"
            className="inline-flex min-h-11 items-center no-underline"
            href="/"
          >
            <GlyphBrand suffix="explorer" />
          </Link>
          <p className="mt-3 max-w-sm text-xs leading-5 text-[var(--glyph-tertiary)]">
            Data reflects public Qubic RPC responses and may lag the network.
          </p>
        </div>

        <nav aria-label="Footer" className="min-w-0">
          <p className="mb-2 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-[var(--glyph-tertiary)]">
            Links
          </p>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-[var(--glyph-muted)]">
            {FOOTER_LINKS.map((link) =>
              link.external ? (
                <a
                  className="inline-flex min-h-9 items-center border-b border-transparent pb-px no-underline transition-colors hover:border-[var(--glyph-ink)] hover:text-[var(--glyph-ink)]"
                  href={link.href}
                  key={link.href}
                  rel="noreferrer"
                  target="_blank"
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  className="inline-flex min-h-9 items-center border-b border-transparent pb-px no-underline transition-colors hover:border-[var(--glyph-ink)] hover:text-[var(--glyph-ink)]"
                  href={link.href}
                  key={link.href}
                >
                  {link.label}
                </Link>
              ),
            )}
          </div>
        </nav>
      </div>
    </footer>
  );
}
