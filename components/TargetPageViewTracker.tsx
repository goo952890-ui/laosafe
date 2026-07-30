"use client";

import { useEffect, useRef } from "react";

import type { LookupKind } from "@/lib/site-data";

export function TargetPageViewTracker({
  kind,
  normalized,
  locale,
  path,
}: {
  kind: LookupKind;
  normalized: string;
  locale: string;
  path: string;
}) {
  const lastTrackedViewKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const viewKey = `${kind}:${normalized}:${path}`;
    if (lastTrackedViewKeyRef.current === viewKey) return;
    lastTrackedViewKeyRef.current = viewKey;

    fetch("/api/page-views", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        kind,
        normalized,
        locale,
        path,
      }),
      keepalive: true,
    }).catch(() => {});
  }, [kind, normalized, locale, path]);

  return null;
}
