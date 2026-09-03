import type { Metadata } from "next";

function configuredSiteUrl(value = process.env.NEXT_PUBLIC_SITE_URL): URL | undefined {
  if (!value) return undefined;

  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url : undefined;
  } catch {
    return undefined;
  }
}

export function explorerMetadataBase(): URL | undefined {
  return configuredSiteUrl();
}

export function explorerCanonical(path: string): string | undefined {
  const base = configuredSiteUrl();
  if (!base) return undefined;
  return new URL(path, base).toString();
}

export function explorerPageMetadata(
  title: string,
  description: string,
  pathname?: string,
): Metadata {
  const canonical = pathname ? explorerCanonical(pathname) : undefined;

  return {
    title,
    description,
    alternates: canonical ? { canonical } : undefined,
    openGraph: {
      title: `${title} | Glyph Explorer`,
      description,
      type: "website",
      url: canonical,
      siteName: "Glyph Explorer",
    },
    twitter: {
      card: "summary",
      title: `${title} | Glyph Explorer`,
      description,
    },
  };
}
