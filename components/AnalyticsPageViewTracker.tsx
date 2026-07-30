"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

import { trackPageView } from "@/lib/analytics";

export function AnalyticsPageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastTrackedPathRef = useRef<string | null>(null);

  useEffect(() => {
    const query = searchParams.toString();
    const path = query ? `${pathname}?${query}` : pathname;

    if (path.startsWith("/admin")) {
      return;
    }

    trackPageView(path, document.title);

    if (typeof window === "undefined") return;
    if (lastTrackedPathRef.current === path) return;
    lastTrackedPathRef.current = path;

    fetch("/api/site-page-views", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        locale: document.documentElement.lang || "lo",
        path,
      }),
      keepalive: true,
    }).catch(() => {});
  }, [pathname, searchParams]);

  return null;
}
