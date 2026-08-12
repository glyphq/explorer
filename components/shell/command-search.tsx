"use client";

import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";

import { GlyphButton } from "@/components/ui/button";
import {
  formatIdentity,
  formatTick,
  formatTransactionHash,
  normalizeIdentity,
  normalizeTick,
  normalizeTransactionHash,
} from "@/lib/rpc/validation";

type CommandSearchProps = {
  onClick?: () => void;
  shortcut?: string;
  label?: string;
};

type QueryMatch =
  | { kind: "empty"; value: "" }
  | { kind: "identity"; value: string; href: string }
  | { kind: "transaction"; value: string; href: string }
  | { kind: "tick"; value: number; href: string }
  | { kind: "invalid"; value: string };

type NavigationCommand = {
  id: "overview" | "search";
  label: string;
  description: string;
  href: "/" | "/search";
  keywords: string[];
};

const LOWERCASE_HEX_HASH_PATTERN = /^[0-9a-f]{60}$/;
const UPPERCASE_IDENTITY_PATTERN = /^[A-Z]{60}$/;

const NAVIGATION_COMMANDS: NavigationCommand[] = [
  {
    id: "overview",
    label: "Overview",
    description: "Return to the network overview",
    href: "/",
    keywords: ["home", "dashboard", "network"],
  },
  {
    id: "search",
    label: "Search",
    description: "Open the explorer search workspace",
    href: "/search",
    keywords: ["find", "lookup", "explorer"],
  },
];

function normalizeHexTransactionHash(value: string): string | null {
  if (!LOWERCASE_HEX_HASH_PATTERN.test(value)) return null;

  // Keep the RPC validator in the path while accepting the explorer's lowercase
  // hex route contract, including the numeric hex characters it currently omits.
  return normalizeTransactionHash(value) ?? value;
}

export function classifyCommandQuery(input: string): QueryMatch {
  const value = input.trim();
  if (!value) return { kind: "empty", value: "" };

  const identity = UPPERCASE_IDENTITY_PATTERN.test(value) ? normalizeIdentity(value) : null;
  if (identity) {
    return {
      kind: "identity",
      value: identity,
      href: `/identity/${encodeURIComponent(identity)}`,
    };
  }

  const transactionHash = normalizeHexTransactionHash(value);
  if (transactionHash) {
    return {
      kind: "transaction",
      value: transactionHash,
      href: `/transaction/${encodeURIComponent(transactionHash)}`,
    };
  }

  const tick = normalizeTick(value);
  if (tick !== null) {
    return {
      kind: "tick",
      value: tick,
      href: `/tick/${tick}`,
    };
  }

  return { kind: "invalid", value };
}

function getNavigationCommands(query: string): NavigationCommand[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return NAVIGATION_COMMANDS;

  return NAVIGATION_COMMANDS.filter((command) => {
    const searchableText = [command.label, command.description, ...command.keywords]
      .join(" ")
      .toLowerCase();
    return searchableText.includes(normalizedQuery);
  });
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" className="size-5" viewBox="0 0 20 20" fill="none">
      <circle cx="8.75" cy="8.75" r="5.25" stroke="currentColor" strokeWidth="1.5" />
      <path d="m12.75 12.75 4 4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" className="size-4" viewBox="0 0 16 16" fill="none">
      <path d="m3 3 10 10M13 3 3 13" stroke="currentColor" strokeLinecap="round" />
    </svg>
  );
}

function CommandIcon({ type }: { type: NavigationCommand["id"] | QueryMatch["kind"] }) {
  if (type === "search") return <SearchIcon />;

  if (type === "identity") {
    return (
      <span aria-hidden="true" className="flex size-8 items-center justify-center rounded-lg bg-[var(--glyph-ink)] text-xs font-semibold text-[var(--glyph-canvas)]">
        ID
      </span>
    );
  }

  if (type === "transaction") {
    return (
      <span aria-hidden="true" className="flex size-8 items-center justify-center rounded-lg border border-[var(--glyph-line-strong)] font-mono text-xs text-[var(--glyph-muted)]">
        TX
      </span>
    );
  }

  if (type === "tick") {
    return (
      <span aria-hidden="true" className="flex size-8 items-center justify-center rounded-lg border border-dashed border-[var(--glyph-line-strong)] font-mono text-xs text-[var(--glyph-muted)]">
        #
      </span>
    );
  }

  return (
    <span aria-hidden="true" className="flex size-8 items-center justify-center rounded-lg border border-[var(--glyph-line-strong)] text-sm text-[var(--glyph-muted)]">
      <span className="size-1.5 rounded-full bg-current" />
    </span>
  );
}

function QueryCommand({ match, onSelect }: { match: Exclude<QueryMatch, { kind: "empty" | "invalid" }>; onSelect: () => void }) {
  const title = match.kind === "identity"
    ? "Open identity"
    : match.kind === "transaction"
      ? "Open transaction"
      : "Open tick";
  const displayValue = match.kind === "identity"
    ? formatIdentity(match.value)
    : match.kind === "transaction"
      ? formatTransactionHash(match.value)
      : formatTick(match.value);
  const detail = match.kind === "identity"
    ? "Qubic identity"
    : match.kind === "transaction"
      ? "Transaction hash"
      : "Network tick";

  return (
    <Command.Item
      className="group flex min-h-16 cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left outline-none transition-colors data-[selected=true]:bg-[var(--glyph-surface-strong)]"
      onSelect={onSelect}
      value={`direct-${match.kind}-${match.value}`}
    >
      <CommandIcon type={match.kind} />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{title}</span>
        <span className="mt-0.5 block truncate font-mono text-xs text-[var(--glyph-tertiary)]" title={match.value.toString()}>
          {displayValue}
          <span className="ml-2 font-sans text-[var(--glyph-tertiary)]">{detail}</span>
        </span>
      </span>
      <kbd aria-hidden="true" className="hidden shrink-0 rounded-md border border-[var(--glyph-line)] px-1.5 py-1 font-mono text-[10px] text-[var(--glyph-tertiary)] sm:inline-block">
        ↵
      </kbd>
    </Command.Item>
  );
}

function NavigationCommandItem({ command, onSelect }: { command: NavigationCommand; onSelect: () => void }) {
  return (
    <Command.Item
      className="group flex min-h-14 cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left outline-none transition-colors data-[selected=true]:bg-[var(--glyph-surface-strong)]"
      keywords={command.keywords}
      onSelect={onSelect}
      value={command.id}
    >
      <CommandIcon type={command.id} />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{command.label}</span>
        <span className="mt-0.5 block truncate text-xs text-[var(--glyph-tertiary)]">{command.description}</span>
      </span>
      <span aria-hidden="true" className="hidden shrink-0 font-mono text-xs text-[var(--glyph-tertiary)] sm:inline-block">
        {command.href}
      </span>
    </Command.Item>
  );
}

function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const match = classifyCommandQuery(query);
  const navigationCommands = getNavigationCommands(query);
  const hasDirectMatch = match.kind !== "empty" && match.kind !== "invalid";

  const navigate = useCallback(
    (href: string) => {
      onOpenChange(false);
      router.push(href);
    },
    [onOpenChange, router],
  );

  return (
    <Command.Dialog
      aria-describedby="glyph-command-description"
      contentClassName="fixed left-1/2 top-[10vh] z-[60] w-[92vw] max-w-2xl -translate-x-1/2 overflow-hidden rounded-2xl border border-[var(--glyph-line-strong)] bg-[var(--glyph-canvas)] text-[var(--glyph-ink)] shadow-[0_24px_80px_var(--glyph-shadow)] outline-none transition duration-150 ease-out data-[state=closed]:pointer-events-none data-[state=closed]:opacity-0 sm:top-[14vh]"
      label="Glyph Explorer command menu"
      onOpenChange={onOpenChange}
      open={open}
      overlayClassName="fixed inset-0 z-[60] bg-black/45 backdrop-blur-[2px] transition-opacity duration-150 data-[state=closed]:pointer-events-none data-[state=closed]:opacity-0"
      shouldFilter={false}
    >
      <div className="flex items-center gap-3 border-b border-[var(--glyph-line)] px-4">
        <SearchIcon />
        <Command.Input
          aria-label="Search routes and identifiers"
          autoFocus
          className="h-16 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-[var(--glyph-tertiary)]"
          onValueChange={setQuery}
          placeholder="Search routes or paste an identifier…"
          value={query}
        />
        <button
          aria-label="Close command menu"
          className="flex size-9 shrink-0 items-center justify-center rounded-lg text-[var(--glyph-tertiary)] outline-none transition-colors hover:bg-[var(--glyph-surface)] hover:text-[var(--glyph-ink)] focus-visible:ring-2 focus-visible:ring-[var(--glyph-focus)]"
          onClick={() => onOpenChange(false)}
          type="button"
        >
          <CloseIcon />
        </button>
      </div>

      <p className="sr-only" id="glyph-command-description">
        Navigate to an overview or search route, or open a validated identity, transaction hash, or network tick.
      </p>

      <Command.List className="max-h-[min(60vh,28rem)] overflow-y-auto p-2 [scroll-padding-block:0.5rem]" label="Command suggestions">
        {navigationCommands.length > 0 ? (
          <Command.Group heading="Navigate" className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.14em] [&_[cmdk-group-heading]]:text-[var(--glyph-tertiary)]">
            {navigationCommands.map((command) => (
              <NavigationCommandItem key={command.id} command={command} onSelect={() => navigate(command.href)} />
            ))}
          </Command.Group>
        ) : null}

        {hasDirectMatch ? (
          <Command.Group heading="Direct route" className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.14em] [&_[cmdk-group-heading]]:text-[var(--glyph-tertiary)]">
            <QueryCommand match={match as Exclude<QueryMatch, { kind: "empty" | "invalid" }>} onSelect={() => navigate(match.href)} />
          </Command.Group>
        ) : null}

        <Command.Empty>
          <div aria-live="polite" className="px-4 py-10 text-center">
            <p className="text-sm font-medium">{query.trim() ? "No direct route found" : "No commands available"}</p>
            <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-[var(--glyph-tertiary)]">
              {query.trim()
                ? "Use Overview or Search, or paste a 60-letter uppercase identity, a 60-character lowercase hex transaction hash, or a valid network tick."
                : "Use the search field to find a route or open a validated network identifier."}
            </p>
          </div>
        </Command.Empty>
      </Command.List>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-[var(--glyph-line)] px-4 py-3 text-[11px] text-[var(--glyph-tertiary)]">
        <span>Search is local. No network requests are made.</span>
        <span className="flex items-center gap-3" aria-hidden="true">
          <span><kbd className="mr-1 rounded border border-[var(--glyph-line)] px-1 py-0.5 font-mono text-[10px]">↑↓</kbd> navigate</span>
          <span><kbd className="mr-1 rounded border border-[var(--glyph-line)] px-1 py-0.5 font-mono text-[10px]">↵</kbd> open</span>
          <span><kbd className="mr-1 rounded border border-[var(--glyph-line)] px-1 py-0.5 font-mono text-[10px]">esc</kbd> close</span>
        </span>
      </div>
    </Command.Dialog>
  );
}

export function CommandSearch({
  label = "Search",
  onClick,
  shortcut = "⌘ K",
}: CommandSearchProps) {
  const [open, setOpen] = useState(false);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);

  const rememberFocusAndOpen = useCallback((element?: HTMLElement | null) => {
    restoreFocusRef.current = element ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    setOpen(true);
  }, []);

  const handleTriggerClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      onClick?.();
      rememberFocusAndOpen(event.currentTarget);
    },
    [onClick, rememberFocusAndOpen],
  );

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) rememberFocusAndOpen();
      else setOpen(false);
    },
    [rememberFocusAndOpen],
  );

  useEffect(() => {
    if (open) {
      wasOpenRef.current = true;
      return;
    }

    if (!wasOpenRef.current) return;
    wasOpenRef.current = false;
    const elementToRestore = restoreFocusRef.current;
    restoreFocusRef.current = null;
    if (!elementToRestore?.isConnected) return;

    const frame = window.requestAnimationFrame(() => {
      elementToRestore.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    const handleGlobalShortcut = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "k" || (!event.metaKey && !event.ctrlKey)) return;

      event.preventDefault();
      if (event.repeat) return;

      if (open) {
        setOpen(false);
      } else {
        rememberFocusAndOpen();
      }
    };

    document.addEventListener("keydown", handleGlobalShortcut);
    return () => document.removeEventListener("keydown", handleGlobalShortcut);
  }, [open, rememberFocusAndOpen]);

  return (
    <>
      <GlyphButton
        aria-keyshortcuts="Meta+K Control+K"
        aria-label={`${label}. Press Command K or Control K to open the command menu.`}
        className="glyph-command-search"
        data-glyph-slot="command-search"
        onClick={handleTriggerClick}
        variant="secondary"
        size="sm"
      >
        <span className="glyph-command-search__label">
          <SearchIcon />
          <span>{label}</span>
        </span>
        <kbd>{shortcut}</kbd>
      </GlyphButton>
      <CommandPalette
        key={open ? "open" : "closed"}
        onOpenChange={handleOpenChange}
        open={open}
      />
    </>
  );
}
