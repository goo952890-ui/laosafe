import {
  accountTargets,
  abuseSignals,
  deletionRequests,
  phoneTargets,
  type AccountTarget,
  type CommentRecord,
  type DeletionRequestSeed,
  type LookupKind,
  type SearchTarget,
} from "./site-data";
import type {
  AdminDeletedTargetRow,
  AdminDeletionRequestRow,
  AdminEvaluationRow,
  AdminSecurityLogRow,
} from "./admin-types";
import { parseEvaluationMeta } from "./evaluation-meta";
import {
  computeHomeStats,
  readStoredHomeStats,
  refreshStoredHomeStats,
  type HomeStats,
} from "./site-stats";
import {
  buildViewTargetKey,
  getSiteDailyPageViews,
  getTargetViewCountMap,
  type TargetViewStats,
} from "./page-views";
import {
  extractAccountFromQrPayload,
  extractQrPayload,
  formatAccountDisplay,
  formatPhoneDisplay,
  getPhoneLookupVariants,
  normalizeAccountLookupKey,
  normalizePhone,
} from "./site-utils";
import { getSupabaseAdmin, isSupabaseConfigured } from "./supabase";

type EvaluationRow = AdminEvaluationRow;

type PhoneRow = {
  normalized_number: string;
  display_number: string;
  created_at?: string;
  updated_at?: string;
};

type AccountRow = {
  normalized_account_number: string;
  display_account_number: string;
  bank_name: string | null;
  recipient_name: string | null;
  masked_recipient_name: string | null;
  created_at?: string;
  updated_at?: string;
};

type QrScanRow = {
  extracted_account_number: string | null;
  qr_payload: string | null;
  created_at: string;
};

type VoteRow = {
  id: number;
  target_type: "phone" | "bank_account";
  target_normalized: string;
  target_display: string;
  vote: "spam" | "safe";
  ip_hash: string;
  encrypted_ip?: string | null;
  created_at: string;
  updated_at?: string;
};

type DeletionRequestRow = Omit<AdminDeletionRequestRow, "created_at">;
type DeletedTargetRow = AdminDeletedTargetRow;

const HOME_STATS_TTL_MS = 60_000;
const RECENT_TARGETS_TTL_MS = 30_000;

let homeStatsCache: { value: HomeStats; expiresAt: number } | null = null;
let recentTargetsCache:
  | {
      value: { target: SearchTarget; latest: CommentRecord }[];
      expiresAt: number;
    }
  | null = null;

function normalizeAccountLookup(input: string) {
  return normalizeAccountLookupKey(input);
}

function normalizeForKind(kind: LookupKind, rawQuery: string) {
  return kind === "phone" ? normalizePhone(rawQuery) : normalizeAccountLookup(rawQuery);
}

function canonicalTargetNormalized(row: Pick<EvaluationRow, "target_type" | "target_normalized">) {
  return row.target_type === "phone" ? normalizePhone(row.target_normalized) : row.target_normalized;
}

function mapComment(row: EvaluationRow): CommentRecord {
  const meta = parseEvaluationMeta(row.user_agent);

  return {
    id: String(row.id),
    tone: row.evaluation,
    text: row.comment ?? "",
    createdAt: row.created_at.slice(0, 10),
    nickname: meta.nickname,
    isAdmin: meta.isAdmin,
  };
}

function fallbackFindTarget(kind: LookupKind, rawQuery: string) {
  const normalized = normalizeForKind(kind, rawQuery);
  const source = kind === "phone" ? phoneTargets : accountTargets;
  const found = source.find((target) => target.normalized === normalized) ?? null;

  return {
    normalized,
    found,
    display: kind === "phone" ? formatPhoneDisplay(normalized) : formatAccountDisplay(normalized),
  };
}

function buildPhoneTarget(
  row: PhoneRow,
  evaluations: EvaluationRow[],
  votes?: { spam: number; safe: number },
): SearchTarget {
  return {
    kind: "phone",
    normalized: row.normalized_number,
    display: formatPhoneDisplay(row.normalized_number),
    comments: evaluations.map(mapComment),
    spamVotes: votes?.spam ?? 0,
    safeVotes: votes?.safe ?? 0,
  };
}

function buildAccountTarget(
  row: AccountRow,
  evaluations: EvaluationRow[],
  votes?: { spam: number; safe: number },
  qrPayload?: string | null,
): SearchTarget {
  return {
    kind: "account",
    normalized: row.normalized_account_number,
    display: formatAccountDisplay(row.normalized_account_number),
    bankName: row.bank_name ?? undefined,
    recipientName: row.recipient_name ?? row.masked_recipient_name ?? undefined,
    qrPayload: qrPayload ?? undefined,
    comments: evaluations.map(mapComment),
    spamVotes: votes?.spam ?? 0,
    safeVotes: votes?.safe ?? 0,
  };
}

function buildVoteKey(
  targetType: "phone" | "bank_account",
  targetNormalized: string,
) {
  const normalized =
    targetType === "phone" ? normalizePhone(targetNormalized) : targetNormalized;
  return `${targetType}-${normalized}`;
}

async function fetchVoteCountsByKeys(
  phoneKeys: string[],
  accountKeys: string[],
): Promise<Map<string, { spam: number; safe: number }>> {
  const map = new Map<string, { spam: number; safe: number }>();

  if (!isSupabaseConfigured() || (phoneKeys.length === 0 && accountKeys.length === 0)) {
    return map;
  }

  const supabase = getSupabaseAdmin();
  try {
    const results = await Promise.all([
      phoneKeys.length > 0
        ? supabase
            .from("votes")
            .select("id, target_type, target_normalized, target_display, vote, ip_hash, encrypted_ip, created_at, updated_at")
            .eq("target_type", "phone")
            .in("target_normalized", phoneKeys)
        : Promise.resolve({ data: [] as VoteRow[], error: null }),
      accountKeys.length > 0
        ? supabase
            .from("votes")
            .select("id, target_type, target_normalized, target_display, vote, ip_hash, encrypted_ip, created_at, updated_at")
            .eq("target_type", "bank_account")
            .in("target_normalized", accountKeys)
        : Promise.resolve({ data: [] as VoteRow[], error: null }),
    ]);

    for (const result of results) {
      if (result.error) {
        throw new Error(result.error.message);
      }

      for (const row of (result.data ?? []) as VoteRow[]) {
        const key = buildVoteKey(row.target_type, row.target_normalized);
        const current = map.get(key) ?? { spam: 0, safe: 0 };
        if (row.vote === "spam") current.spam += 1;
        if (row.vote === "safe") current.safe += 1;
        map.set(key, current);
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (isMissingTableError(message)) {
      return map;
    }

    throw error;
  }

  return map;
}

async function fetchVoteCountsForLookup(kind: LookupKind, rawQuery: string, normalized: string) {
  if (!isSupabaseConfigured()) {
    return { spam: 0, safe: 0 };
  }

  const phoneKeys = kind === "phone" ? getPhoneLookupVariants(rawQuery).map(normalizePhone) : [];
  const accountKeys = kind === "account" ? [normalized] : [];
  const map = await fetchVoteCountsByKeys([...new Set(phoneKeys)], accountKeys);
  const key = kind === "phone" ? `phone-${normalized}` : `bank_account-${normalized}`;
  return map.get(key) ?? { spam: 0, safe: 0 };
}

function mapDeletionStatus(
  status: DeletionRequestRow["status"],
): DeletionRequestSeed["status"] | "처리 완료" | "삭제 거절" {
  switch (status) {
    case "reviewing":
      return "검토 중";
    case "resolved":
      return "처리 완료";
    case "rejected":
      return "삭제 거절";
    default:
      return "접수됨";
  }
}

async function fetchTargetMap(
  rows: EvaluationRow[],
): Promise<Map<string, SearchTarget>> {
  const map = new Map<string, SearchTarget>();

  if (!isSupabaseConfigured()) {
    for (const target of [...phoneTargets, ...accountTargets]) {
      map.set(`${target.kind}-${target.normalized}`, target);
    }

    return map;
  }

  const supabase = getSupabaseAdmin();
  const phoneKeys = [
    ...new Set(
      rows
        .filter((row) => row.target_type === "phone")
        .map((row) => normalizePhone(row.target_normalized)),
    ),
  ];
  const accountKeys = [...new Set(rows.filter((row) => row.target_type === "bank_account").map((row) => row.target_normalized))];
  const qrPayloadMap = new Map<string, string>();
  const voteMap = await fetchVoteCountsByKeys(phoneKeys, accountKeys);

  if (phoneKeys.length > 0) {
    const { data } = await supabase
      .from("phone_numbers")
      .select("normalized_number, display_number")
      .in("normalized_number", phoneKeys);

    for (const row of (data ?? []) as PhoneRow[]) {
      const evaluations = rows
        .filter(
          (item) =>
            item.target_type === "phone" &&
            normalizePhone(item.target_normalized) === row.normalized_number,
        )
        .sort((a, b) => b.created_at.localeCompare(a.created_at));
      map.set(
        `phone-${row.normalized_number}`,
        buildPhoneTarget(row, evaluations, voteMap.get(`phone-${row.normalized_number}`)),
      );
    }
  }

  if (accountKeys.length > 0) {
    const [{ data }, { data: qrRows }] = await Promise.all([
      supabase
        .from("bank_accounts")
        .select(
          "normalized_account_number, display_account_number, bank_name, recipient_name, masked_recipient_name",
        )
        .in("normalized_account_number", accountKeys),
      supabase
        .from("qr_scans")
        .select("extracted_account_number, qr_payload, created_at")
        .in("extracted_account_number", accountKeys)
        .order("created_at", { ascending: false }),
    ]);

    for (const row of (qrRows ?? []) as QrScanRow[]) {
      if (row.extracted_account_number && row.qr_payload && !qrPayloadMap.has(row.extracted_account_number)) {
        qrPayloadMap.set(row.extracted_account_number, row.qr_payload);
      }
    }

    for (const row of (data ?? []) as AccountRow[]) {
      const evaluations = rows
        .filter(
          (item) =>
            item.target_type === "bank_account" &&
            item.target_normalized === row.normalized_account_number,
        )
        .sort((a, b) => b.created_at.localeCompare(a.created_at));
      map.set(
        `account-${row.normalized_account_number}`,
        buildAccountTarget(
          row,
          evaluations,
          voteMap.get(`bank_account-${row.normalized_account_number}`),
          qrPayloadMap.get(row.normalized_account_number),
        ),
      );
    }
  }

  return map;
}

function isMissingTableError(message: string) {
  return (
    message.includes("relation") ||
    message.includes("does not exist") ||
    message.includes("Could not find the table")
  );
}

export function invalidateSiteRepositoryCaches() {
  homeStatsCache = null;
  recentTargetsCache = null;
}

export async function findTarget(kind: LookupKind, rawQuery: string) {
  if (!isSupabaseConfigured()) {
    const fallback = fallbackFindTarget(kind, rawQuery);
    return {
      ...fallback,
      hidden: false,
      suggestions: getFallbackSuggestions(kind, fallback.normalized),
    };
  }

  const supabase = getSupabaseAdmin();
  const normalized = normalizeForKind(kind, rawQuery);

  try {
    if (kind === "phone") {
      const phoneVariants = getPhoneLookupVariants(rawQuery);
      const [{ data: phone }, { data: evaluations }, voteCounts, hiddenTarget] = await Promise.all([
        supabase
          .from("phone_numbers")
          .select("normalized_number, display_number")
          .eq("normalized_number", normalized)
          .maybeSingle(),
        supabase
          .from("evaluations")
          .select("id, target_type, target_normalized, target_display, evaluation, comment, user_agent, device_fingerprint, created_at, status")
          .eq("target_type", "phone")
          .in("target_normalized", phoneVariants)
          .eq("status", "visible")
          .order("created_at", { ascending: false }),
        fetchVoteCountsForLookup("phone", rawQuery, normalized),
        hasHiddenTargetAny(rawQuery, "phone"),
      ]);

      return {
        normalized,
        hidden: hiddenTarget,
        found: phone
          ? buildPhoneTarget(phone as PhoneRow, (evaluations ?? []) as EvaluationRow[], voteCounts)
          : null,
        display: phone?.display_number ?? formatPhoneDisplay(normalized),
        suggestions: phone ? [] : await getLookupSuggestions("phone", normalized),
      };
    }

    const qrPayloadFromInput = extractQrPayload(rawQuery);
    const [{ data: account }, { data: evaluations }, { data: qrRows }, voteCounts, hiddenTarget] = await Promise.all([
      supabase
        .from("bank_accounts")
        .select(
          "normalized_account_number, display_account_number, bank_name, recipient_name, masked_recipient_name",
        )
        .eq("normalized_account_number", normalized)
        .maybeSingle(),
      supabase
        .from("evaluations")
        .select("id, target_type, target_normalized, target_display, evaluation, comment, user_agent, device_fingerprint, created_at, status")
        .eq("target_type", "bank_account")
        .eq("target_normalized", normalized)
        .eq("status", "visible")
        .order("created_at", { ascending: false }),
      supabase
        .from("qr_scans")
        .select("extracted_account_number, qr_payload, created_at")
        .eq("extracted_account_number", normalized)
        .order("created_at", { ascending: false })
        .limit(1),
      fetchVoteCountsForLookup("account", rawQuery, normalized),
      hasHiddenTargetAny(rawQuery, "account"),
    ]);

    return {
      normalized,
      hidden: hiddenTarget,
      found: account
        ? buildAccountTarget(
            account as AccountRow,
            (evaluations ?? []) as EvaluationRow[],
            voteCounts,
            qrPayloadFromInput ?? ((qrRows?.[0] as QrScanRow | undefined)?.qr_payload ?? null),
          )
        : null,
      display: account?.display_account_number ?? formatAccountDisplay(normalized),
      suggestions: account ? [] : await getLookupSuggestions("account", normalized),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (isMissingTableError(message)) {
      const fallback = fallbackFindTarget(kind, rawQuery);
      return {
        ...fallback,
        hidden: false,
        suggestions: getFallbackSuggestions(kind, fallback.normalized),
      };
    }
    throw error;
  }
}

export async function resolveUnifiedLookup(rawQuery: string) {
  const [phoneResult, accountResult] = await Promise.all([
    findTarget("phone", rawQuery),
    findTarget("account", rawQuery),
  ]);

  const exactMatches: Array<{ kind: LookupKind; normalized: string; display: string }> = [];

  if (phoneResult.found || phoneResult.hidden) {
    exactMatches.push({
      kind: "phone",
      normalized: phoneResult.normalized,
      display: phoneResult.found?.display ?? phoneResult.display,
    });
  }

  if (accountResult.found || accountResult.hidden) {
    exactMatches.push({
      kind: "account",
      normalized: accountResult.normalized,
      display: accountResult.found?.display ?? accountResult.display,
    });
  }

  const suggestionMap = new Map<string, { kind: LookupKind; normalized: string; display: string }>();

  for (const item of [...exactMatches, ...phoneResult.suggestions, ...accountResult.suggestions]) {
    suggestionMap.set(`${item.kind}-${item.normalized}`, item);
  }

  return {
    exactMatches,
    suggestions: [...suggestionMap.values()],
  };
}

async function getLookupSuggestions(kind: LookupKind, normalized: string) {
  if (normalized.length < 5) {
    return [] as Array<{ kind: LookupKind; normalized: string; display: string }>;
  }

  if (kind === "account" && normalized.startsWith("qr:")) {
    return [] as Array<{ kind: LookupKind; normalized: string; display: string }>;
  }

  const supabase = getSupabaseAdmin();
  const [phoneResult, accountResult] = await Promise.all([
    supabase
      .from("phone_numbers")
      .select("normalized_number, display_number")
      .like("normalized_number", `%${normalized}%`)
      .order("normalized_number")
      .limit(8),
    supabase
      .from("bank_accounts")
      .select("normalized_account_number, display_account_number")
      .like("normalized_account_number", `%${normalized}%`)
      .order("normalized_account_number")
      .limit(8),
  ]);

  if (phoneResult.error) throw phoneResult.error;
  if (accountResult.error) throw accountResult.error;

  const candidatePhoneKeys = ((phoneResult.data ?? []) as PhoneRow[]).map((row) => row.normalized_number);
  const candidateAccountKeys = ((accountResult.data ?? []) as AccountRow[]).map(
    (row) => row.normalized_account_number,
  );
  const hiddenKeys = await getHiddenTargetKeys(candidatePhoneKeys, candidateAccountKeys);

  const phoneSuggestions = ((phoneResult.data ?? []) as PhoneRow[])
    .filter((row) => !hiddenKeys.has(`phone-${row.normalized_number}`))
    .filter((row) => !(kind === "phone" && row.normalized_number === normalized))
    .map((row) => ({
      kind: "phone" as const,
      normalized: row.normalized_number,
      display: formatPhoneDisplay(row.normalized_number),
    }));

  const accountSuggestions = ((accountResult.data ?? []) as AccountRow[])
    .filter((row) => !hiddenKeys.has(`bank_account-${row.normalized_account_number}`))
    .filter((row) => !(kind === "account" && row.normalized_account_number === normalized))
    .map((row) => ({
      kind: "account" as const,
      normalized: row.normalized_account_number,
      display: formatAccountDisplay(row.normalized_account_number),
    }));

  return [...phoneSuggestions, ...accountSuggestions].slice(0, 8);
}

function getFallbackSuggestions(kind: LookupKind, normalized: string) {
  if (normalized.length < 5) {
    return [] as Array<{ kind: LookupKind; normalized: string; display: string }>;
  }

  const source = [...phoneTargets, ...accountTargets];

  return source
    .filter((target) => {
      if (target.kind === kind && target.normalized === normalized) {
        return false;
      }

      return target.normalized.includes(normalized);
    })
    .slice(0, 8)
    .map((target) => ({
      kind: target.kind,
      normalized: target.normalized,
      display: target.display,
    }));
}

export async function getRecentTargets() {
  if (!isSupabaseConfigured()) {
    return [...phoneTargets, ...accountTargets]
      .map((target) => ({
        target,
        latest: [...target.comments].sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0],
      }))
      .sort((a, b) => b.latest.createdAt.localeCompare(a.latest.createdAt));
  }

  if (recentTargetsCache && recentTargetsCache.expiresAt > Date.now()) {
    return recentTargetsCache.value;
  }

  const supabase = getSupabaseAdmin();

  try {
    const [phoneRowsResult, accountRowsResult, evaluationRowsResult, hiddenEvaluationsResult] = await Promise.all([
      supabase
        .from("phone_numbers")
        .select("normalized_number, display_number, created_at, updated_at")
        .order("created_at", { ascending: false })
        .limit(40),
      supabase
        .from("bank_accounts")
        .select(
          "normalized_account_number, display_account_number, bank_name, recipient_name, masked_recipient_name, created_at, updated_at",
        )
        .order("created_at", { ascending: false })
        .limit(40),
      supabase
        .from("evaluations")
        .select(
          "id, target_type, target_normalized, target_display, evaluation, comment, user_agent, device_fingerprint, created_at, status",
        )
        .eq("status", "visible")
        .not("comment", "eq", "")
        .order("created_at", { ascending: true }),
      supabase
        .from("evaluations")
        .select("target_type, target_normalized")
        .in("status", ["hidden"]),
    ]);

    if (phoneRowsResult.error) throw phoneRowsResult.error;
    if (accountRowsResult.error) throw accountRowsResult.error;
    if (evaluationRowsResult.error) throw evaluationRowsResult.error;
    if (hiddenEvaluationsResult.error) throw hiddenEvaluationsResult.error;

    const phoneRows = (phoneRowsResult.data ?? []) as PhoneRow[];
    const accountRows = (accountRowsResult.data ?? []) as AccountRow[];
    const hiddenKeys = new Set(
      ((hiddenEvaluationsResult.data ?? []) as Array<Pick<AdminEvaluationRow, "target_type" | "target_normalized">>).map(
        (row) => `${row.target_type}-${canonicalTargetNormalized(row)}`,
      ),
    );
    const targetRows = [
      ...phoneRows.map((row) => ({
        kind: "phone" as const,
        normalized: row.normalized_number,
        createdAt: row.created_at ?? row.updated_at ?? "",
        row,
      })),
      ...accountRows.map((row) => ({
        kind: "account" as const,
        normalized: row.normalized_account_number,
        createdAt: row.created_at ?? row.updated_at ?? "",
        row,
      })),
    ]
      .filter((item) => !hiddenKeys.has(item.kind === "phone" ? `phone-${item.normalized}` : `bank_account-${item.normalized}`))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 40);

    const rows = (evaluationRowsResult.data ?? []) as EvaluationRow[];
    const firstReportsByKey = new Map<string, EvaluationRow>();

    for (const row of rows) {
      const key = `${row.target_type}-${canonicalTargetNormalized(row)}`;
      if (!firstReportsByKey.has(key)) {
        firstReportsByKey.set(key, row);
      }
    }

    const voteMap = await fetchVoteCountsByKeys(
      targetRows.filter((item) => item.kind === "phone").map((item) => item.normalized),
      targetRows.filter((item) => item.kind === "account").map((item) => item.normalized),
    );

    const result = targetRows
      .map((item) => {
        const reportKey = item.kind === "phone" ? `phone-${item.normalized}` : `bank_account-${item.normalized}`;
        const firstReport = firstReportsByKey.get(reportKey);
        const target =
          item.kind === "phone"
            ? buildPhoneTarget(
                item.row as PhoneRow,
                firstReport ? [firstReport] : [],
                voteMap.get(`phone-${item.normalized}`),
              )
            : buildAccountTarget(
                item.row as AccountRow,
                firstReport ? [firstReport] : [],
                voteMap.get(`bank_account-${item.normalized}`),
              );

        return {
          target,
          latest: firstReport
            ? mapComment(firstReport)
            : {
                id: `registered-${item.kind}-${item.normalized}`,
                tone: "safe" as const,
                text: "",
                createdAt: item.createdAt.slice(0, 10),
              },
        };
      })
      .filter((entry): entry is { target: SearchTarget; latest: CommentRecord } => Boolean(entry));

    recentTargetsCache = {
      value: result,
      expiresAt: Date.now() + RECENT_TARGETS_TTL_MS,
    };

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (isMissingTableError(message)) {
      return [...phoneTargets, ...accountTargets]
        .map((target) => ({
          target,
          latest: [...target.comments].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0],
        }))
        .sort((a, b) => b.latest.createdAt.localeCompare(a.latest.createdAt));
    }
    throw error;
  }
}

export async function getPublicSitemapTargets(limit = 50_000) {
  if (!isSupabaseConfigured()) {
    return [...phoneTargets, ...accountTargets].slice(0, limit).map((target) => ({
      kind: target.kind,
      normalized: target.normalized,
      updatedAt:
        [...target.comments]
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]?.createdAt ?? "2026-07-30",
    }));
  }

  const supabase = getSupabaseAdmin();
  const [phoneRowsResult, accountRowsResult] = await Promise.all([
    supabase
      .from("phone_numbers")
      .select("normalized_number, updated_at, created_at")
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("bank_accounts")
      .select("normalized_account_number, updated_at, created_at")
      .order("created_at", { ascending: false })
      .limit(limit),
  ]);

  if (phoneRowsResult.error) throw phoneRowsResult.error;
  if (accountRowsResult.error) throw accountRowsResult.error;

  const phoneKeys = ((phoneRowsResult.data ?? []) as Array<Pick<PhoneRow, "normalized_number">>).map(
    (row) => row.normalized_number,
  );
  const accountKeys = ((accountRowsResult.data ?? []) as Array<Pick<AccountRow, "normalized_account_number">>).map(
    (row) => row.normalized_account_number,
  );
  const hiddenKeys = await getHiddenTargetKeys(phoneKeys, accountKeys);

  const phoneItems = ((phoneRowsResult.data ?? []) as Array<Pick<PhoneRow, "normalized_number" | "updated_at" | "created_at">>)
    .filter((row) => !hiddenKeys.has(`phone-${row.normalized_number}`))
    .map((row) => ({
      kind: "phone" as const,
      normalized: row.normalized_number,
      updatedAt: row.updated_at ?? row.created_at ?? "2026-07-30",
    }));

  const accountItems = ((accountRowsResult.data ?? []) as Array<Pick<AccountRow, "normalized_account_number" | "updated_at" | "created_at">>)
    .filter((row) => !hiddenKeys.has(`bank_account-${row.normalized_account_number}`))
    .map((row) => ({
      kind: "account" as const,
      normalized: row.normalized_account_number,
      updatedAt: row.updated_at ?? row.created_at ?? "2026-07-30",
    }));

  return [...phoneItems, ...accountItems]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, limit);
}

async function getHiddenTargetKeys(phoneKeys: string[], accountKeys: string[]) {
  const hiddenKeys = new Set<string>();

  if (!isSupabaseConfigured() || (phoneKeys.length === 0 && accountKeys.length === 0)) {
    return hiddenKeys;
  }

  const supabase = getSupabaseAdmin();
  const queries = [];

  if (phoneKeys.length > 0) {
    queries.push(
      supabase
        .from("evaluations")
        .select("target_type, target_normalized")
        .eq("target_type", "phone")
        .in("target_normalized", phoneKeys)
        .in("status", ["hidden"]),
    );
  }

  if (accountKeys.length > 0) {
    queries.push(
      supabase
        .from("evaluations")
        .select("target_type, target_normalized")
        .eq("target_type", "bank_account")
        .in("target_normalized", accountKeys)
        .in("status", ["hidden"]),
    );
  }

  const results = await Promise.all(queries);

  for (const result of results) {
    if (result.error) throw result.error;
    for (const row of (result.data ?? []) as Array<Pick<AdminEvaluationRow, "target_type" | "target_normalized">>) {
      hiddenKeys.add(`${row.target_type}-${canonicalTargetNormalized(row)}`);
    }
  }

  return hiddenKeys;
}

export async function getDeletionRequests() {
  if (!isSupabaseConfigured()) {
    return deletionRequests;
  }

  const supabase = getSupabaseAdmin();

  try {
    const { data, error } = await supabase
      .from("deletion_requests")
      .select("id, target_type, target_label, reason, description, contact, status")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) throw error;

    return ((data ?? []) as DeletionRequestRow[]).map((row) => ({
      id: String(row.id),
      targetLabel: row.target_label,
      reason: row.reason,
      detail: row.description,
      contact: row.contact,
      status: mapDeletionStatus(row.status),
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (isMissingTableError(message)) {
      return deletionRequests;
    }
    throw error;
  }
}

export function getAbuseSignals() {
  return abuseSignals;
}

export async function getAdminEvaluations() {
  if (!isSupabaseConfigured()) {
    return [] as AdminEvaluationRow[];
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("evaluations")
    .select(
      "id, target_type, target_normalized, target_display, evaluation, comment, ip_hash, encrypted_ip, user_agent, device_fingerprint, created_at, status",
    )
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw error;

  return (data ?? []) as AdminEvaluationRow[];
}

export async function getAdminDeletedTargets() {
  if (!isSupabaseConfigured()) {
    return [] as DeletedTargetRow[];
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("deleted_targets")
    .select("id, target_type, target_normalized, target_display, evaluation, first_comment, reported_at, deleted_at")
    .order("deleted_at", { ascending: false })
    .limit(200);

  if (error) {
    if (isMissingTableError(error.message)) {
      return [] as DeletedTargetRow[];
    }

    throw error;
  }

  return (data ?? []) as DeletedTargetRow[];
}

export async function getAdminDeletedTargetDetail(id: number) {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("deleted_targets")
    .select(
      "id, target_type, target_normalized, target_display, evaluation, first_comment, reported_at, deleted_at, archived_payload",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    if (isMissingTableError(error.message)) {
      return null;
    }

    throw error;
  }

  if (!data) {
    return null;
  }

  const row = data as DeletedTargetRow;
  const archivedEvaluations = (row.archived_payload?.evaluations ?? [])
    .filter((item) => (item.comment ?? "").trim().length > 0)
    .sort((a, b) => (a.created_at ?? "").localeCompare(b.created_at ?? ""));
  const firstReport =
    archivedEvaluations[0] ??
    (row.first_comment
      ? {
          comment: row.first_comment,
          created_at: row.reported_at ?? null,
          evaluation: row.evaluation ?? undefined,
          encrypted_ip: null,
          ip_hash: null,
          user_agent: null,
        }
      : null);

  return {
    ...row,
    firstReport,
    comments: archivedEvaluations.slice(firstReport && archivedEvaluations[0] ? 1 : 0).map((item) => ({
      ...item,
      meta: parseEvaluationMeta(item.user_agent),
    })),
    deletionRequests: row.archived_payload?.deletionRequests ?? [],
  };
}

export async function getAdminDeletionRequests() {
  if (!isSupabaseConfigured()) {
    return [] as AdminDeletionRequestRow[];
  }

  const supabase = getSupabaseAdmin();
  const [{ data, error }, { data: hiddenRows, error: hiddenError }] = await Promise.all([
    supabase
      .from("deletion_requests")
      .select("id, target_type, target_label, reason, description, contact, status, created_at")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("evaluations")
      .select("target_type, target_normalized")
      .in("status", ["hidden"]),
  ]);

  if (error) throw error;
  if (hiddenError) throw hiddenError;

  const hiddenKeys = new Set(
    ((hiddenRows ?? []) as Array<Pick<AdminEvaluationRow, "target_type" | "target_normalized">>).map(
      (row) => `${row.target_type}-${canonicalTargetNormalized(row)}`,
    ),
  );

  return ((data ?? []) as AdminDeletionRequestRow[]).map((row) => {
    const normalized =
      row.target_type === "phone"
        ? normalizePhone(row.target_label)
        : normalizeAccountLookupKey(row.target_label);

    return {
      ...row,
      target_hidden: hiddenKeys.has(`${row.target_type}-${normalized}`),
    };
  });
}

export async function getAdminSecurityLogs(
  logType: "input_validation_failed" | "abnormal_ip_blocked",
) {
  if (!isSupabaseConfigured()) {
    return [] as AdminSecurityLogRow[];
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("security_logs")
    .select("id, log_type, source, target_type, target_value, ip, identity_key, detail, created_at")
    .eq("log_type", logType)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    if (isMissingTableError(error.message)) {
      return [] as AdminSecurityLogRow[];
    }

    throw error;
  }

  return (data ?? []) as AdminSecurityLogRow[];
}

export async function getAdminDashboardData() {
  const [evaluations, deletionRequests, phoneRows, accountRows, homeStats, hiddenEvaluations] = await Promise.all([
    getAdminEvaluations(),
    getAdminDeletionRequests(),
    isSupabaseConfigured()
      ? getSupabaseAdmin()
          .from("phone_numbers")
          .select("normalized_number, display_number, created_at, updated_at")
          .order("created_at", { ascending: false })
          .limit(100)
      : Promise.resolve({ data: [] as PhoneRow[], error: null }),
    isSupabaseConfigured()
      ? getSupabaseAdmin()
          .from("bank_accounts")
          .select(
            "normalized_account_number, display_account_number, bank_name, recipient_name, masked_recipient_name, created_at, updated_at",
          )
          .order("created_at", { ascending: false })
          .limit(100)
      : Promise.resolve({ data: [] as AccountRow[], error: null }),
    getHomeStats(),
    isSupabaseConfigured()
      ? getSupabaseAdmin()
          .from("evaluations")
          .select("target_type, target_normalized")
          .in("status", ["hidden"])
      : Promise.resolve({ data: [] as Pick<AdminEvaluationRow, "target_type" | "target_normalized">[], error: null }),
  ]);

  const hiddenTargetKeys = new Set(
    ((hiddenEvaluations.data ?? []) as Array<Pick<AdminEvaluationRow, "target_type" | "target_normalized">>).map(
      (row) => `${row.target_type}-${row.target_normalized}`,
    ),
  );
  const targetMetaMap = buildAdminTargetMetaMap(evaluations);

  const targets = [
    ...((phoneRows.data ?? []) as PhoneRow[]).map((row) => ({
      kind: "phone" as const,
      normalized: row.normalized_number,
      number: formatPhoneDisplay(row.normalized_number),
      latestCreatedAt: row.created_at ?? row.updated_at ?? "",
      ...getAdminTargetMeta("phone", row.normalized_number, targetMetaMap),
    })),
    ...((accountRows.data ?? []) as AccountRow[]).map((row) => ({
      kind: "account" as const,
      normalized: row.normalized_account_number,
      number: formatAccountDisplay(row.normalized_account_number),
      latestCreatedAt: row.created_at ?? row.updated_at ?? "",
      ...getAdminTargetMeta("bank_account", row.normalized_account_number, targetMetaMap),
    })),
  ]
    .sort((a, b) => b.latestCreatedAt.localeCompare(a.latestCreatedAt))
    .slice(0, 5);
  const targetViewMap = await getTargetViewCountMap(
    targets.map((item) => ({
      targetType: item.kind === "phone" ? "phone" : "bank_account",
      normalized: item.normalized,
    })),
  );
  const siteDailyViews = await getSiteDailyPageViews(7);

  return {
    stats: {
      totalRegistered: homeStats.totalReports,
      todayRegistered: homeStats.todayReports,
      hiddenTargets: hiddenTargetKeys.size,
      spamTargets: homeStats.spamTargets,
      safeTargets: homeStats.safeTargets,
    },
    targets: targets.map((item) => {
      const key = buildViewTargetKey(item.kind === "phone" ? "phone" : "bank_account", item.normalized);
      const viewStats = targetViewMap.get(key) ?? emptyViewStats();

      return {
        ...item,
        viewCount: viewStats.totalViews,
      };
    }),
    siteDailyViews,
    recentComments: evaluations
      .filter((row) => row.comment.trim().length > 0)
      .slice(0, 5),
    safeRequests: evaluations.filter(isPendingSafeApprovalRow).slice(0, 5),
    deletionRequests: deletionRequests.slice(0, 5),
    objections: deletionRequests.filter((request) => request.reason.includes("이의")).slice(0, 5),
  };
}

export async function getAdminListPage(
  section:
    | "targets"
    | "deleted-targets"
    | "comments"
    | "safe-requests"
    | "requests"
    | "objections"
    | "input-failures"
    | "abnormal-ips",
  page: number,
  pageSize = 10,
) {
  const safePage = Math.max(1, page);

  if (section === "targets") {
    const [phoneRows, accountRows, evaluations] = await Promise.all([
      isSupabaseConfigured()
        ? getSupabaseAdmin()
            .from("phone_numbers")
            .select("normalized_number, display_number, created_at, updated_at")
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [] as PhoneRow[], error: null }),
      isSupabaseConfigured()
        ? getSupabaseAdmin()
            .from("bank_accounts")
            .select(
              "normalized_account_number, display_account_number, bank_name, recipient_name, masked_recipient_name, created_at, updated_at",
            )
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [] as AccountRow[], error: null }),
      getAdminEvaluations(),
    ]);
    const targetMetaMap = buildAdminTargetMetaMap(evaluations);

    const items = [
      ...((phoneRows.data ?? []) as PhoneRow[]).map((row) => ({
        kind: "phone" as const,
        normalized: row.normalized_number,
        number: formatPhoneDisplay(row.normalized_number),
        createdAt: row.created_at ?? row.updated_at ?? "",
        ...getAdminTargetMeta("phone", row.normalized_number, targetMetaMap),
      })),
      ...((accountRows.data ?? []) as AccountRow[]).map((row) => ({
        kind: "account" as const,
        normalized: row.normalized_account_number,
        number: formatAccountDisplay(row.normalized_account_number),
        createdAt: row.created_at ?? row.updated_at ?? "",
        ...getAdminTargetMeta("bank_account", row.normalized_account_number, targetMetaMap),
      })),
    ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const targetViewMap = await getTargetViewCountMap(
      items.map((item) => ({
        targetType: item.kind === "phone" ? "phone" : "bank_account",
        normalized: item.normalized,
      })),
    );

    return {
      title: "등록된 번호",
      totalPages: Math.max(1, Math.ceil(items.length / pageSize)),
      items: items.slice((safePage - 1) * pageSize, safePage * pageSize).map((item) => {
        const key = buildViewTargetKey(item.kind === "phone" ? "phone" : "bank_account", item.normalized);
        const viewStats = targetViewMap.get(key) ?? emptyViewStats();

        return {
          ...item,
          viewCount: viewStats.totalViews,
        };
      }),
    };
  }

  if (section === "deleted-targets") {
    const items = await getAdminDeletedTargets();
    return {
      title: "삭제 번호",
      totalPages: Math.max(1, Math.ceil(items.length / pageSize)),
      items: items.slice((safePage - 1) * pageSize, safePage * pageSize),
    };
  }

  if (section === "comments") {
    const items = (await getAdminEvaluations()).filter((row) => row.comment.trim().length > 0);
    return {
      title: "최근 의견",
      totalPages: Math.max(1, Math.ceil(items.length / pageSize)),
      items: items.slice((safePage - 1) * pageSize, safePage * pageSize),
    };
  }

  if (section === "safe-requests") {
    const items = (await getAdminEvaluations()).filter(isPendingSafeApprovalRow);
    return {
      title: "안전번호 등록 요청",
      totalPages: Math.max(1, Math.ceil(items.length / pageSize)),
      items: items.slice((safePage - 1) * pageSize, safePage * pageSize),
    };
  }

  if (section === "requests") {
    const items = await getAdminDeletionRequests();
    return {
      title: "삭제 요청",
      totalPages: Math.max(1, Math.ceil(items.length / pageSize)),
      items: items.slice((safePage - 1) * pageSize, safePage * pageSize),
    };
  }

  if (section === "input-failures") {
    const items = await getAdminSecurityLogs("input_validation_failed");
    return {
      title: "입력 실패 로그",
      totalPages: Math.max(1, Math.ceil(items.length / pageSize)),
      items: items.slice((safePage - 1) * pageSize, safePage * pageSize),
    };
  }

  if (section === "abnormal-ips") {
    const items = await getAdminSecurityLogs("abnormal_ip_blocked");
    return {
      title: "비정상 패턴 IP 로그",
      totalPages: Math.max(1, Math.ceil(items.length / pageSize)),
      items: items.slice((safePage - 1) * pageSize, safePage * pageSize),
    };
  }

  const items = (await getAdminDeletionRequests()).filter((request) => request.reason.includes("이의"));
  return {
    title: "번호 삭제 이의",
    totalPages: Math.max(1, Math.ceil(items.length / pageSize)),
    items: items.slice((safePage - 1) * pageSize, safePage * pageSize),
  };
}

export async function getAdminTargetDetail(kind: LookupKind, rawQuery: string) {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = getSupabaseAdmin();
  const normalized = normalizeForKind(kind, rawQuery);
  const targetType = kind === "phone" ? "phone" : "bank_account";
  const display =
    kind === "phone" ? formatPhoneDisplay(normalized) : formatAccountDisplay(normalized);
  const phoneVariants = kind === "phone" ? getPhoneLookupVariants(rawQuery) : null;

  const [{ data: evaluations, error: evalError }, { data: deletionRows, error: requestError }] =
    await Promise.all([
      supabase
        .from("evaluations")
        .select(
          "id, target_type, target_normalized, target_display, evaluation, comment, ip_hash, encrypted_ip, user_agent, device_fingerprint, created_at, status",
        )
        .eq("target_type", targetType)
        .in("target_normalized", phoneVariants ?? [normalized])
        .order("created_at", { ascending: true }),
      supabase
        .from("deletion_requests")
        .select("id, target_type, target_label, reason, description, contact, status, created_at")
        .eq("target_type", targetType)
        .or(`target_label.eq.${display},target_label.eq.${normalized}`),
    ]);

  if (evalError) throw evalError;
  if (requestError) throw requestError;

  const rows = (evaluations ?? []) as AdminEvaluationRow[];
  if (rows.length === 0) {
    return null;
  }

  const comments = rows
    .filter((row) => row.comment.trim().length > 0)
    .map((row) => ({ ...row, meta: parseEvaluationMeta(row.user_agent) }));
  const firstReport = comments[0] ?? null;
  const targetViewMap = await getTargetViewCountMap([
    {
      targetType,
      normalized,
    },
  ]);
  const viewStats =
    targetViewMap.get(buildViewTargetKey(targetType, normalized)) ?? emptyViewStats();

  return {
    kind,
    normalized,
    display: rows[0]?.target_display ?? display,
    firstReport,
    comments: comments.filter((item) => item.id !== firstReport?.id),
    evaluations: rows,
    deletionRequests: (deletionRows ?? []) as AdminDeletionRequestRow[],
    viewStats,
  };
}

function buildAdminTargetMetaMap(evaluations: AdminEvaluationRow[]) {
  const map = new Map<
    string,
    { evaluationLabel: string; statusLabel: "노출" | "미노출" | "승인 대기" }
  >();

  const grouped = new Map<string, AdminEvaluationRow[]>();
  for (const row of evaluations) {
    const key = `${row.target_type}-${canonicalTargetNormalized(row)}`;
    const current = grouped.get(key) ?? [];
    current.push(row);
    grouped.set(key, current);
  }

  for (const [key, rows] of grouped.entries()) {
    const firstReport =
      rows
        .filter((row) => row.comment.trim().length > 0)
        .sort((a, b) => a.created_at.localeCompare(b.created_at))[0] ?? rows[0];

    const pendingSafe = firstReport ? isPendingSafeApprovalRow(firstReport) : false;
    const hidden = rows.some((row) => row.status === "hidden");

    map.set(key, {
      evaluationLabel: firstReport?.evaluation === "safe" ? "안전" : "스팸",
      statusLabel: pendingSafe ? "승인 대기" : hidden ? "미노출" : "노출",
    });
  }

  return map;
}

function getAdminTargetMeta(
  targetType: "phone" | "bank_account",
  normalized: string,
  metaMap: Map<string, { evaluationLabel: string; statusLabel: "노출" | "미노출" | "승인 대기" }>,
) {
  return (
    metaMap.get(`${targetType}-${targetType === "phone" ? normalizePhone(normalized) : normalized}`) ?? {
      evaluationLabel: "-",
      statusLabel: "노출",
    }
  );
}

function emptyViewStats(): TargetViewStats {
  return {
    totalViews: 0,
    lastViewedAt: null,
  };
}

function isPendingSafeApprovalRow(row: AdminEvaluationRow) {
  const meta = parseEvaluationMeta(row.user_agent);
  return (
    row.comment.trim().length > 0 &&
    row.status === "hidden" &&
    row.evaluation === "safe" &&
    meta.safeApprovalPending
  );
}

export async function hasHiddenTarget(kind: LookupKind, rawQuery: string) {
  if (!isSupabaseConfigured()) return false;

  const supabase = getSupabaseAdmin();
  const normalized = normalizeForKind(kind, rawQuery);
  const targetType = kind === "phone" ? "phone" : "bank_account";
  const phoneVariants = kind === "phone" ? getPhoneLookupVariants(rawQuery) : null;

  const { count, error } = await supabase
    .from("evaluations")
    .select("id", { count: "exact", head: true })
    .eq("target_type", targetType)
    .in("target_normalized", phoneVariants ?? [normalized])
    .in("status", ["hidden"]);

  if (error) throw error;

  return (count ?? 0) > 0;
}

export async function hasHiddenTargetAny(rawQuery: string, preferredKind?: LookupKind) {
  const checks: LookupKind[] =
    preferredKind === "phone"
      ? ["phone", "account"]
      : preferredKind === "account"
        ? ["account", "phone"]
        : ["phone", "account"];

  for (const kind of checks) {
    if (await hasHiddenTarget(kind, rawQuery)) {
      return true;
    }
  }

  return false;
}

export async function getHomeStats() {
  if (!isSupabaseConfigured()) {
    const allTargets = [...phoneTargets, ...accountTargets];
    const safeTargetCount = allTargets.filter((target) =>
      target.comments.length > 0 && target.comments.every((comment) => comment.tone === "safe"),
    ).length;
    const spamTargetCount = allTargets.filter((target) =>
      target.comments.some((comment) => comment.tone === "spam"),
    ).length;
    const today = "2026-07-28";
    const firstReports = allTargets
      .map((target) => [...target.comments].sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0])
      .filter(Boolean);

    return {
      totalReports: allTargets.length,
      safeTargets: safeTargetCount,
      spamTargets: spamTargetCount,
      todayReports: firstReports.filter((comment) => comment.createdAt === today).length,
    };
  }

  if (homeStatsCache && homeStatsCache.expiresAt > Date.now()) {
    return homeStatsCache.value;
  }

  let result = await readStoredHomeStats();
  if (!result) {
    result = (await refreshStoredHomeStats()) ?? (await computeHomeStats());
  }

  homeStatsCache = {
    value: result,
    expiresAt: Date.now() + HOME_STATS_TTL_MS,
  };

  return result;
}
