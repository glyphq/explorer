"use client";

import {
  AlertCircleIcon,
  Copy01Icon,
  CopyCheckIcon,
  InformationCircleIcon,
  ReloadIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type HugeiconsIconProps } from "@hugeicons/react";
import Link from "next/link";
import { useState, type ComponentProps, type ReactNode } from "react";
import { GlyphButton } from "@/components/ui/button";

import { QuerySkeleton } from "./skeletons";
import { formatRefreshTimestamp, getRpcErrorLabel, isMissingLookupResult } from "./utils";

export type ExplorerQuery<T> = {
  data: T | undefined;
  error: unknown;
  isError: boolean;
  isFetching: boolean;
  isPending: boolean;
  dataUpdatedAt: number;
  refetch: () => Promise<unknown>;
};

type ExplorerIcon = HugeiconsIconProps["icon"];

const surfaceClass = "overflow-hidden rounded-[var(--glyph-radius-md)] border border-[var(--glyph-line)] bg-[var(--glyph-surface)] shadow-[0_8px_24px_var(--glyph-shadow)]";
export const EXPLORER_FRAME_CONTENT_CLASS =
  "mx-auto w-full max-w-screen-2xl px-[var(--glyph-gutter)] py-5 md:py-7";

export function ExplorerFrame({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-[calc(100svh-72px)]">
      <div className={EXPLORER_FRAME_CONTENT_CLASS}>
        {children}
      </div>
    </main>
  );
}

export function PageHeader({
  actions,
  description,
  eyebrow,
  title,
}: {
  actions?: ReactNode;
  description?: ReactNode;
  eyebrow?: string;
  title: ReactNode;
}) {
  return (
    <header className="glyph-page-header">
      <div className="min-w-0">
        {eyebrow ? <p className="glyph-page-header__eyebrow">{eyebrow}</p> : null}
        <h1 className="glyph-page-header__title">{title}</h1>
        {description ? <div className="glyph-page-header__description">{description}</div> : null}
      </div>
      {actions ? <div className="glyph-page-header__actions">{actions}</div> : null}
    </header>
  );
}

export function SectionHeader({
  actions,
  description,
  id,
  title,
}: {
  actions?: ReactNode;
  description?: ReactNode;
  id: string;
  title: string;
}) {
  return (
    <div className="glyph-section-header">
      <div>
        <h2 className="glyph-section-header__title" id={id}>{title}</h2>
        {description ? <p className="glyph-section-header__description">{description}</p> : null}
      </div>
      {actions ? <div className="glyph-section-header__actions">{actions}</div> : null}
    </div>
  );
}

export function IconButton({
  label,
  icon,
  variant = "secondary",
  ...props
}: Omit<ComponentProps<typeof GlyphButton>, "children" | "icon"> & {
  label: string;
  icon: ExplorerIcon;
}) {
  return (
    <GlyphButton
      {...props}
      aria-label={label}
      className={`!min-h-11 !w-11 !p-0 ${props.className ?? ""}`}
      icon={icon}
      variant={variant}
    >
      <span className="sr-only">{label}</span>
    </GlyphButton>
  );
}

export function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function copyValue() {
    if (!navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1_500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <IconButton
      icon={copied ? CopyCheckIcon : Copy01Icon}
      label={copied ? "Copied" : label}
      onClick={() => void copyValue()}
      size="sm"
    />
  );
}

export function ExplorerLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link className="inline-flex cursor-pointer items-center gap-1 font-mono text-xs font-semibold text-[var(--glyph-muted)] transition-colors hover:text-[var(--glyph-ink)]" href={href}>
      {children}
    </Link>
  );
}

export function Panel({
  title,
  children,
  className = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`${surfaceClass} ${className}`}>
      <div className="px-4 pb-1 pt-4">
        <h2 className="text-base font-semibold tracking-[-0.03em] text-[var(--glyph-ink)]">{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function TableScroll({ children }: { children: ReactNode }) {
  return (
    <div className="glyph-table-scroll">
      {children}
      <p className="glyph-table-scroll__hint">Swipe horizontally to view more</p>
    </div>
  );
}

export function TableHeaderLabel({ icon, children }: { icon: ExplorerIcon; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 align-middle leading-none">
      <HugeiconsIcon
        aria-hidden="true"
        className="shrink-0 text-[var(--glyph-tertiary)]"
        focusable="false"
        icon={icon}
        size={14}
        strokeWidth={1.5}
      />
      <span>{children}</span>
    </span>
  );
}

export function QueryRefreshMeta({ query }: { query: Pick<ExplorerQuery<unknown>, "dataUpdatedAt" | "isFetching"> }) {
  const label = formatRefreshTimestamp(query.dataUpdatedAt);
  return (
    <p className="mt-5 border-t border-[var(--glyph-line)] pt-4 text-xs text-[var(--glyph-tertiary)]">
      <span>Updated </span>
      <time dateTime={query.dataUpdatedAt ? new Date(query.dataUpdatedAt).toISOString() : undefined}>
        {label}
      </time>
      {query.isFetching && query.dataUpdatedAt ? <span aria-live="polite"> · refreshing</span> : null}
    </p>
  );
}

export function QueryState({
  query,
  label,
  emptyMessage,
  noResultMessage = "No result was returned.",
  emptyWhen,
  loading,
  children,
}: {
  query: ExplorerQuery<unknown>;
  label: string;
  emptyMessage?: string;
  noResultMessage?: string;
  emptyWhen?: (data: unknown) => boolean;
  loading?: ReactNode;
  children?: ReactNode;
}) {
  const hasData = query.data !== undefined && query.data !== null;

  if (query.isPending && !hasData) {
    return loading ?? <QuerySkeleton label={label} />;
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
    <div aria-busy={query.isFetching}>
      {query.isError ? (
        <div className="mb-5 flex gap-3 border border-[var(--glyph-line-strong)] bg-[var(--glyph-canvas)] px-4 py-3 text-sm text-[var(--glyph-muted)]" role="alert">
          <HugeiconsIcon aria-hidden="true" className="mt-0.5 shrink-0" focusable="false" icon={AlertCircleIcon} size={18} strokeWidth={1.5} />
          <div>
            <p className="font-semibold text-[var(--glyph-ink)]">Refresh unavailable</p>
            <p className="mt-1">Showing the last successful response. {getRpcErrorLabel(query.error)}</p>
            <div className="mt-3">
              <RetryButton onClick={() => void query.refetch()} />
            </div>
          </div>
        </div>
      ) : null}
      {children}
    </div>
  );
}

export function StatusMessage({
  status,
  title,
  description,
  action,
}: {
  status: "error" | "empty";
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  const role = status === "error" ? "alert" : "status";
  const label = status === "error" ? "Unavailable" : "No result";
  const icon = status === "error" ? AlertCircleIcon : InformationCircleIcon;

  return (
    <div className="rounded-[var(--glyph-radius-md)] border border-[var(--glyph-line)] bg-[var(--glyph-surface)] px-5 py-5 shadow-[0_8px_24px_var(--glyph-shadow)]" role={role}>
      <div className="flex items-start gap-3">
        <HugeiconsIcon aria-hidden="true" className="mt-0.5 shrink-0 text-[var(--glyph-muted)]" focusable="false" icon={icon} size={19} strokeWidth={1.5} />
        <div>
          <p className="font-mono text-[0.65rem] font-medium uppercase tracking-[0.16em] text-[var(--glyph-tertiary)]">{label}</p>
          <p className="mt-2 font-medium text-[var(--glyph-ink)]">{title}</p>
          {description ? <p className="mt-1 text-sm leading-6 text-[var(--glyph-muted)]">{description}</p> : null}
          {action ? <div className="mt-4">{action}</div> : null}
        </div>
      </div>
    </div>
  );
}

export function RetryButton({ onClick }: { onClick: () => void }) {
  return (
    <GlyphButton icon={ReloadIcon} onClick={onClick} size="sm" variant="secondary">
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
    <Panel title={`${label} lookup`}>
      <StatusMessage
        description={`Received “${value}”. ${expected}`}
        status="error"
        title={`Invalid ${label.toLowerCase()}`}
      />
      <div className="mt-5">
        <Link className="cursor-pointer text-sm font-semibold text-[var(--glyph-muted)] transition-colors hover:text-[var(--glyph-ink)]" href="/">
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
    <dl className="glyph-detail-grid">
      {items.map((item) => (
        <div className={`glyph-detail-item ${item.wide ? "sm:col-span-2" : ""}`} key={item.label}>
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
