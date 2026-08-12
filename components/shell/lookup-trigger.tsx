"use client";

import { useRouter } from "next/navigation";
import { Search01Icon } from "@hugeicons/core-free-icons";

import { GlyphButton } from "@/components/ui/button";

/** Opens the persistent header lookup without coupling the not-found page to its state. */
export function LookupTrigger() {
  const router = useRouter();

  function openLookup() {
    const trigger = document.querySelector<HTMLButtonElement>(
      '[data-glyph-slot="command-search"]',
    );

    if (trigger) {
      trigger.focus();
      trigger.click();
      return;
    }

    router.push("/");
  }

  return (
    <GlyphButton className="w-full sm:w-auto" icon={Search01Icon} variant="secondary" onClick={openLookup}>
      Open lookup
    </GlyphButton>
  );
}
