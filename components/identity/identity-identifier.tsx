import { IdentityAvatar } from "./identity-avatar";

export function IdentityIdentifier({ value, label }: { value: string | undefined; label: string }) {
  if (!value) return <span className="text-[var(--glyph-tertiary)]">Not reported</span>;

  return (
    <span className="flex min-w-0 items-start gap-2">
      <IdentityAvatar identity={value} label={`${label} identicon`} radius={6} size={24} />
      <code className="break-all font-mono text-xs leading-6 text-[var(--glyph-ink)]">{value}</code>
    </span>
  );
}
