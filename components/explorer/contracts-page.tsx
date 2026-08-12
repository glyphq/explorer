"use client";

import { Cancel01Icon, Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";

import { GlyphButton } from "@/components/ui/button";

import {
  filterContracts,
  getContractIdentityHref,
  type ContractCatalogueEntry,
} from "./contracts-catalogue";
import { CopyButton, ExplorerFrame } from "./primitives";

export type ContractsPageProps = {
  contracts: readonly ContractCatalogueEntry[];
};

function PublishedInputs({ contract }: { contract: ContractCatalogueEntry }) {
  if (contract.inputTypes.length === 0) {
    return <span className="text-[var(--glyph-tertiary)]">0 published input types</span>;
  }

  return (
    <details className="group">
      <summary className="cursor-pointer list-none text-sm text-[var(--glyph-muted)] underline decoration-[var(--glyph-line-strong)] underline-offset-4 outline-none marker:hidden focus-visible:ring-2 focus-visible:ring-[var(--glyph-focus)]">
        <span className="font-mono text-xs font-semibold text-[var(--glyph-ink)]">{contract.inputTypes.length}</span>{" "}
        published input types
        <span aria-hidden="true" className="ml-2 text-[var(--glyph-tertiary)] group-open:hidden">+</span>
        <span aria-hidden="true" className="ml-2 hidden text-[var(--glyph-tertiary)] group-open:inline">−</span>
      </summary>
      <ul className="mt-3 space-y-1.5 border-l border-[var(--glyph-line-strong)] pl-3">
        {contract.inputTypes.map((input) => (
          <li className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs" key={input.exportName}>
            <code className="text-[var(--glyph-ink)]" title={input.exportName}>{input.name}</code>
            <span className="font-mono text-[var(--glyph-tertiary)]">type {input.inputType}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}

function IdentityCell({ identity }: { identity: string }) {
  return (
    <div className="flex min-w-[25rem] items-center gap-2">
      <Link
        className="min-w-0 flex-1 font-mono text-xs font-semibold underline decoration-[var(--glyph-line-strong)] underline-offset-4 hover:decoration-[var(--glyph-ink)]"
        href={getContractIdentityHref(identity)}
        prefetch={false}
        title={`Open identity ${identity}`}
      >
        <span className="break-all">{identity}</span>
      </Link>
      <CopyButton label="Copy canonical identity" value={identity} />
    </div>
  );
}

function ContractsTable({ contracts }: { contracts: readonly ContractCatalogueEntry[] }) {
  return (
    <div className="overflow-x-auto border-y border-[var(--glyph-line)]">
      <table className="min-w-[1120px] w-full border-collapse text-left" aria-label="Generated Qubic smart contracts">
        <caption className="sr-only">
          Contract names, indices, canonical identities, and published input types from the official generated contracts package.
        </caption>
        <thead>
          <tr className="border-b border-[var(--glyph-line)] text-[0.68rem] uppercase tracking-[0.08em] text-[var(--glyph-tertiary)]">
            <th className="px-4 py-3 font-medium sm:first:pl-0" scope="col">Contract</th>
            <th className="px-4 py-3 text-right font-medium" scope="col">Index</th>
            <th className="px-4 py-3 font-medium" scope="col">Canonical identity</th>
            <th className="px-4 py-3 font-medium" scope="col">Published inputs / procedures</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--glyph-line)]">
          {contracts.map((contract) => (
            <tr className="align-top text-sm text-[var(--glyph-muted)]" key={contract.index}>
              <th className="whitespace-nowrap px-4 py-4 font-semibold text-[var(--glyph-ink)] sm:first:pl-0" scope="row">
                <span title={`Generated package export: ${contract.exportName}`}>{contract.name}</span>
              </th>
              <td className="whitespace-nowrap px-4 py-4 text-right font-mono text-xs text-[var(--glyph-ink)]">{contract.index}</td>
              <td className="px-4 py-4"><IdentityCell identity={contract.identity} /></td>
              <td className="min-w-[20rem] px-4 py-4"><PublishedInputs contract={contract} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ContractsPage({ contracts }: ContractsPageProps) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const filteredContracts = useMemo(
    () => filterContracts(contracts, deferredQuery),
    [contracts, deferredQuery],
  );

  return (
    <ExplorerFrame>
      <header className="mb-5 border-b border-[var(--glyph-line)] pb-4">
        <h1 className="text-2xl font-semibold tracking-[-0.05em] text-[var(--glyph-ink)]">Contracts</h1>
        <p className="mt-1 max-w-2xl text-sm text-[var(--glyph-muted)]">
          Generated names, canonical identities, and published input types from @qubic.org/contracts.
        </p>
      </header>

      <section aria-labelledby="contracts-catalogue-heading">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-[var(--glyph-ink)]" id="contracts-catalogue-heading">Contract catalogue</h2>
            <p aria-live="polite" className="mt-1 font-mono text-xs text-[var(--glyph-tertiary)]">
              {filteredContracts.length} of {contracts.length} contracts
            </p>
          </div>
          <div className="flex min-h-11 w-full items-center gap-2 border border-[var(--glyph-line-strong)] bg-[var(--glyph-canvas)] px-3 sm:w-[min(100%,27rem)]">
            <HugeiconsIcon aria-hidden="true" className="shrink-0 text-[var(--glyph-tertiary)]" focusable="false" icon={Search01Icon} size={17} strokeWidth={1.5} />
            <label className="sr-only" htmlFor="contracts-search">Search contracts by name, index, or identity</label>
            <input
              className="min-w-0 flex-1 bg-transparent text-sm text-[var(--glyph-ink)] outline-none placeholder:text-[var(--glyph-tertiary)]"
              id="contracts-search"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name, index, or identity"
              type="search"
              value={query}
            />
            {query ? (
              <GlyphButton
                aria-label="Clear contract search"
                className="!min-h-8 !w-8 !p-0"
                icon={Cancel01Icon}
                onClick={() => setQuery("")}
                size="sm"
                variant="quiet"
              >
                <span className="sr-only">Clear contract search</span>
              </GlyphButton>
            ) : null}
          </div>
        </div>

        {filteredContracts.length > 0 ? (
          <ContractsTable contracts={filteredContracts} />
        ) : (
          <p className="border-y border-[var(--glyph-line)] px-4 py-10 text-center text-sm text-[var(--glyph-muted)]">
            No generated contracts match “{query.trim()}”.
          </p>
        )}
      </section>

      <p className="mt-5 border-t border-[var(--glyph-line)] pt-4 text-xs text-[var(--glyph-tertiary)]">
        This catalogue is limited to names, indices, and input type exports published by the installed package. It does not add network activity or metadata that the package does not export.
      </p>
    </ExplorerFrame>
  );
}
