"use client";

import { Coins01Icon, ContractsIcon, Home01Icon, RankingIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type HugeiconsIconProps } from "@hugeicons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { CommandSearch } from "@/components/shell/command-search";
import { GlyphBrand } from "@/components/shell/glyph-mark";
import { ThemeToggle } from "@/components/shell/theme-toggle";

export type GlyphNavigationProps = {
  brand?: ReactNode;
  links?: ReactNode;
  commandSearch?: ReactNode;
};

type NavigationRoute = {
  id: "overview" | "tokens" | "contracts" | "rich-list";
  label: string;
  href: "/" | "/tokens" | "/contracts" | "/rich-list";
  icon: HugeiconsIconProps["icon"];
};

// Destinations that can be opened without an identifier.
const DEFAULT_NAVIGATION_ROUTES: readonly NavigationRoute[] = [
  {
    id: "overview",
    label: "Overview",
    href: "/",
    icon: Home01Icon,
  },
  {
    id: "tokens",
    label: "Tokens",
    href: "/tokens",
    icon: Coins01Icon,
  },
  {
    id: "contracts",
    label: "Contracts",
    href: "/contracts",
    icon: ContractsIcon,
  },
  {
    id: "rich-list",
    label: "Rich list",
    href: "/rich-list",
    icon: RankingIcon,
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
      <span className="glyph-nav__route-label">{route.label}</span>
    </Link>
  );
}

function DefaultNavigationLinks() {
  return (
    <div className="glyph-nav__groups">
      {DEFAULT_NAVIGATION_ROUTES.map((route) => (
        <NavigationRouteLink key={route.id} route={route} />
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
        </div>
      </div>
    </header>
  );
}
