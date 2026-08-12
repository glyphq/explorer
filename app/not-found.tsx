import { Home01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";

import { LookupTrigger } from "@/components/shell/lookup-trigger";

export default function NotFound() {
  return (
    <main aria-labelledby="not-found-heading" className="flex min-h-[calc(100svh-72px)] items-center justify-center px-[var(--glyph-gutter)] py-12">
      <div className="w-full max-w-xl text-center">
        <h1 id="not-found-heading" className="font-mono text-6xl font-semibold leading-none tracking-[-0.12em] text-[var(--glyph-ink)] sm:text-8xl">
          Page not found
        </h1>
        <p className="mt-5 text-sm leading-6 text-[var(--glyph-muted)] sm:text-base">
          This page may have moved, or the address may be incorrect.
        </p>
        <nav aria-label="Not-found recovery" className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link className="glyph-button glyph-button--primary glyph-button--md w-full gap-2 no-underline sm:w-auto" href="/">
            <HugeiconsIcon aria-hidden="true" focusable="false" icon={Home01Icon} size={18} strokeWidth={1.5} />
            Overview
          </Link>
          <LookupTrigger />
        </nav>
      </div>
    </main>
  );
}
