import type { ReactNode } from "react";
import { GlyphNavigation, type GlyphNavigationProps } from "@/components/shell/navigation";

export type GlyphShellProps = {
  children: ReactNode;
  navigation?: ReactNode;
};

export function GlyphShell({ children, navigation }: GlyphShellProps) {
  const defaultNavigationProps: GlyphNavigationProps = {};

  return (
    <div className="glyph-shell">
      <a className="glyph-skip-link" href="#glyph-main">
        Skip to content
      </a>
      {navigation ?? <GlyphNavigation {...defaultNavigationProps} />}
      <div className="glyph-shell__content" id="glyph-main">
        {children}
      </div>
    </div>
  );
}
