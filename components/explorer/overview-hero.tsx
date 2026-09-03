"use client";

import { CommandSearch } from "@/components/shell/command-search";

import { ReactBitsDither } from "./react-bits-dither";

export function OverviewHero() {
  return (
    <section aria-labelledby="overview-heading" className="glyph-home-hero relative flex min-h-[60dvh] w-full items-center overflow-hidden">
      <ReactBitsDither />
      <div className="relative z-10 mx-auto w-full max-w-screen-2xl px-[var(--glyph-gutter)] py-16">
        <div className="max-w-2xl">
        <h1 id="overview-heading" className="text-5xl font-semibold tracking-[-0.085em] text-[var(--glyph-ink)] sm:text-7xl">
          Explore Qubic
        </h1>
        <p className="mt-5 max-w-xl text-base leading-7 text-[var(--glyph-muted)]">
          Find an account, transaction, tick, or token. Then follow the network as it moves.
        </p>
        <div className="glyph-overview-command mt-8">
          <CommandSearch label="Open lookup" />
        </div>
        </div>
      </div>
    </section>
  );
}
