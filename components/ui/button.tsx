import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "quiet";
type ButtonSize = "sm" | "md";

export type GlyphButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function GlyphButton({
  children,
  className,
  size = "md",
  type = "button",
  variant = "primary",
  ...props
}: GlyphButtonProps) {
  const classes = [
    "glyph-button",
    `glyph-button--${variant}`,
    `glyph-button--${size}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={classes} type={type} {...props}>
      {children}
    </button>
  );
}
