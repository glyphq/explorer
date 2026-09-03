import type { MetadataRoute } from "next";

import { explorerCanonical } from "@/lib/metadata";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: explorerCanonical("/sitemap.xml"),
  };
}
