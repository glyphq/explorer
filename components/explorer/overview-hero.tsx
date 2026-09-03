"use client";

import { CommandSearch } from "@/components/shell/command-search";

export function OverviewHero() {
  return (
    <section aria-labelledby="overview-heading" className="mb-16 pt-3 sm:mb-20 sm:pt-6">
      <p className="text-[0.68rem] font-medium uppercase tracking-[0.15em] text-[var(--glyph-tertiary)]">Qubic explorer</p>
      <h1 id="overview-heading" className="mt-3 text-5xl font-semibold tracking-[-0.085em] text-[var(--glyph-ink)] sm:text-7xl">
        Explore Qubic
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--glyph-muted)]">
        See what the network is doing, follow public activity, or open the command center to look up an account, transaction, tick, or token.
      </p>
      <div className="glyph-overview-command mt-7">
        <CommandSearch label="Search the explorer" />
      </div>
    </section>
  );
}
