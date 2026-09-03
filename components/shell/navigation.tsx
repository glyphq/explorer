"use client";

import { Coins01Icon, Home01Icon, RankingIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type HugeiconsIconProps } from "@hugeicons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { CommandSearch } from "@/components/shell/command-search";
import { GlyphBrand } from "@/components/shell/glyph-mark";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { useLatestStats } from "@/lib/stats";

export type GlyphNavigationProps = {
  brand?: ReactNode;
  links?: ReactNode;
  commandSearch?: ReactNode;
};

type NavigationRoute = {
  id: "overview" | "tokens" | "rich-list";
  label: string;
  href: "/" | "/tokens" | "/rich-list";
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

function formatPricePerBillion(value: number | undefined): string {
  if (value === undefined) return "—";
  const pricePerBillion = value * 1_000_000_000;
  return `$${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(pricePerBillion)} / bQUBIC`;
}

function HeaderPrice() {
  const stats = useLatestStats();

  return (
    <span
      aria-label="Current Qubic price in United States dollars per billion Qubic"
      className="hidden font-mono text-xs text-[var(--glyph-muted)] lg:inline-flex"
    >
      {formatPricePerBillion(stats.data?.price)}
    </span>
  );
}

export function GlyphNavigation({
  brand = (
    <Link className="glyph-nav__brand-link" href="/" aria-label="Glyph home">
      <GlyphBrand suffix="explorer" />
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
          <HeaderPrice />
          {commandSearch}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
