declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

type LookupSearchEvent = {
  lookupKind: "phone" | "account" | "qr";
  queryLength: number;
  source: "search_input" | "qr_image";
};

type TargetEvent = {
  targetType: "phone" | "account" | "qr";
  evaluation?: "spam" | "safe";
  status?: "success" | "pending";
};

function gtagAvailable() {
  return typeof window !== "undefined" && typeof window.gtag === "function";
}

export function trackPageView(path: string, title?: string) {
  if (!gtagAvailable()) return;

  window.gtag?.("event", "page_view", {
    page_path: path,
    page_location: window.location.href,
    page_title: title ?? document.title,
  });
}

export function trackLookupSearch({ lookupKind, queryLength, source }: LookupSearchEvent) {
  if (!gtagAvailable()) return;

  window.gtag?.("event", "search_lookup", {
    lookup_kind: lookupKind,
    query_length: queryLength,
    source,
  });
}

export function trackVoteSubmit({ targetType, evaluation }: TargetEvent) {
  if (!gtagAvailable()) return;

  window.gtag?.("event", "vote_submit", {
    target_type: targetType,
    evaluation,
  });
}

export function trackReportSubmit({ targetType, evaluation, status }: TargetEvent) {
  if (!gtagAvailable()) return;

  window.gtag?.("event", "report_submit", {
    target_type: targetType,
    evaluation,
    status,
  });
}

export function trackCommentSubmit({ targetType }: TargetEvent) {
  if (!gtagAvailable()) return;

  window.gtag?.("event", "comment_submit", {
    target_type: targetType,
  });
}

export function trackDeleteRequestSubmit({ targetType }: TargetEvent) {
  if (!gtagAvailable()) return;

  window.gtag?.("event", "delete_request_submit", {
    target_type: targetType,
  });
}
