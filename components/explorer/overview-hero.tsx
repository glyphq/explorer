"use client";

import { CommandSearch } from "@/components/shell/command-search";

import { ReactBitsDither } from "./react-bits-dither";

export function OverviewHero() {
  return (
    <section aria-labelledby="overview-heading" className="glyph-home-hero relative flex min-h-[60dvh] w-full items-center overflow-hidden rounded-b-[2rem] sm:rounded-b-[3rem]">
      <ReactBitsDither />
      <div className="relative z-10 mx-auto flex w-full max-w-screen-2xl justify-center px-[var(--glyph-gutter)] py-16 text-center">
        <div className="flex max-w-2xl flex-col items-center">
          <h1 id="overview-heading" className="text-5xl font-semibold tracking-[-0.085em] text-[var(--glyph-ink)] sm:text-7xl">
            Explore Qubic
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-[var(--glyph-muted)]">
            Find an account, transaction, tick, or token. Then follow the network as it moves.
          </p>
          <div className="glyph-overview-command mt-8">
            <CommandSearch label="Look up the network" shortcut="⌘K" variant="primary" />
          </div>
        </div>
      </div>
    </section>
  );
}
