import { getSupabaseAdmin, isSupabaseConfigured } from "./supabase";

export type HomeStats = {
  totalReports: number;
  safeTargets: number;
  spamTargets: number;
  todayReports: number;
};

let localStoredStats: HomeStats | null = null;

function isMissingTableError(message: string) {
  return (
    message.includes("relation") ||
    message.includes("does not exist") ||
    message.includes("Could not find the table")
  );
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === "object" && "message" in error) {
    return String(error.message ?? "");
  }

  return "";
}

type VoteStatRow = {
  target_type: "phone" | "bank_account";
  target_normalized: string;
  vote: "spam" | "safe";
};

async function fetchVotesInPages() {
  const supabase = getSupabaseAdmin();
  const rows: VoteStatRow[] = [];
  const pageSize = 1000;

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("votes")
      .select("id, target_type, target_normalized, vote")
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) {
      throw error;
    }

    const page = (data ?? []) as VoteStatRow[];
    rows.push(...page);

    if (page.length < pageSize) {
      break;
    }
  }

  return rows;
}

export async function computeHomeStats(): Promise<HomeStats> {
  const supabase = getSupabaseAdmin();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [
    { count: phoneCount, error: phoneError },
    { count: accountCount, error: accountError },
  ] = await Promise.all([
    supabase.from("phone_numbers").select("normalized_number", { count: "exact", head: true }),
    supabase
      .from("bank_accounts")
      .select("normalized_account_number", { count: "exact", head: true }),
  ]);

  if (phoneError) throw phoneError;
  if (accountError) throw accountError;

  const votes = await fetchVotesInPages();
  const grouped = new Map<string, { spam: number; safe: number }>();

  for (const row of votes) {
    const key = `${row.target_type}-${row.target_normalized}`;
    const current = grouped.get(key) ?? { spam: 0, safe: 0 };

    if (row.vote === "spam") current.spam += 1;
    if (row.vote === "safe") current.safe += 1;

    grouped.set(key, current);
  }

  let safeTargets = 0;
  let spamTargets = 0;

  for (const value of grouped.values()) {
    if (value.spam > value.safe) {
      spamTargets += 1;
    } else if (value.safe > value.spam) {
      safeTargets += 1;
    }
  }

  const todayReports =
    Number(phoneCount ?? 0) + Number(accountCount ?? 0) > 0
      ? await countTodayTargets(todayStart.toISOString())
      : 0;

  return {
    totalReports: Number(phoneCount ?? 0) + Number(accountCount ?? 0),
    safeTargets,
    spamTargets,
    todayReports,
  };
}

async function countTodayTargets(todayIso: string) {
  const supabase = getSupabaseAdmin();
  const [
    { count: phoneCount, error: phoneError },
    { count: accountCount, error: accountError },
  ] = await Promise.all([
    supabase
      .from("phone_numbers")
      .select("normalized_number", { count: "exact", head: true })
      .gte("created_at", todayIso),
    supabase
      .from("bank_accounts")
      .select("normalized_account_number", { count: "exact", head: true })
      .gte("created_at", todayIso),
  ]);

  if (phoneError) throw phoneError;
  if (accountError) throw accountError;

  return Number(phoneCount ?? 0) + Number(accountCount ?? 0);
}

export async function readStoredHomeStats(): Promise<HomeStats | null> {
  if (!isSupabaseConfigured()) {
    return localStoredStats;
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("site_stats")
      .select("total_reports, safe_targets, spam_targets, today_reports")
      .eq("key", "home")
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return localStoredStats;
    }

    return {
      totalReports: data.total_reports ?? 0,
      safeTargets: data.safe_targets ?? 0,
      spamTargets: data.spam_targets ?? 0,
      todayReports: data.today_reports ?? 0,
    };
  } catch (error) {
    const message = getErrorMessage(error);
    if (isMissingTableError(message)) {
      return localStoredStats;
    }

    throw error;
  }
}

export async function refreshStoredHomeStats() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const stats = await computeHomeStats();
  localStoredStats = stats;

  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("site_stats").upsert(
      {
        key: "home",
        total_reports: stats.totalReports,
        safe_targets: stats.safeTargets,
        spam_targets: stats.spamTargets,
        today_reports: stats.todayReports,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" },
    );

    if (error) {
      throw error;
    }
  } catch (error) {
    const message = getErrorMessage(error);
    if (!isMissingTableError(message)) {
      throw error;
    }
  }

  return stats;
}

export function triggerStoredHomeStatsRefresh() {
  void refreshStoredHomeStats().catch(() => {
    // Ignore refresh failures during request completion.
  });
}
