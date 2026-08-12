"use client";

import {
  ArrowUpRight01Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { GlyphButton } from "@/components/ui/button";
import {
  classifyCommandQuery,
  formatMatchValue,
  getMatchCopy,
  type DirectQueryMatch,
} from "@/components/shell/lookup";

function getDirectMatches(query: string): DirectQueryMatch[] {
  const match = classifyCommandQuery(query);
  if (match.kind === "ambiguous") return [...match.matches];
  if (match.kind === "empty" || match.kind === "invalid") return [];
  return [match];
}

function getStatusLabel(query: string): string | null {
  const match = classifyCommandQuery(query);
  if (match.kind === "empty") return null;
  if (match.kind === "invalid") return "No route";
  if (match.kind === "ambiguous") return "Choose a route";
  return getMatchCopy(match.kind).label;
}

function getAccessibleStatus(query: string): string {
  const match = classifyCommandQuery(query);
  if (match.kind === "empty") {
    return "Enter an identity, transaction hash, tick, token index, or contract index.";
  }
  if (match.kind === "invalid") {
    return "No supported route. Try an identity, hash, tick, token index, or contract index.";
  }
  if (match.kind === "ambiguous") {
    return "This identifier can be an identity or transaction. Use a typed route to choose one.";
  }
  return `${getMatchCopy(match.kind).label} ${formatMatchValue(match)} route ready. Press Enter to open.`;
}

export function OverviewHero() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const directMatches = getDirectMatches(query);
  const canOpen = directMatches.length === 1;
  const statusLabel = getStatusLabel(query);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canOpen) return;
    router.push(directMatches[0].href);
  }

  return (
    <section aria-labelledby="overview-heading" className="mb-8">
      <div className="mx-auto max-w-3xl text-center">
        <h1 id="overview-heading" className="text-4xl font-semibold tracking-[-0.08em] text-[var(--glyph-ink)] sm:text-5xl">
          Network overview
        </h1>
        <p className="mt-2 text-sm text-[var(--glyph-muted)]">
          Live network telemetry and direct identifier lookup.
        </p>

        <form aria-label="Lookup an explorer identifier" className="mx-auto mt-6 max-w-2xl text-left" onSubmit={handleSubmit}>
          <div className="flex min-h-14 items-center gap-3 border border-[var(--glyph-line-strong)] bg-[var(--glyph-canvas)] px-3 shadow-[0_3px_0_var(--glyph-shadow)] transition-colors focus-within:border-[var(--glyph-ink)]">
            <HugeiconsIcon aria-hidden="true" className="shrink-0 text-[var(--glyph-muted)]" focusable="false" icon={Search01Icon} size={19} strokeWidth={1.5} />
            <input
              aria-describedby="overview-lookup-status"
              aria-label="Identity, transaction, tick, token, or contract identifier"
              autoComplete="off"
              className="min-w-0 flex-1 bg-transparent py-2 text-sm text-[var(--glyph-ink)] outline-none placeholder:text-[var(--glyph-tertiary)]"
              id="overview-lookup"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Identity, transaction hash, tick, token:123, or contract:9"
              spellCheck={false}
              type="search"
              value={query}
            />
            {statusLabel ? (
              <span className="hidden max-w-28 shrink-0 truncate border-l border-[var(--glyph-line)] pl-3 text-[11px] text-[var(--glyph-tertiary)] sm:block">
                {statusLabel}
              </span>
            ) : null}
            <GlyphButton
              aria-label="Open lookup result"
              className="!min-h-10 !w-10 !p-0"
              disabled={!canOpen}
              icon={ArrowUpRight01Icon}
              size="sm"
              type="submit"
              variant="primary"
            >
              <span className="sr-only">Open</span>
            </GlyphButton>
          </div>
          <p className="sr-only" id="overview-lookup-status" aria-live="polite" role="status">
            {getAccessibleStatus(query)}
          </p>
        </form>
      </div>
    </section>
  );
}
