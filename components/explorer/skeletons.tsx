import type { ComponentProps, ReactNode } from "react";

const skeletonBase =
  "block bg-[var(--glyph-line-strong)] opacity-60 motion-safe:animate-pulse motion-reduce:animate-none";

export function Skeleton({ className = "", ...props }: { className?: string } & ComponentProps<"span">) {
  return <span aria-hidden="true" {...props} className={`${skeletonBase} ${className}`} />;
}

export function SkeletonRegion({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div aria-busy="true" className={className} role="status">
      <span className="sr-only">{label}</span>
      <div aria-hidden="true">{children}</div>
    </div>
  );
}

export function SkeletonLine({ className = "" }: { className?: string }) {
  return <Skeleton className={`h-3 rounded-sm ${className}`} />;
}

export function SkeletonHeader({
  titleWidth = "w-40",
  description = true,
  descriptionWidth = "w-64",
}: {
  titleWidth?: string;
  description?: boolean;
  descriptionWidth?: string;
}) {
  return (
    <header className="mb-5 border-b border-[var(--glyph-line)] pb-4">
      <Skeleton className={`h-8 rounded-sm ${titleWidth}`} />
      {description ? <SkeletonLine className={`mt-2 ${descriptionWidth}`} /> : null}
    </header>
  );
}

export function SkeletonTable({
  label,
  columns,
  rows = 8,
  minWidth = "min-w-[700px]",
  className = "",
}: {
  label: string;
  columns: number;
  rows?: number;
  minWidth?: string;
  className?: string;
}) {
  const columnWidths = ["w-32", "w-16", "w-44", "w-24", "w-28", "w-20"];

  return (
    <SkeletonRegion className={className} label={label}>
      <div className="glyph-table-scroll">
        <table className={`glyph-table w-full border-collapse text-left ${minWidth}`}>
          <thead>
            <tr>
              {Array.from({ length: columns }, (_, index) => (
                <th key={`heading-${index}`} scope="col">
                  <SkeletonLine className={`my-0.5 ${columnWidths[index % columnWidths.length]}`} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }, (_, rowIndex) => (
              <tr key={`row-${rowIndex}`}>
                {Array.from({ length: columns }, (_, columnIndex) => (
                  <td className="py-3" key={`cell-${rowIndex}-${columnIndex}`}>
                    <SkeletonLine className={`${columnWidths[(columnIndex + rowIndex) % columnWidths.length]} ${columnIndex === 0 ? "max-w-[12rem]" : ""}`} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SkeletonRegion>
  );
}

export function SkeletonKeyValueList({
  label,
  rows = 8,
  className = "",
}: {
  label: string;
  rows?: number;
  className?: string;
}) {
  return (
    <SkeletonRegion className={className} label={label}>
      <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
        {Array.from({ length: rows }, (_, index) => (
          <div className={index === rows - 1 ? "sm:col-span-2" : undefined} key={`detail-${index}`}>
            <SkeletonLine className="w-20" />
            <SkeletonLine className={`mt-2 ${index % 3 === 0 ? "w-52" : index % 3 === 1 ? "w-32" : "w-40"}`} />
          </div>
        ))}
      </dl>
    </SkeletonRegion>
  );
}

export function OverviewStatsSkeleton({ className = "" }: { className?: string }) {
  return (
    <SkeletonRegion className={className} label="Loading network stats">
      <div className="glyph-network-grid">
        <div className="glyph-data-card glyph-network-tile glyph-network-tile--lead">
          <SkeletonLine className="w-24" />
          <Skeleton className="mt-5 h-14 w-48 rounded-sm sm:h-16" />
          <SkeletonLine className="mt-5 w-36" />
        </div>
        {Array.from({ length: 4 }, (_, index) => (
          <div className="glyph-data-card glyph-network-tile" key={`metric-${index}`}>
            <SkeletonLine className="w-24" />
            <Skeleton className="mt-4 h-7 w-28 rounded-sm" />
            <SkeletonLine className="mt-3 w-32" />
          </div>
        ))}
      </div>
    </SkeletonRegion>
  );
}

export function OverviewPageSkeleton() {
  return (
    <SkeletonRegion className="space-y-8" label="Loading network overview">
      <section className="mb-8">
        <div className="mx-auto max-w-3xl text-center">
          <Skeleton className="mx-auto h-12 w-72 rounded-sm sm:h-14 sm:w-96" />
          <SkeletonLine className="mx-auto mt-3 w-64" />
          <Skeleton className="mx-auto mt-6 h-14 w-full max-w-2xl rounded-[var(--glyph-radius-md)]" />
        </div>
      </section>
      <section className="w-full border border-[var(--glyph-line)] bg-[var(--glyph-surface)]">
        <OverviewStatsSkeleton />
      </section>
    </SkeletonRegion>
  );
}

export function DetailPageSkeleton({
  label,
  titleWidth = "w-48",
  rows = 8,
}: {
  label: string;
  titleWidth?: string;
  rows?: number;
}) {
  return (
    <SkeletonRegion label={label}>
      <SkeletonHeader titleWidth={titleWidth} />
      <SkeletonKeyValueList label={`${label} fields`} rows={rows} />
    </SkeletonRegion>
  );
}

export function IdentityPageSkeleton() {
  return (
    <SkeletonRegion className="space-y-8" label="Loading identity">
      <header className="mb-4 pb-5 text-center">
        <Skeleton className="mx-auto size-16 rounded-full" />
        <Skeleton className="mx-auto mt-3 h-8 w-72 max-w-full rounded-sm" />
        <Skeleton className="mx-auto mt-5 h-8 w-40 rounded-sm" />
        <SkeletonLine className="mx-auto mt-2 w-28" />
        <div className="mt-4 flex justify-center gap-2">
          <Skeleton className="h-10 w-24 rounded-md" />
          <Skeleton className="size-10 rounded-md" />
          <Skeleton className="size-10 rounded-md" />
        </div>
      </header>
      <section className="border-t border-[var(--glyph-line)] pt-6">
        <SkeletonHeader description={false} titleWidth="w-28" />
        <SkeletonTable columns={5} label="Loading identity transaction history" minWidth="min-w-[980px]" rows={6} />
      </section>
    </SkeletonRegion>
  );
}

export function RichListPageSkeleton() {
  return (
    <SkeletonRegion label="Loading rich list">
      <SkeletonHeader descriptionWidth="w-72" titleWidth="w-36" />
      <SkeletonTable columns={3} label="Loading rich list entries" minWidth="min-w-[700px]" rows={8} />
    </SkeletonRegion>
  );
}

export function TokensPageSkeleton() {
  return (
    <SkeletonRegion label="Loading tokens">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4 border-b border-[var(--glyph-line)] pb-4">
        <Skeleton className="h-8 w-24 rounded-sm" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-48 rounded-md" />
          <SkeletonLine className="w-10" />
        </div>
      </div>
      <SkeletonTable columns={4} label="Loading token rows" minWidth="min-w-[760px]" rows={8} />
    </SkeletonRegion>
  );
}

export function ContractsPageSkeleton() {
  return (
    <SkeletonRegion label="Loading contracts">
      <SkeletonHeader description={false} titleWidth="w-36" />
      <SkeletonTable columns={4} label="Loading contract rows" minWidth="min-w-[800px]" rows={10} />
    </SkeletonRegion>
  );
}

export function ContractDetailPageSkeleton() {
  return (
    <SkeletonRegion label="Loading contract details">
      <SkeletonHeader titleWidth="w-52" descriptionWidth="w-80" />
      <div className="grid gap-5">
        <section className="border border-[var(--glyph-line)] bg-[var(--glyph-surface)]">
          <div className="border-b border-[var(--glyph-line)] px-4 py-3"><SkeletonLine className="w-32" /></div>
          <div className="p-4"><SkeletonKeyValueList label="Loading contract identity" rows={3} /></div>
        </section>
        <section className="border border-[var(--glyph-line)] bg-[var(--glyph-surface)]">
          <div className="border-b border-[var(--glyph-line)] px-4 py-3"><SkeletonLine className="w-64" /></div>
          <div className="p-4"><SkeletonTable columns={3} label="Loading published procedures" minWidth="min-w-[620px]" rows={5} /></div>
        </section>
      </div>
    </SkeletonRegion>
  );
}

export function TickPageSkeleton() {
  return (
    <SkeletonRegion label="Loading tick details">
      <SkeletonHeader description={false} titleWidth="w-32" />
      <div className="mb-4"><SkeletonLine className="w-28" /></div>
      <SkeletonKeyValueList label="Loading tick metadata" rows={7} />
    </SkeletonRegion>
  );
}

export function TickTransactionsPageSkeleton() {
  return (
    <SkeletonRegion label="Loading tick transactions">
      <SkeletonHeader titleWidth="w-36" descriptionWidth="w-56" />
      <SkeletonTable columns={6} label="Loading tick transaction rows" minWidth="min-w-[760px]" rows={7} />
    </SkeletonRegion>
  );
}

export function TransactionPageSkeleton() {
  return (
    <SkeletonRegion label="Loading transaction">
      <SkeletonHeader titleWidth="w-40" descriptionWidth="w-64" />
      <SkeletonKeyValueList label="Loading transaction fields" rows={10} />
      <div className="mt-8 border-t border-[var(--glyph-line)] pt-5">
        <SkeletonLine className="w-24" />
        <div className="mt-5"><SkeletonKeyValueList label="Loading transaction payload" rows={2} /></div>
      </div>
    </SkeletonRegion>
  );
}

export function QuerySkeleton({ label }: { label: string }) {
  return <SkeletonKeyValueList label={`Loading ${label}`} rows={6} />;
}
