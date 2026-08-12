import { FileCodeIcon, FunctionIcon, CodeIcon } from "@hugeicons/core-free-icons";
import Link from "next/link";

import {
  getContractIdentityHref,
  type ContractCatalogueEntry,
} from "./contracts-catalogue";
import {
  CopyButton,
  ExplorerFrame,
  ExplorerLink,
  InvalidLookup,
  KeyValueList,
  Panel,
  StatusMessage,
  TableHeaderLabel,
  TableScroll,
} from "./primitives";

function IdentityValue({ identity }: { identity: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        className="min-w-0 font-mono text-xs font-semibold underline decoration-[var(--glyph-line-strong)] underline-offset-4 hover:decoration-[var(--glyph-ink)]"
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

function PublishedInputTypes({ contract }: { contract: ContractCatalogueEntry }) {
  if (contract.inputTypes.length === 0) {
    return <p className="text-sm text-[var(--glyph-tertiary)]">No published input types.</p>;
  }

  return (
    <TableScroll>
      <table className="glyph-table min-w-[620px] w-full border-collapse text-left" aria-label={`Published procedures for ${contract.name}`}>
        <caption className="sr-only">
          Published procedures, input types, and generated exports for {contract.name}.
        </caption>
        <thead>
          <tr>
            <th className="font-medium" scope="col"><TableHeaderLabel icon={FunctionIcon}>Procedure</TableHeaderLabel></th>
            <th className="text-right font-medium" scope="col"><TableHeaderLabel icon={CodeIcon}>Input type</TableHeaderLabel></th>
            <th className="font-medium" scope="col"><TableHeaderLabel icon={FileCodeIcon}>Generated export</TableHeaderLabel></th>
          </tr>
        </thead>
        <tbody>
          {contract.inputTypes.map((input) => (
            <tr className="align-top text-sm" key={input.exportName}>
              <th className="py-3 font-medium text-[var(--glyph-ink)]" scope="row">
                {input.name}
              </th>
              <td className="py-3 text-right font-mono text-xs text-[var(--glyph-ink)]">{input.inputType}</td>
              <td className="py-3">
                <code className="break-all font-mono text-xs text-[var(--glyph-muted)]">{input.exportName}</code>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableScroll>
  );
}

function ContractDetail({ contract }: { contract: ContractCatalogueEntry }) {
  return (
    <>
      <header className="mb-5 flex flex-wrap items-end justify-between gap-4 border-b border-[var(--glyph-line)] pb-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.05em] text-[var(--glyph-ink)]">{contract.name}</h1>
          <p className="mt-1 text-sm text-[var(--glyph-muted)]">Generated contract metadata from @qubic.org/contracts.</p>
        </div>
        <ExplorerLink href="/contracts">Back to contracts</ExplorerLink>
      </header>

      <div className="grid gap-5">
        <Panel title="Contract identity">
          <KeyValueList
            items={[
              { label: "Canonical identity", value: <IdentityValue identity={contract.identity} />, wide: true },
              { label: "Contract index", value: <code className="font-mono text-xs">{contract.index}</code> },
              { label: "Generated export", value: <code className="break-all font-mono text-xs">{contract.exportName}</code> },
            ]}
          />
        </Panel>

        <Panel title="Published input types and procedures">
          <PublishedInputTypes contract={contract} />
        </Panel>
      </div>
    </>
  );
}

export function ContractPage({
  contract,
  index,
  requestedIndex,
}: {
  contract: ContractCatalogueEntry | null;
  index: number | null;
  requestedIndex: string;
}) {
  return (
    <ExplorerFrame>
      {index === null ? (
        <InvalidLookup
          expected="Use a whole-number contract index from 0 through 4,294,967,295."
          label="Contract index"
          value={requestedIndex}
        />
      ) : contract ? (
        <ContractDetail contract={contract} />
      ) : (
        <Panel title="Contract lookup">
          <StatusMessage
            description={`No generated contract catalogue entry was found for index ${index}.`}
            status="empty"
            title="Contract not found"
          />
          <div className="mt-5">
            <Link className="text-sm font-semibold underline" href="/contracts">
              Back to contracts
            </Link>
          </div>
        </Panel>
      )}
    </ExplorerFrame>
  );
}
