"use client";

import {
  ArrowUpRight01Icon,
  Coins01Icon,
  ContractsIcon,
  HashIcon,
  IdentityCardIcon,
  Search01Icon,
  SearchRemoveIcon,
  TransactionIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type HugeiconsIconProps } from "@hugeicons/react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { GlyphButton } from "@/components/ui/button";
import {
  classifyCommandQuery,
  formatMatchValue,
  getMatchCopy,
  type DirectQueryMatch,
} from "@/components/shell/lookup";

type ExplorerIcon = HugeiconsIconProps["icon"];

function LookupIcon({ kind }: { kind: DirectQueryMatch["kind"] | "invalid" }) {
  const icon: ExplorerIcon = kind === "identity"
    ? IdentityCardIcon
    : kind === "transaction"
      ? TransactionIcon
      : kind === "tick"
        ? HashIcon
        : kind === "token"
          ? Coins01Icon
          : kind === "contract"
            ? ContractsIcon
            : SearchRemoveIcon;

  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--glyph-radius-sm)] border border-[var(--glyph-line-strong)] bg-[var(--glyph-canvas)] text-[var(--glyph-muted)]">
      <HugeiconsIcon aria-hidden="true" focusable="false" icon={icon} size={17} strokeWidth={1.5} />
    </span>
  );
}

function getDirectMatches(query: string): DirectQueryMatch[] {
  const match = classifyCommandQuery(query);
  if (match.kind === "ambiguous") return [...match.matches];
  if (match.kind === "empty" || match.kind === "invalid") return [];
  return [match];
}

function LookupFeedback({ query }: { query: string }) {
  const match = classifyCommandQuery(query);
  const directMatches = getDirectMatches(query);

  if (match.kind === "empty") {
    return (
      <p className="text-xs text-[var(--glyph-tertiary)]">
        Identity, transaction hash, tick, <code className="font-mono">token:123</code>, or <code className="font-mono">contract:9</code>.
      </p>
    );
  }

  if (match.kind === "invalid") {
    return (
      <div aria-live="polite" className="flex items-center gap-2 text-xs text-[var(--glyph-tertiary)]" role="status">
        <LookupIcon kind="invalid" />
        <span>No supported route. Try an identity, hash, tick, token index, or contract index.</span>
      </div>
    );
  }

  if (match.kind === "ambiguous") {
    return (
      <div aria-live="polite" className="space-y-2" role="status">
        <p className="text-xs text-[var(--glyph-tertiary)]">Choose a typed route.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {directMatches.map((directMatch) => (
            <LookupResult key={`${directMatch.kind}:${directMatch.value}`} match={directMatch} />
          ))}
        </div>
      </div>
    );
  }

  const copy = getMatchCopy(match.kind);
  return (
    <div aria-live="polite" className="flex items-center gap-3" role="status">
      <LookupIcon kind={match.kind} />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-[var(--glyph-ink)]">
          {copy.label} <span className="font-mono">{formatMatchValue(match)}</span>
        </p>
        <p className="truncate text-xs text-[var(--glyph-tertiary)]">{copy.context} · press Enter to open</p>
      </div>
    </div>
  );
}

function LookupResult({ match }: { match: DirectQueryMatch }) {
  const router = useRouter();
  const copy = getMatchCopy(match.kind);

  return (
    <button
      className="flex min-h-12 items-center gap-2 rounded-[var(--glyph-radius-sm)] border border-[var(--glyph-line)] bg-[var(--glyph-canvas)] px-2.5 text-left transition-colors hover:border-[var(--glyph-ink)] hover:bg-[var(--glyph-surface-strong)]"
      onClick={() => router.push(match.href)}
      type="button"
    >
      <LookupIcon kind={match.kind} />
      <span className="min-w-0">
        <span className="block truncate text-xs font-semibold text-[var(--glyph-ink)]">
          {copy.label} <span className="font-mono">{formatMatchValue(match)}</span>
        </span>
        <span className="block truncate text-[11px] text-[var(--glyph-tertiary)]">{copy.context}</span>
      </span>
    </button>
  );
}

export function OverviewHero() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const match = classifyCommandQuery(query);
  const directMatches = getDirectMatches(query);
  const canOpen = directMatches.length === 1;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canOpen) return;
    router.push(directMatches[0].href);
  }

  return (
    <section aria-labelledby="overview-heading" className="relative mb-5 overflow-hidden border border-[var(--glyph-line-strong)] bg-[var(--glyph-surface)]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(to_right,var(--glyph-line)_1px,transparent_1px),linear-gradient(to_bottom,var(--glyph-line)_1px,transparent_1px)] [background-size:3rem_3rem] [mask-image:linear-gradient(to_bottom,black,transparent_75%)]" />
      <div className="relative grid gap-8 p-5 md:p-7 lg:grid-cols-[minmax(0,0.85fr)_minmax(24rem,1.15fr)] lg:items-end lg:gap-12 lg:p-9">
        <div>
          <div className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--glyph-tertiary)]">
            <span className="inline-flex size-5 items-center justify-center border border-[var(--glyph-line-strong)] text-[var(--glyph-muted)]">01</span>
            Network overview
          </div>
          <h1 id="overview-heading" className="mt-5 max-w-md text-4xl font-semibold tracking-[-0.08em] text-[var(--glyph-ink)] sm:text-5xl">
            Network state.
          </h1>
          <p className="mt-3 max-w-sm text-sm leading-6 text-[var(--glyph-muted)]">
            Live telemetry below. Use the lookup for a direct route into the explorer.
          </p>
        </div>

        <form aria-label="Lookup an explorer identifier" onSubmit={handleSubmit}>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-[var(--glyph-tertiary)]" htmlFor="overview-lookup">
            Lookup an identifier
          </label>
          <div className="flex min-h-14 items-center gap-3 border border-[var(--glyph-line-strong)] bg-[var(--glyph-canvas)] px-3 shadow-[0_3px_0_var(--glyph-shadow)] transition-colors focus-within:border-[var(--glyph-ink)]">
            <HugeiconsIcon aria-hidden="true" className="shrink-0 text-[var(--glyph-muted)]" focusable="false" icon={Search01Icon} size={19} strokeWidth={1.5} />
            <input
              aria-describedby="overview-lookup-help"
              aria-label="Identity, transaction, tick, token, or contract identifier"
              autoComplete="off"
              className="min-w-0 flex-1 bg-transparent py-2 text-sm text-[var(--glyph-ink)] outline-none placeholder:text-[var(--glyph-tertiary)]"
              id="overview-lookup"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Paste an identity, hash, or typed index"
              spellCheck={false}
              type="search"
              value={query}
            />
            <GlyphButton
              aria-label="Open lookup result"
              disabled={!canOpen}
              icon={ArrowUpRight01Icon}
              size="sm"
              type="submit"
              variant="primary"
            >
              Open
            </GlyphButton>
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1" id="overview-lookup-help">
            <p className="text-[11px] text-[var(--glyph-tertiary)]">
              Try <code className="font-mono">token:123</code> or <code className="font-mono">contract:9</code> for indexed routes.
            </p>
            <kbd className="rounded border border-[var(--glyph-line-strong)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--glyph-tertiary)]">↵ open</kbd>
          </div>
          <div className="mt-4 min-h-12 border-t border-[var(--glyph-line)] pt-3">
            <LookupFeedback query={query} />
          </div>
          {match.kind === "ambiguous" ? (
            <p className="sr-only">Use the typed prefix to choose one indexed route before pressing Enter.</p>
          ) : null}
        </form>
      </div>
    </section>
  );
}
