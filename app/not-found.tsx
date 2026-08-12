import {
  ArrowUpRight01Icon,
  SearchRemoveIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";

import { LookupTrigger } from "@/components/shell/lookup-trigger";

export default function NotFound() {
  return (
    <main aria-labelledby="not-found-heading" className="min-h-[calc(100svh-72px)]">
      <div className="mx-auto w-full max-w-screen-2xl px-[var(--glyph-gutter)] py-7 md:py-12">
        <section className="overflow-hidden border border-[var(--glyph-line-strong)] bg-[var(--glyph-surface)]">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-[var(--glyph-line)] px-4 py-3 sm:px-6">
            <div className="flex items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-[var(--glyph-muted)]">
              <HugeiconsIcon
                aria-hidden="true"
                className="shrink-0"
                focusable="false"
                icon={SearchRemoveIcon}
                size={15}
                strokeWidth={1.5}
              />
              <span>Explorer / route status</span>
            </div>
            <span className="font-mono text-[0.68rem] text-[var(--glyph-tertiary)]">404 / no record</span>
          </div>

          <div className="grid md:grid-cols-[minmax(11rem,0.7fr)_minmax(0,1.3fr)]">
            <div className="relative flex min-h-64 flex-col justify-between overflow-hidden border-b border-[var(--glyph-line)] p-5 sm:p-8 md:min-h-96 md:border-b-0 md:border-r">
              <div className="flex items-center justify-between gap-4 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-[var(--glyph-tertiary)]">
                <span>signal</span>
                <span className="font-mono font-normal tracking-normal text-[var(--glyph-muted)]">not found</span>
              </div>
              <div className="relative z-10 mt-10">
                <span
                  aria-hidden="true"
                  className="block font-mono text-[clamp(5.5rem,18vw,11rem)] font-semibold leading-[0.78] tracking-[-0.14em] text-[var(--glyph-ink)]"
                >
                  404
                </span>
                <span className="mt-5 block font-mono text-xs uppercase tracking-[0.2em] text-[var(--glyph-tertiary)]">
                  missing address
                </span>
              </div>
              <div aria-hidden="true" className="pointer-events-none absolute inset-x-5 bottom-8 grid gap-2 opacity-70 sm:inset-x-8">
                <span className="h-px w-full bg-[var(--glyph-line-strong)]" />
                <span className="h-px w-2/3 bg-[var(--glyph-line)]" />
                <span className="h-px w-1/2 bg-[var(--glyph-line)]" />
              </div>
            </div>

            <div className="p-5 sm:p-8 lg:p-12">
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-[var(--glyph-tertiary)]">
                lookup response
              </p>
              <h1 id="not-found-heading" className="mt-4 max-w-2xl text-3xl font-semibold leading-[1.08] tracking-[-0.07em] text-[var(--glyph-ink)] sm:text-5xl">
                Route or data item not found.
              </h1>
              <p className="mt-5 max-w-xl text-sm leading-6 text-[var(--glyph-muted)] sm:text-base">
                This address does not resolve to a page or network record in Explorer. Return to the live overview or open Lookup to try a supported route.
              </p>

              <dl className="mt-8 grid max-w-xl grid-cols-2 divide-x divide-[var(--glyph-line)] border-y border-[var(--glyph-line)]">
                <div className="px-3 py-3 sm:px-4">
                  <dt className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-[var(--glyph-tertiary)]">status</dt>
                  <dd className="mt-1 font-mono text-sm text-[var(--glyph-ink)]">404</dd>
                </div>
                <div className="px-3 py-3 sm:px-4">
                  <dt className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-[var(--glyph-tertiary)]">scope</dt>
                  <dd className="mt-1 font-mono text-sm text-[var(--glyph-ink)]">route / item</dd>
                </div>
              </dl>

              <nav aria-label="Not-found recovery" className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link className="glyph-button glyph-button--primary glyph-button--md gap-2 no-underline" href="/">
                  Overview
                  <HugeiconsIcon aria-hidden="true" focusable="false" icon={ArrowUpRight01Icon} size={16} strokeWidth={1.5} />
                </Link>
                <LookupTrigger />
              </nav>
            </div>
          </div>

          <div className="flex flex-col gap-1 border-t border-[var(--glyph-line)] px-4 py-3 text-xs text-[var(--glyph-tertiary)] sm:flex-row sm:items-center sm:gap-3 sm:px-6">
            <span className="font-mono font-semibold text-[var(--glyph-muted)]">next /</span>
            <span>Overview for telemetry. Lookup for a direct identifier.</span>
          </div>
        </section>
      </div>
    </main>
  );
}
