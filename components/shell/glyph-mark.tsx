import Image from "next/image";

type GlyphMarkProps = {
  className?: string;
};

export function GlyphMark({ className }: GlyphMarkProps) {
  const classes = ["glyph-mark", className].filter(Boolean).join(" ");

  return (
    <span className={classes} aria-hidden="true">
      <Image
        className="glyph-mark__image"
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
