"use client";

import { Home01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { getContractByIndex } from "./contracts-catalogue";
import {
  formatIdentifier,
  formatIdentity,
  formatTick,
  formatTransactionHash,
  normalizeAssetIndex,
  normalizeIdentity,
  normalizeTick,
  normalizeTransactionHash,
} from "@/lib/rpc/validation";

type BreadcrumbItem = {
  href?: string;
  label: string;
  isHome?: boolean;
};

function decodedSegment(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function identifierLabel(value: string, kind: "identity" | "transaction" | "text"): string {
  const decoded = decodedSegment(value);
  if (kind === "identity") {
    const identity = normalizeIdentity(decoded);
    return identity ? formatIdentity(identity) : formatIdentifier(decoded);
  }
  if (kind === "transaction") {
    const hash = normalizeTransactionHash(decoded);
    return hash ? formatTransactionHash(hash) : formatIdentifier(decoded);
  }
  return formatIdentifier(decoded, 12, 8);
}

function getBreadcrumbItems(pathname: string): BreadcrumbItem[] {
  if (pathname === "/") return [{ href: "/", isHome: true, label: "Home" }];

  const segments = pathname.split("/").filter(Boolean);
  const [section, value, child] = segments;
  const items: BreadcrumbItem[] = [{ href: "/", isHome: true, label: "Home" }];

  if (section === "tokens") {
    items.push({ href: "/tokens", label: "Tokens" });
    if (value) {
      const index = normalizeAssetIndex(value);
      items.push({ label: index === null ? `Token ${identifierLabel(value, "text")}` : `Token ${index}` });
    }
    return items;
  }

  if (section === "contracts") {
    items.push({ href: "/contracts", label: "Contracts" });
    if (value) {
      const index = normalizeAssetIndex(value);
      const contract = getContractByIndex(index);
      items.push({ label: contract?.name ?? (index === null ? `Contract ${identifierLabel(value, "text")}` : `Contract ${index}`) });
    }
    return items;
  }

  if (section === "identity") {
    items.push({ label: "Identity" });
    if (value) items.push({ label: identifierLabel(value, "identity") });
    return items;
  }

  if (section === "transaction") {
    items.push({ label: "Transaction" });
    if (value) items.push({ label: identifierLabel(value, "transaction") });
    return items;
  }

  if (section === "tick") {
    items.push({ label: "Ticks" });
    if (value) {
      const tick = normalizeTick(value);
      items.push({ label: tick === null ? identifierLabel(value, "text") : formatTick(tick) });
    }
    if (child === "transactions") items.push({ label: "Transactions" });
    return items;
  }

  if (section === "rich-list") items.push({ label: "Rich list" });
  return items;
}

export function ExplorerBreadcrumbs() {
  const pathname = usePathname();
  const items = getBreadcrumbItems(pathname);

  // Root and unmatched routes are already self-explanatory. Keep the shared
  // breadcrumb for navigable detail pages without adding chrome to entry states.
  if (items.length <= 1) return null;

  return (
    <nav aria-label="Breadcrumb" className="glyph-breadcrumbs">
      <ol>
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`}>
            {index > 0 ? <span aria-hidden="true" className="glyph-breadcrumbs__separator">/</span> : null}
            {item.href && index !== items.length - 1 ? (
              <Link aria-label={item.isHome ? "Home" : undefined} href={item.href}>
                {item.isHome ? (
                  <HugeiconsIcon aria-hidden="true" focusable="false" icon={Home01Icon} size={15} strokeWidth={1.5} />
                ) : item.label}
              </Link>
            ) : item.isHome ? (
              <span aria-label="Home">
                <HugeiconsIcon aria-hidden="true" focusable="false" icon={Home01Icon} size={15} strokeWidth={1.5} />
              </span>
            ) : (
              <span aria-current="page">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
