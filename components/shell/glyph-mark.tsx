import Image from "next/image";

type GlyphMarkProps = {
  className?: string;
  contrast?: "default" | "on-ink";
};

export function GlyphMark({ className, contrast = "default" }: GlyphMarkProps) {
  const classes = ["glyph-mark", className].filter(Boolean).join(" ");
  const imageClasses = [
    "glyph-mark__image",
    contrast === "on-ink" ? "glyph-mark__image--on-ink" : null,
  ].filter(Boolean).join(" ");

  return (
    <span className={classes} aria-hidden="true">
      <Image
        className={imageClasses}
        src="/brand/glyph-mark.png"
        alt=""
        width={256}
        height={256}
        priority
      />
    </span>
  );
}

type GlyphBrandProps = GlyphMarkProps & {
  suffix?: string;
};

export function GlyphBrand({ className, suffix }: GlyphBrandProps) {
  const classes = ["glyph-brand", className].filter(Boolean).join(" ");

  return (
    <span className={classes}>
      <GlyphMark className="glyph-brand__mark" />
      <span className="glyph-brand__name">
        <span>glyph</span>
        {suffix ? <span className="glyph-brand__suffix">{suffix}</span> : null}
      </span>
    </span>
  );
}
