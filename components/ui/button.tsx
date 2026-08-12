import type { ButtonHTMLAttributes, ReactNode } from "react";
import { HugeiconsIcon, type HugeiconsIconProps } from "@hugeicons/react";

type ButtonVariant = "primary" | "secondary" | "quiet";
type ButtonSize = "sm" | "md";

export type GlyphButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  icon?: HugeiconsIconProps["icon"];
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function GlyphButton({
  children,
  className,
  icon,
  size = "md",
  type = "button",
  variant = "primary",
  ...props
}: GlyphButtonProps) {
  const classes = [
    "glyph-button",
    `glyph-button--${variant}`,
    `glyph-button--${size}`,
    icon ? "gap-2" : null,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={classes} type={type} {...props}>
      {icon ? (
        <HugeiconsIcon
          aria-hidden="true"
          className="shrink-0"
          focusable="false"
          icon={icon}
          size={size === "sm" ? 16 : 18}
          strokeWidth={1.5}
        />
      ) : null}
      {children}
    </button>
  );
}
