import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/recent", "/lookup/", "/guide", "/terms", "/contact"],
        disallow: ["/admin", "/admin/", "/api/", "/report", "/report/", "/request-delete", "/request-delete/"],
      },
    ],
    sitemap: `${getSiteUrl()}/sitemap.xml`,
    host: getSiteUrl(),
  };
}
