import type { MetadataRoute } from "next";

import { USER_LOCALES } from "@/lib/i18n";
import { buildLocalizedUrl } from "@/lib/seo";
import { getPublicSitemapTargets } from "@/lib/site-repository";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPaths = ["/", "/recent", "/guide", "/terms", "/contact", "/report-guide"];
  const staticEntries = staticPaths.flatMap((path) =>
    USER_LOCALES.map((locale) => ({
      url: buildLocalizedUrl(path, locale),
      lastModified: new Date(),
      changeFrequency: path === "/" ? "daily" : "weekly",
      priority: path === "/" ? 1 : path === "/recent" ? 0.8 : 0.6,
    })),
  );

  const targetEntries = (await getPublicSitemapTargets(1000)).flatMap((item) =>
    USER_LOCALES.map((locale) => ({
      url: buildLocalizedUrl(`/lookup/${item.kind}/${encodeURIComponent(item.normalized)}`, locale),
      lastModified: new Date(item.updatedAt),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  );

  return [...staticEntries, ...targetEntries];
}
