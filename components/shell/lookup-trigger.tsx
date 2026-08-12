"use client";

import { Search01Icon } from "@hugeicons/core-free-icons";
import { useRouter } from "next/navigation";

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
    <GlyphButton icon={Search01Icon} variant="secondary" onClick={openLookup}>
      Lookup
    </GlyphButton>
  );
}
