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
  if (match.kind === "empty" || match.kind === "invalid") return [];
  return [match];
}

function getStatusLabel(query: string): string | null {
  const match = classifyCommandQuery(query);
  if (match.kind === "empty") return null;
  if (match.kind === "invalid") return "No route";
  return getMatchCopy(match.kind).label;
}

function getAccessibleStatus(query: string): string {
  const match = classifyCommandQuery(query);
  if (match.kind === "empty") {
    return "Enter an account ID, transaction ID, tick number, or token number.";
  }
  if (match.kind === "invalid") {
    return "No match found. Try an account ID, transaction ID, tick number, or token number.";
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
    <section aria-labelledby="overview-heading" className="mb-6 flex flex-wrap items-end justify-between gap-x-8 gap-y-5 sm:mb-8">
      <div className="max-w-xl">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--glyph-tertiary)]">Qubic explorer</p>
        <h1 id="overview-heading" className="mt-2 text-4xl font-semibold tracking-[-0.08em] text-[var(--glyph-ink)] sm:text-5xl">
          Explore Qubic
        </h1>
        <p className="mt-2 text-sm text-[var(--glyph-muted)]">
          Check the network, follow activity, or look up an account, transaction, tick, or token.
        </p>
      </div>

      <form aria-label="Look up a Qubic account, transaction, tick, or token" className="w-full max-w-xl" onSubmit={handleSubmit}>
        <div className="flex min-h-12 items-center gap-3 rounded-full border border-[var(--glyph-line-strong)] bg-[var(--glyph-surface)] px-3 shadow-[0_4px_14px_var(--glyph-shadow)] transition-[border-color,box-shadow] focus-within:border-[var(--glyph-focus)] focus-within:shadow-[0_0_0_3px_var(--glyph-accent-surface)]">
            <HugeiconsIcon aria-hidden="true" className="shrink-0 text-[var(--glyph-muted)]" focusable="false" icon={Search01Icon} size={19} strokeWidth={1.5} />
            <input
              aria-describedby="overview-lookup-status"
              aria-label="Account, transaction, tick, or token identifier"
              autoComplete="off"
              className="min-w-0 flex-1 bg-transparent py-2 text-sm text-[var(--glyph-ink)] outline-none placeholder:text-[var(--glyph-tertiary)]"
              id="overview-lookup"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Paste an ID or enter tick:123"
              spellCheck={false}
              type="search"
              value={query}
            />
            {statusLabel ? (
              <span className="hidden max-w-28 shrink-0 truncate text-[11px] text-[var(--glyph-tertiary)] sm:block">
                {statusLabel}
              </span>
            ) : null}
            <GlyphButton
              aria-label="Open lookup result"
              className="!min-h-9 !w-9 !rounded-full !p-0"
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
    </section>
  );
}
