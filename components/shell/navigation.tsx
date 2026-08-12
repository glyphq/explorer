import Link from "next/link";
import type { ReactNode } from "react";
import { CommandSearch } from "@/components/shell/command-search";
import { GlyphBrand } from "@/components/shell/glyph-mark";
import { WalletButton } from "@/components/shell/wallet-button";

export type GlyphNavigationProps = {
  brand?: ReactNode;
  links?: ReactNode;
  commandSearch?: ReactNode;
  wallet?: ReactNode;
};

export function GlyphNavigation({
  brand = (
    <Link className="glyph-nav__brand-link" href="/" aria-label="Glyph home">
      <GlyphBrand />
    </Link>
  ),
  commandSearch = <CommandSearch />,
  links,
  wallet = <WalletButton />,
}: GlyphNavigationProps) {
  return (
    <header className="glyph-nav">
      <div className="glyph-nav__inner">
        <div className="glyph-nav__brand">{brand}</div>
        {links ? (
          <nav className="glyph-nav__links" aria-label="Primary">
            {links}
          </nav>
        ) : null}
        <div className="glyph-nav__actions">
          {commandSearch}
          {wallet}
        </div>
      </div>
    </header>
  );
}
