import { getSupabaseAdmin, isSupabaseConfigured } from "./supabase";
import type { LookupKind } from "./site-data";

type TargetType = "phone" | "bank_account";

type TargetKeyInput = {
  targetType: TargetType;
  normalized: string;
};

type ViewCountRow = {
  target_key: string;
  target_type: TargetType;
  target_normalized: string;
  total_views: number;
  last_viewed_at: string | null;
};

export type TargetViewStats = {
  totalViews: number;
  lastViewedAt: string | null;
};

type SiteDailyViewRow = {
  view_date: string;
  page_views: number;
};

export type SiteDailyViewStats = {
  date: string;
  pageViews: number;
};

function isMissingViewFunction(message: string) {
  return (
    message.includes("increment_target_page_view") ||
    message.includes("increment_site_daily_page_view") ||
    message.includes("get_target_view_counts") ||
    message.includes("get_site_daily_page_views") ||
    message.includes("target_view_stats") ||
    message.includes("site_daily_page_views") ||
    message.includes("Could not find the function") ||
    message.includes("relation") ||
    message.includes("does not exist")
  );
}

export function toViewTargetType(kind: LookupKind): TargetType {
  return kind === "phone" ? "phone" : "bank_account";
}

export function buildViewTargetKey(targetType: TargetType, normalized: string) {
  return `${targetType}:${normalized}`;
}

export async function recordTargetPageView(
  kind: LookupKind,
  normalized: string,
  locale: string,
  path: string,
) {
  if (!isSupabaseConfigured()) return;

  try {
    const { error } = await getSupabaseAdmin().rpc("increment_target_page_view", {
      p_target_type: toViewTargetType(kind),
      p_target_normalized: normalized,
      p_locale: locale,
      p_path: path,
    });

    if (error) throw error;
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (isMissingViewFunction(message)) return;
    throw error;
  }
}

export async function recordSiteDailyPageView(locale: string, path: string) {
  if (!isSupabaseConfigured()) return;

  try {
    const { error } = await getSupabaseAdmin().rpc("increment_site_daily_page_view", {
      p_locale: locale,
      p_path: path,
    });

    if (error) throw error;
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (isMissingViewFunction(message)) return;
    throw error;
  }
}

export async function getTargetViewCountMap(targets: TargetKeyInput[]) {
  const map = new Map<string, TargetViewStats>();

  if (!isSupabaseConfigured() || targets.length === 0) {
    return map;
  }

  try {
    const keys = targets.map((item) => buildViewTargetKey(item.targetType, item.normalized));
    const { data, error } = await getSupabaseAdmin().rpc("get_target_view_counts", {
      p_target_keys: keys,
    });

    if (error) throw error;

    for (const row of (data ?? []) as ViewCountRow[]) {
      map.set(row.target_key, {
        totalViews: Number(row.total_views ?? 0),
        lastViewedAt: row.last_viewed_at,
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (isMissingViewFunction(message)) return map;
    throw error;
  }

  return map;
}

export async function getSiteDailyPageViews(limit = 7) {
  if (!isSupabaseConfigured()) {
    return [] as SiteDailyViewStats[];
  }

  try {
    const { data, error } = await getSupabaseAdmin().rpc("get_site_daily_page_views", {
      p_limit: limit,
    });

    if (error) throw error;

    return ((data ?? []) as SiteDailyViewRow[]).map((row) => ({
      date: row.view_date,
      pageViews: Number(row.page_views ?? 0),
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (isMissingViewFunction(message)) return [] as SiteDailyViewStats[];
    throw error;
  }
}
