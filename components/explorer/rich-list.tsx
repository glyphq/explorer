"use client";

import { ArrowLeft01Icon, ArrowRight01Icon, Coins01Icon, IdentityCardIcon, RankingIcon } from "@hugeicons/core-free-icons";
import Link from "next/link";
import { useState } from "react";

import { IdentityAvatar } from "@/components/identity";
import { GlyphButton } from "@/components/ui/button";
import {
  DEFAULT_RICH_LIST_PAGE_SIZE,
  useRichList,
  type RichListEntry,
  type RichListPagination,
} from "@/lib/stats";
import { formatIdentity } from "@/lib/rpc/validation";

import { ExplorerFrame, QueryState, TableHeaderLabel, TableScroll } from "./primitives";
import { SkeletonTable } from "./skeletons";
import { formatNumber } from "./utils";

function formatBalance(value: bigint): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function IdentityCell({ identity }: Pick<RichListEntry, "identity">) {
  return (
    <Link
      className="inline-flex min-w-0 items-center gap-2 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--glyph-focus)]"
      href={`/identity/${encodeURIComponent(identity)}`}
    >
      <IdentityAvatar identity={identity} label={`Identicon for ${identity}`} radius={4} size={20} />
      <span className="min-w-0">
        <span className="block truncate font-mono text-xs font-semibold text-[var(--glyph-ink)]" title={identity}>
          {formatIdentity(identity)}
        </span>
      </span>
    </Link>
  );
}

function RichListTable({ entries, pagination }: { entries: RichListEntry[]; pagination: RichListPagination }) {
  const firstRank = (pagination.currentPage - 1) * pagination.pageSize + 1;

  return (
    <TableScroll>
      <table className="glyph-table min-w-[700px] w-full border-collapse text-left" aria-label="Qubic rich list">
        <caption className="sr-only">Reported Qubic identities and balances from the official Stats API</caption>
        <thead>
          <tr>
            <th className="w-20 font-medium" scope="col"><TableHeaderLabel icon={RankingIcon}>Rank</TableHeaderLabel></th>
            <th className="font-medium" scope="col"><TableHeaderLabel icon={IdentityCardIcon}>Identity</TableHeaderLabel></th>
            <th className="font-medium" scope="col"><TableHeaderLabel icon={Coins01Icon}>Reported balance</TableHeaderLabel></th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, index) => (
            <tr className="align-top text-sm" key={`${entry.identity}:${entry.balance.toString()}`}>
              <td className="py-3 text-right font-mono text-xs tabular-nums text-[var(--glyph-tertiary)]">
                {formatNumber(firstRank + index)}
              </td>
              <td className="py-3"><IdentityCell identity={entry.identity} /></td>
              <td className="py-3 text-right font-mono text-xs tabular-nums text-[var(--glyph-ink)]">
                <data title="Balance reported by the official Qubic Stats API" value={entry.balance.toString()}>
                  {formatBalance(entry.balance)}
                </data>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableScroll>
  );
}

function Pagination({
  pagination,
  page,
  isFetching,
  onPageChange,
}: {
  pagination: RichListPagination;
  page: number;
  isFetching: boolean;
  onPageChange: (nextPage: number) => void;
}) {
  const totalPages = Math.max(1, pagination.totalPages);
  const currentPage = Math.min(Math.max(1, page), totalPages);

  return (
    <nav aria-label="Rich-list pages" className="mt-5 flex flex-wrap items-center justify-center gap-3">
      <p className="font-mono text-xs text-[var(--glyph-tertiary)]">
        Page {formatNumber(currentPage)} of {formatNumber(totalPages)} · {formatNumber(pagination.totalRecords)} reported identities
      </p>
      <div className="flex items-center gap-2">
        <GlyphButton
          aria-label="Previous rich-list page"
          disabled={isFetching || currentPage <= 1}
          icon={ArrowLeft01Icon}
          onClick={() => onPageChange(currentPage - 1)}
          size="sm"
          variant="secondary"
        >
          Previous
        </GlyphButton>
        <GlyphButton
          aria-label="Next rich-list page"
          disabled={isFetching || currentPage >= totalPages}
          icon={ArrowRight01Icon}
          onClick={() => onPageChange(currentPage + 1)}
          size="sm"
          variant="secondary"
        >
          Next
        </GlyphButton>
      </div>
    </nav>
  );
}

export function RichListPage() {
  const [page, setPage] = useState(1);
  const query = useRichList(page, DEFAULT_RICH_LIST_PAGE_SIZE);

  return (
    <ExplorerFrame>
      <header className="mb-5 border-b border-[var(--glyph-line)] pb-4">
        <h1 className="text-2xl font-semibold tracking-[-0.05em] text-[var(--glyph-ink)]">Rich list</h1>
        <p className="mt-1 text-sm text-[var(--glyph-muted)]">Reported balances from the official Qubic Stats API.</p>
      </header>

      <QueryState
        emptyMessage="The Stats API returned no rich-list entries."
        emptyWhen={(data) => {
          const pageData = data as { entries?: unknown };
          return Array.isArray(pageData.entries) && pageData.entries.length === 0;
        }}
        label="rich list"
        loading={<SkeletonTable columns={3} label="Loading rich list entries" minWidth="min-w-[700px]" rows={8} />}
        noResultMessage="The rich list was not returned."
        query={query}
      >
        {query.data ? (
          <>
            <RichListTable entries={query.data.entries} pagination={query.data.pagination} />
            <Pagination
              isFetching={query.isFetching}
              onPageChange={setPage}
              page={page}
              pagination={query.data.pagination}
            />
          </>
        ) : null}
      </QueryState>
    </ExplorerFrame>
  );
}
