"use client";

import { Coins01Icon, Home01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type HugeiconsIconProps } from "@hugeicons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { CommandSearch } from "@/components/shell/command-search";
import { GlyphBrand } from "@/components/shell/glyph-mark";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { WalletButton } from "@/components/shell/wallet-button";

export type GlyphNavigationProps = {
  brand?: ReactNode;
  links?: ReactNode;
  commandSearch?: ReactNode;
  wallet?: ReactNode;
};

type NavigationRoute = {
  id: "overview" | "tokens";
  label: string;
  description: string;
  href: "/" | "/tokens";
  icon: HugeiconsIconProps["icon"];
};

type NavigationGroup = {
  label: string;
  routes: readonly NavigationRoute[];
};

// Keep the shell list tied to destinations that can be opened without an
// identifier. Assets and contract metadata remain contextual to their backed
// identity and transaction routes until collection routes exist.
const DEFAULT_NAVIGATION_GROUPS: readonly NavigationGroup[] = [
  {
    label: "Explore",
    routes: [
      {
        id: "overview",
        label: "Overview",
        description: "Network telemetry",
        href: "/",
        icon: Home01Icon,
      },
      {
        id: "tokens",
        label: "Tokens",
        description: "Official asset issuance",
        href: "/tokens",
        icon: Coins01Icon,
      },
    ],
  },
];

function NavigationRouteLink({ route }: { route: NavigationRoute }) {
  const pathname = usePathname();
  const isCurrent = pathname === route.href || pathname.startsWith(`${route.href}/`);

  return (
    <Link
      aria-current={isCurrent ? "page" : undefined}
      className="glyph-nav__route"
      data-current={isCurrent ? "true" : undefined}
      href={route.href}
    >
      <span aria-hidden="true" className="glyph-nav__route-icon">
        <HugeiconsIcon icon={route.icon} size="1em" strokeWidth={1.5} />
      </span>
      <span className="glyph-nav__route-copy">
        <span className="glyph-nav__route-label">{route.label}</span>
        <span className="glyph-nav__route-description">{route.description}</span>
      </span>
    </Link>
  );
}

function DefaultNavigationLinks() {
  return (
    <div className="glyph-nav__groups">
      {DEFAULT_NAVIGATION_GROUPS.map((group) => (
        <div className="glyph-nav__group" key={group.label}>
          <span className="glyph-nav__group-label">{group.label}</span>
          <div className="glyph-nav__group-list">
            {group.routes.map((route) => (
              <NavigationRouteLink key={route.id} route={route} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function GlyphNavigation({
  brand = (
    <Link className="glyph-nav__brand-link" href="/" aria-label="Glyph home">
      <GlyphBrand />
    </Link>
  ),
  commandSearch = <CommandSearch />,
  links = <DefaultNavigationLinks />,
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
          <ThemeToggle />
          {wallet}
        </div>
      </div>
    </header>
  );
}
