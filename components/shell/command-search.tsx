"use client";

import { Command } from "cmdk";
import {
  Cancel01Icon,
  HashIcon,
  Home01Icon,
  IdentityCardIcon,
  Search01Icon,
  SearchRemoveIcon,
  TransactionIcon,
  Coins01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type HugeiconsIconProps } from "@hugeicons/react";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type MouseEvent,
} from "react";

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

export type NavigationCommand = {
  id: "overview" | "tokens";
  label: string;
  description: string;
  href: "/" | "/tokens";
  keywords: string[];
};

export type DirectQueryMatch =
  | { kind: "identity"; value: string; href: string }
  | { kind: "transaction"; value: string; href: string }
  | { kind: "tick"; value: number; href: string };

export type QueryMatch =
  | { kind: "empty"; value: "" }
  | DirectQueryMatch
  | { kind: "ambiguous"; value: string; matches: readonly DirectQueryMatch[] }
  | { kind: "invalid"; value: string };

export type RecentLookup = DirectQueryMatch;

const MAX_RECENT_LOOKUPS = 3;
const NAVIGATION_COMMANDS: NavigationCommand[] = [
  {
    id: "overview",
    label: "Overview",
    description: "Network telemetry and latest tick",
    href: "/",
    keywords: ["home", "dashboard", "network", "overview", "telemetry", "latest"],
  },
  {
    id: "tokens",
    label: "Tokens",
    description: "Browse official asset issuance events",
    href: "/tokens",
    keywords: ["assets", "asset", "issuance", "token", "tokens", "registry"],
  },
];

export function classifyCommandQuery(input: string): QueryMatch {
  const value = input.trim();
  if (!value) return { kind: "empty", value: "" };

  const identity = normalizeIdentity(value);
  const transactionHash = value === value.toLowerCase()
    ? normalizeTransactionHash(value)
    : null;
  const matches: DirectQueryMatch[] = [];

  if (identity) {
    matches.push({
      kind: "identity",
      value: identity,
      href: `/identity/${encodeURIComponent(identity)}`,
    });
  }
  if (transactionHash) {
    matches.push({
      kind: "transaction",
      value: transactionHash,
      href: `/transaction/${encodeURIComponent(transactionHash)}`,
    });
  }

  if (matches.length === 1) return matches[0];
  if (matches.length > 1) {
    return { kind: "ambiguous", value, matches };
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

export function rememberRecentLookup(
  recent: readonly RecentLookup[],
  match: DirectQueryMatch,
): RecentLookup[] {
  const next = { ...match };
  const key = `${match.kind}:${match.value}`;

  return [
    next,
    ...recent.filter((item) => `${item.kind}:${item.value}` !== key),
  ].slice(0, MAX_RECENT_LOOKUPS);
}

export function getNavigationCommands(query: string): NavigationCommand[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return NAVIGATION_COMMANDS;

  return NAVIGATION_COMMANDS.filter((command) => {
    const searchableText = [command.label, command.description, ...command.keywords]
      .join(" ")
      .toLowerCase();
    return searchableText.includes(normalizedQuery);
  });
}

type ExplorerIcon = HugeiconsIconProps["icon"];

function ExplorerIcon({
  className = "size-5",
  icon,
}: {
  className?: string;
  icon: ExplorerIcon;
}) {
  return (
    <HugeiconsIcon
      aria-hidden="true"
      className={className}
      focusable="false"
      icon={icon}
      size="1em"
      strokeWidth={1.5}
    />
  );
}

function CommandIcon({ type }: { type: NavigationCommand["id"] | DirectQueryMatch["kind"] | "invalid" }) {
  if (type === "overview") return <ExplorerIcon icon={Home01Icon} />;
  if (type === "tokens") return <ExplorerIcon icon={Coins01Icon} />;

  if (type === "identity") {
    return (
      <span aria-hidden="true" className="flex size-8 items-center justify-center rounded-lg bg-[var(--glyph-ink)] text-xs font-semibold text-[var(--glyph-canvas)]">
        <ExplorerIcon className="size-4" icon={IdentityCardIcon} />
      </span>
    );
  }

  if (type === "transaction") {
    return (
      <span aria-hidden="true" className="flex size-8 items-center justify-center rounded-lg border border-[var(--glyph-line-strong)] font-mono text-xs text-[var(--glyph-muted)]">
        <ExplorerIcon className="size-4" icon={TransactionIcon} />
      </span>
    );
  }

  if (type === "tick") {
    return (
      <span aria-hidden="true" className="flex size-8 items-center justify-center rounded-lg border border-dashed border-[var(--glyph-line-strong)] font-mono text-xs text-[var(--glyph-muted)]">
        <ExplorerIcon className="size-4" icon={HashIcon} />
      </span>
    );
  }

  return (
    <span aria-hidden="true" className="flex size-8 items-center justify-center rounded-lg border border-[var(--glyph-line-strong)] text-sm text-[var(--glyph-muted)]">
      <ExplorerIcon className="size-4" icon={SearchRemoveIcon} />
    </span>
  );
}

export type MatchCopy = {
  detail: string;
  label: string;
  context: string;
};

export function getMatchCopy(kind: DirectQueryMatch["kind"]): MatchCopy {
  if (kind === "identity") {
    return {
      detail: "60 uppercase letters",
      label: "Identity",
      context: "Assets and transaction history",
    };
  }

  if (kind === "transaction") {
    return {
      detail: "60 lowercase hex",
      label: "Transaction",
      context: "Tick and contract metadata",
    };
  }

  return {
    detail: "Numeric tick",
    label: "Tick",
    context: "Transactions for this tick",
  };
}

function formatMatchValue(match: DirectQueryMatch): string {
  if (match.kind === "identity") return formatIdentity(match.value);
  if (match.kind === "transaction") return formatTransactionHash(match.value);
  return formatTick(match.value);
}

function DirectRouteItem({ match, onSelect }: { match: DirectQueryMatch; onSelect: () => void }) {
  const copy = getMatchCopy(match.kind);
  const displayValue = formatMatchValue(match);

  return (
    <Command.Item
      className="group flex min-h-14 cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-left outline-none transition-colors data-[selected=true]:bg-[var(--glyph-surface-strong)]"
      onSelect={onSelect}
      value={`direct-${match.kind}-${match.value}`}
    >
      <CommandIcon type={match.kind} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--glyph-tertiary)]">
          <span>{copy.label}</span>
          <span aria-hidden="true">·</span>
          <span>Typed route</span>
        </span>
        <span className="mt-1 block truncate text-sm font-medium" title={String(match.value)}>
          Open {copy.label.toLowerCase()} <span className="font-mono">{displayValue}</span>
        </span>
        <span className="mt-0.5 block truncate text-xs text-[var(--glyph-tertiary)]">
          {copy.detail} · {copy.context}
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
      className="group flex min-h-12 cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-left outline-none transition-colors data-[selected=true]:bg-[var(--glyph-surface-strong)]"
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

function RecentLookupItem({ lookup, onSelect }: { lookup: RecentLookup; onSelect: () => void }) {
  const copy = getMatchCopy(lookup.kind);

  return (
    <Command.Item
      className="group flex min-h-12 cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-left outline-none transition-colors data-[selected=true]:bg-[var(--glyph-surface-strong)]"
      onSelect={onSelect}
      value={`recent-${lookup.kind}-${lookup.value}`}
    >
      <CommandIcon type={lookup.kind} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--glyph-tertiary)]">
          <span>{copy.label}</span>
          <span aria-hidden="true">·</span>
          <span>Recent</span>
        </span>
        <span className="mt-1 block truncate text-sm font-medium" title={String(lookup.value)}>
          Reopen <span className="font-mono">{formatMatchValue(lookup)}</span>
        </span>
        <span className="mt-0.5 block truncate text-xs text-[var(--glyph-tertiary)]">
          {copy.context}
        </span>
      </span>
    </Command.Item>
  );
}

const groupClassName = "[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.14em] [&_[cmdk-group-heading]]:text-[var(--glyph-tertiary)]";

function CommandPalette({
  open,
  onOpenChange,
  recentLookups,
  onLookup,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recentLookups: readonly RecentLookup[];
  onLookup: (match: DirectQueryMatch) => void;
}) {
  const router = useRouter();
  const descriptionId = useId();
  const [query, setQuery] = useState("");
  const match = classifyCommandQuery(query);
  const navigationCommands = getNavigationCommands(query);
  const directMatches = match.kind === "ambiguous"
    ? match.matches
    : match.kind !== "empty" && match.kind !== "invalid"
      ? [match]
      : [];
  const hasDirectMatch = directMatches.length > 0;
  const hasQuery = Boolean(query.trim());

  const navigate = useCallback(
    (href: string) => {
      onOpenChange(false);
      router.push(href);
    },
    [onOpenChange, router],
  );

  const selectMatch = useCallback(
    (selectedMatch: DirectQueryMatch) => {
      onLookup(selectedMatch);
      navigate(selectedMatch.href);
    },
    [navigate, onLookup],
  );

  return (
    <Command.Dialog
      aria-describedby={descriptionId}
      contentClassName="fixed left-1/2 top-[8vh] z-[60] w-[min(92vw,36rem)] -translate-x-1/2 overflow-hidden rounded-2xl border border-[var(--glyph-line-strong)] bg-[var(--glyph-canvas)] text-[var(--glyph-ink)] shadow-[0_24px_80px_var(--glyph-shadow)] outline-none transition duration-150 ease-out data-[state=closed]:pointer-events-none data-[state=closed]:opacity-0 sm:top-[12vh]"
      label="Glyph Explorer navigation and lookup"
      onOpenChange={onOpenChange}
      open={open}
      overlayClassName="fixed inset-0 z-[60] bg-black/45 backdrop-blur-[2px] transition-opacity duration-150 data-[state=closed]:pointer-events-none data-[state=closed]:opacity-0"
      shouldFilter={false}
    >
      <div className="flex items-center gap-3 border-b border-[var(--glyph-line)] px-4">
        <ExplorerIcon icon={Search01Icon} />
        <Command.Input
          aria-label="Search routes and identifiers"
          autoFocus
          className="h-14 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--glyph-tertiary)]"
          onValueChange={setQuery}
          placeholder="Route or identifier"
          value={query}
        />
        <button
          aria-label="Close navigation and lookup"
          className="flex size-8 shrink-0 items-center justify-center rounded-lg text-[var(--glyph-tertiary)] outline-none transition-colors hover:bg-[var(--glyph-surface)] hover:text-[var(--glyph-ink)] focus-visible:ring-2 focus-visible:ring-[var(--glyph-focus)]"
          onClick={() => onOpenChange(false)}
          type="button"
        >
          <ExplorerIcon className="size-4" icon={Cancel01Icon} />
        </button>
      </div>

      <p className="sr-only" id={descriptionId}>
        Open the network overview or a validated identity, transaction, or tick route. Lookup stays in this tab and does not make network requests.
      </p>
      <p aria-live="polite" className="sr-only" role="status">
        {hasDirectMatch
          ? directMatches.length === 1
            ? `${getMatchCopy(directMatches[0].kind).label} route ready. Press Enter to open.`
            : "Choose whether this identifier is an identity or transaction."
          : hasQuery
            ? "No matching route."
            : "Navigation and recent lookups."}
      </p>

      <Command.List className="max-h-[min(56vh,25rem)] overflow-y-auto p-2 [scroll-padding-block:0.5rem]" label="Navigation and lookup results">
        {!hasQuery && recentLookups.length > 0 ? (
          <Command.Group heading="Recent lookups" className={groupClassName}>
            {recentLookups.map((lookup) => (
              <RecentLookupItem key={`${lookup.kind}:${lookup.value}`} lookup={lookup} onSelect={() => selectMatch(lookup)} />
            ))}
          </Command.Group>
        ) : null}

        {navigationCommands.length > 0 ? (
          <Command.Group heading="Quick routes" className={groupClassName}>
            {navigationCommands.map((command) => (
              <NavigationCommandItem key={command.id} command={command} onSelect={() => navigate(command.href)} />
            ))}
          </Command.Group>
        ) : null}

        {hasDirectMatch ? (
          <Command.Group heading={directMatches.length > 1 ? "Choose a typed route" : "Typed lookup"} className={groupClassName}>
            {directMatches.map((directMatch) => (
              <DirectRouteItem
                key={`${directMatch.kind}:${directMatch.value}`}
                match={directMatch}
                onSelect={() => selectMatch(directMatch)}
              />
            ))}
          </Command.Group>
        ) : null}

        <Command.Empty>
          <div aria-live="polite" className="px-4 py-8 text-center">
            <p className="text-sm font-medium">{hasQuery ? "No matching route" : "No routes"}</p>
          </div>
        </Command.Empty>
      </Command.List>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-[var(--glyph-line)] px-4 py-2.5 text-[11px] text-[var(--glyph-tertiary)]">
        <span>Session-only lookup</span>
        <span className="flex items-center gap-3" aria-hidden="true">
          <span><kbd className="mr-1 rounded border border-[var(--glyph-line)] px-1 py-0.5 font-mono text-[10px]">↑↓</kbd> move</span>
          <span><kbd className="mr-1 rounded border border-[var(--glyph-line)] px-1 py-0.5 font-mono text-[10px]">↵</kbd> open</span>
          <span><kbd className="mr-1 rounded border border-[var(--glyph-line)] px-1 py-0.5 font-mono text-[10px]">esc</kbd> close</span>
        </span>
      </div>
    </Command.Dialog>
  );
}

export function CommandSearch({
  label = "Lookup",
  onClick,
  shortcut = "⌘/Ctrl K",
}: CommandSearchProps) {
  const [open, setOpen] = useState(false);
  const [recentLookups, setRecentLookups] = useState<RecentLookup[]>([]);
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

  const handleLookup = useCallback((match: DirectQueryMatch) => {
    setRecentLookups((recent) => rememberRecentLookup(recent, match));
  }, []);

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
        aria-label={`${label}. Press Command K or Control K to open navigation and lookup.`}
        className="glyph-command-search"
        data-glyph-slot="command-search"
        icon={Search01Icon}
        onClick={handleTriggerClick}
        size="sm"
        variant="secondary"
      >
        <span className="glyph-command-search__label">
          <span>{label}</span>
        </span>
        <kbd>{shortcut}</kbd>
      </GlyphButton>
      <CommandPalette
        key={open ? "open" : "closed"}
        onLookup={handleLookup}
        onOpenChange={handleOpenChange}
        open={open}
        recentLookups={recentLookups}
      />
    </>
  );
}
