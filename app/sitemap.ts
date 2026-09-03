import type { MetadataRoute } from "next";

import { explorerCanonical } from "@/lib/metadata";

const PUBLIC_PATHS = ["/", "/tokens", "/rich-list"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_PATHS.map((path) => ({
    url: explorerCanonical(path) ?? path,
    changeFrequency: "hourly",
    priority: path === "/" ? 1 : 0.8,
  }));
}
