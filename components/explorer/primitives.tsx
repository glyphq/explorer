"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { GlyphButton } from "@/components/ui/button";

import { formatRefreshTimestamp, getRpcErrorLabel, isMissingLookupResult, resolveExplorerLookup } from "./utils";

export type ExplorerQuery<T> = {
  data: T | undefined;
  error: unknown;
  isError: boolean;
  isFetching: boolean;
  isPending: boolean;
  dataUpdatedAt: number;
  refetch: () => Promise<unknown>;
};

const surfaceClass = "border border-[var(--glyph-line)] bg-[var(--glyph-surface)]";

export function ExplorerFrame({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-[calc(100svh-72px)]">
      <div className="mx-auto w-full max-w-6xl px-[var(--glyph-gutter)] py-6 md:py-8">
        {children}
      </div>
    </main>
  );
}

export function ExplorerPageHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-col gap-4 border-b border-[var(--glyph-line)] pb-5 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        <p className="mb-1 font-mono text-[0.65rem] font-medium uppercase tracking-[0.16em] text-[var(--glyph-tertiary)]">
          {eyebrow}
        </p>
        <h1 className="text-2xl font-semibold tracking-[-0.05em] text-[var(--glyph-ink)] md:text-3xl">
          {title}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--glyph-muted)]">
          {description}
        </p>
      </div>
      {children ? <div className="shrink-0">{children}</div> : null}
    </header>
  );
}

export function SearchForm({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputId = compact ? "explorer-search-compact" : "explorer-search";
  const helpId = `${inputId}-help`;
  const errorId = `${inputId}-error`;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const lookup = resolveExplorerLookup(value);
    if (!lookup) {
      setError("Enter a valid identity, 60-character transaction hash, or tick number.");
      return;
    }

    setError(null);
    router.push(lookup.href);
  }

  return (
    <form className={compact ? "w-full" : "w-full max-w-3xl"} onSubmit={submit} noValidate>
      <label
        className="mb-2 block text-sm font-semibold text-[var(--glyph-ink)]"
        htmlFor={inputId}
      >
        Search the network
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          aria-describedby={error ? `${helpId} ${errorId}` : helpId}
          aria-invalid={Boolean(error)}
          className="min-h-12 min-w-0 flex-1 border border-[var(--glyph-line-strong)] bg-[var(--glyph-canvas)] px-4 font-mono text-sm text-[var(--glyph-ink)] placeholder:text-[var(--glyph-tertiary)]"
          id={inputId}
          onChange={(event) => {
            setValue(event.target.value);
            if (error) setError(null);
          }}
          placeholder="Identity, transaction hash, or tick"
          spellCheck={false}
          type="text"
          value={value}
        />
        <GlyphButton type="submit" size="md">
          Open lookup
        </GlyphButton>
      </div>
      <p className="mt-2 text-xs leading-5 text-[var(--glyph-tertiary)]" id={helpId}>
        Lookup is read-only. The Explorer never signs or broadcasts transactions.
      </p>
      {error ? (
        <p className="mt-2 text-sm font-medium text-[var(--glyph-ink)]" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}

export function Panel({
  eyebrow,
  title,
  children,
  className = "",
}: {
  eyebrow?: string;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`${surfaceClass} ${className}`}>
      <div className="border-b border-[var(--glyph-line)] px-4 py-3">
        {eyebrow ? (
          <p className="mb-1 font-mono text-[0.65rem] font-medium uppercase tracking-[0.16em] text-[var(--glyph-tertiary)]">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="text-lg font-semibold tracking-[-0.03em] text-[var(--glyph-ink)]">{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function QueryRefreshMeta({ query }: { query: Pick<ExplorerQuery<unknown>, "dataUpdatedAt" | "isFetching"> }) {
  const label = formatRefreshTimestamp(query.dataUpdatedAt);
  return (
    <p className="mt-5 border-t border-[var(--glyph-line)] pt-4 text-xs text-[var(--glyph-tertiary)]">
      <span>Last refreshed: </span>
      <time dateTime={query.dataUpdatedAt ? new Date(query.dataUpdatedAt).toISOString() : undefined}>
        {label}
      </time>
      {query.isFetching && query.dataUpdatedAt ? <span aria-live="polite"> (Refreshing…)</span> : null}
    </p>
  );
}

export function QueryState({
  query,
  label,
  emptyMessage,
  noResultMessage = "No result was returned.",
  emptyWhen,
  children,
}: {
  query: ExplorerQuery<unknown>;
  label: string;
  emptyMessage?: string;
  noResultMessage?: string;
  emptyWhen?: (data: unknown) => boolean;
  children?: ReactNode;
}) {
  const hasData = query.data !== undefined && query.data !== null;

  if (query.isPending && !hasData) {
    return <StatusMessage status="loading" title={`Loading ${label}…`} />;
  }

  if (query.isError && !hasData) {
    if (isMissingLookupResult(query.error)) {
      return <StatusMessage status="empty" title={noResultMessage} />;
    }
    return (
      <StatusMessage
        action={<RetryButton onClick={() => void query.refetch()} />}
        status="error"
        title={getRpcErrorLabel(query.error)}
      />
    );
  }

  if (!hasData) {
    return <StatusMessage status="empty" title={noResultMessage} />;
  }

  if (!query.isError && emptyWhen?.(query.data)) {
    return <StatusMessage status="empty" title={emptyMessage ?? noResultMessage} />;
  }

  return (
    <>
      {query.isError ? (
        <div className="mb-5 border border-[var(--glyph-line-strong)] bg-[var(--glyph-canvas)] px-4 py-3 text-sm text-[var(--glyph-muted)]" role="alert">
          <p className="font-semibold text-[var(--glyph-ink)]">Refresh unavailable</p>
          <p className="mt-1">Showing the last successful response. {getRpcErrorLabel(query.error)}</p>
          <div className="mt-3">
            <RetryButton onClick={() => void query.refetch()} />
          </div>
        </div>
      ) : null}
      {children}
    </>
  );
}

export function StatusMessage({
  status,
  title,
  description,
  action,
}: {
  status: "loading" | "error" | "empty";
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  const role = status === "error" ? "alert" : "status";
  const label = status === "loading" ? "Loading" : status === "error" ? "Unavailable" : "No result";

  return (
    <div className="border border-[var(--glyph-line)] bg-[var(--glyph-canvas)] px-4 py-5" role={role}>
      <p className="font-mono text-[0.65rem] font-medium uppercase tracking-[0.16em] text-[var(--glyph-tertiary)]">
        {label}
      </p>
      <p className="mt-2 font-medium text-[var(--glyph-ink)]">{title}</p>
      {description ? <p className="mt-1 text-sm leading-6 text-[var(--glyph-muted)]">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function RetryButton({ onClick }: { onClick: () => void }) {
  return (
    <GlyphButton onClick={onClick} size="sm" variant="secondary">
      Try again
    </GlyphButton>
  );
}

export function InvalidLookup({
  label,
  value,
  expected,
}: {
  label: string;
  value: string;
  expected: string;
}) {
  return (
    <Panel title={`${label} lookup`} eyebrow="Input validation">
      <StatusMessage
        description={`Received “${value}”. ${expected}`}
        status="error"
        title={`Invalid ${label.toLowerCase()}`}
      />
      <div className="mt-5">
        <Link className="text-sm font-semibold underline" href="/">
          Return to Explorer search
        </Link>
      </div>
    </Panel>
  );
}

export function KeyValueList({
  items,
}: {
  items: Array<{ label: string; value: ReactNode; wide?: boolean }>;
}) {
  return (
    <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
      {items.map((item) => (
        <div className={item.wide ? "sm:col-span-2" : ""} key={item.label}>
          <dt className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--glyph-tertiary)]">{item.label}</dt>
          <dd className="mt-1 break-words text-sm text-[var(--glyph-ink)]">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function IdentifierValue({ value }: { value: string | undefined }) {
  return value ? (
    <code className="break-all font-mono text-xs leading-6 text-[var(--glyph-ink)]">{value}</code>
  ) : (
    <span className="text-[var(--glyph-tertiary)]">Not reported</span>
  );
}
