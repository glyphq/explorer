"use client";

import Link from "next/link";

import { GlyphButton } from "@/components/ui/button";

export default function ErrorPage({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main className="flex min-h-[calc(100svh-var(--glyph-header))] items-center px-[var(--glyph-gutter)] py-16">
      <div className="mx-auto w-full max-w-xl text-center">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--glyph-tertiary)]">Explorer interrupted</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.07em] text-[var(--glyph-ink)]">This view could not be displayed</h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-[var(--glyph-muted)]">
          Try loading the view again. If the problem continues, return to the overview and start a new lookup.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <GlyphButton onClick={retry}>Try again</GlyphButton>
          <Link className="glyph-button glyph-button--secondary glyph-button--md" href="/">Return to overview</Link>
        </div>
      </div>
    </main>
  );
}
