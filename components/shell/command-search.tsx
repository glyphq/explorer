import { GlyphButton } from "@/components/ui/button";

type CommandSearchProps = {
  onClick?: () => void;
  shortcut?: string;
  label?: string;
};

export function CommandSearch({
  label = "Search",
  onClick,
  shortcut = "⌘ K",
}: CommandSearchProps) {
  return (
    <GlyphButton
      className="glyph-command-search"
      data-glyph-slot="command-search"
      onClick={onClick}
      variant="secondary"
      size="sm"
      aria-label={`${label}. Keyboard shortcut ${shortcut}.`}
    >
      <span className="glyph-command-search__label">
        <svg aria-hidden="true" viewBox="0 0 16 16" fill="none">
          <circle cx="7" cy="7" r="4.25" stroke="currentColor" />
          <path d="m10.25 10.25 3 3" stroke="currentColor" strokeLinecap="round" />
        </svg>
        <span>{label}</span>
      </span>
      <kbd>{shortcut}</kbd>
    </GlyphButton>
  );
}
