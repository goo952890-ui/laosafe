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
import {
  extractAccountFromQrPayload,
  formatAccountDisplay,
  formatPhoneDisplay,
  normalizeAccount,
  normalizePhone,
} from "./site-utils";
import { getSupabaseAdmin, isSupabaseConfigured } from "./supabase";

type EvaluationRow = {
  target_type: "phone" | "bank_account";
  target_normalized: string;
  target_display: string;
  evaluation: "spam" | "safe";
  comment: string;
  created_at: string;
  status: "visible" | "hidden" | "deleted";
};

type PhoneRow = {
  normalized_number: string;
  display_number: string;
};

type AccountRow = {
  normalized_account_number: string;
  display_account_number: string;
  bank_name: string | null;
  recipient_name: string | null;
  masked_recipient_name: string | null;
};

type DeletionRequestRow = {
  id: number;
  target_type: "phone" | "bank_account";
  target_label: string;
  reason: string;
  description: string;
  contact: string;
  status: "submitted" | "reviewing" | "resolved" | "rejected";
};

function normalizeAccountLookup(input: string) {
  return extractAccountFromQrPayload(input) ?? normalizeAccount(input);
}

function normalizeForKind(kind: LookupKind, rawQuery: string) {
  return kind === "phone" ? normalizePhone(rawQuery) : normalizeAccountLookup(rawQuery);
}

function mapComment(row: EvaluationRow): CommentRecord {
  return {
    id: `${row.target_type}-${row.target_normalized}-${row.created_at}`,
    tone: row.evaluation,
    text: row.comment,
    createdAt: row.created_at.slice(0, 10),
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

function buildPhoneTarget(row: PhoneRow, evaluations: EvaluationRow[]): SearchTarget {
  return {
    kind: "phone",
    normalized: row.normalized_number,
    display: row.display_number,
    comments: evaluations.map(mapComment),
  };
}

function buildAccountTarget(row: AccountRow, evaluations: EvaluationRow[]): SearchTarget {
  return {
    kind: "account",
    normalized: row.normalized_account_number,
    display: row.display_account_number,
    bankName: row.bank_name ?? undefined,
    recipientName: row.recipient_name ?? row.masked_recipient_name ?? undefined,
    comments: evaluations.map(mapComment),
  };
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
  const phoneKeys = [...new Set(rows.filter((row) => row.target_type === "phone").map((row) => row.target_normalized))];
  const accountKeys = [...new Set(rows.filter((row) => row.target_type === "bank_account").map((row) => row.target_normalized))];

  if (phoneKeys.length > 0) {
    const { data } = await supabase
      .from("phone_numbers")
      .select("normalized_number, display_number")
      .in("normalized_number", phoneKeys);

    for (const row of (data ?? []) as PhoneRow[]) {
      const evaluations = rows
        .filter((item) => item.target_type === "phone" && item.target_normalized === row.normalized_number)
        .sort((a, b) => b.created_at.localeCompare(a.created_at));
      map.set(`phone-${row.normalized_number}`, buildPhoneTarget(row, evaluations));
    }
  }

  if (accountKeys.length > 0) {
    const { data } = await supabase
      .from("bank_accounts")
      .select(
        "normalized_account_number, display_account_number, bank_name, recipient_name, masked_recipient_name",
      )
      .in("normalized_account_number", accountKeys);

    for (const row of (data ?? []) as AccountRow[]) {
      const evaluations = rows
        .filter(
          (item) =>
            item.target_type === "bank_account" &&
            item.target_normalized === row.normalized_account_number,
        )
        .sort((a, b) => b.created_at.localeCompare(a.created_at));
      map.set(`account-${row.normalized_account_number}`, buildAccountTarget(row, evaluations));
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

export async function findTarget(kind: LookupKind, rawQuery: string) {
  if (!isSupabaseConfigured()) {
    return fallbackFindTarget(kind, rawQuery);
  }

  const supabase = getSupabaseAdmin();
  const normalized = normalizeForKind(kind, rawQuery);

  try {
    if (kind === "phone") {
      const [{ data: phone }, { data: evaluations }] = await Promise.all([
        supabase
          .from("phone_numbers")
          .select("normalized_number, display_number")
          .eq("normalized_number", normalized)
          .maybeSingle(),
        supabase
          .from("evaluations")
          .select("target_type, target_normalized, target_display, evaluation, comment, created_at, status")
          .eq("target_type", "phone")
          .eq("target_normalized", normalized)
          .eq("status", "visible")
          .order("created_at", { ascending: false }),
      ]);

      return {
        normalized,
        found: phone
          ? buildPhoneTarget(phone as PhoneRow, (evaluations ?? []) as EvaluationRow[])
          : null,
        display: phone?.display_number ?? formatPhoneDisplay(normalized),
      };
    }

    const [{ data: account }, { data: evaluations }] = await Promise.all([
      supabase
        .from("bank_accounts")
        .select(
          "normalized_account_number, display_account_number, bank_name, recipient_name, masked_recipient_name",
        )
        .eq("normalized_account_number", normalized)
        .maybeSingle(),
      supabase
        .from("evaluations")
        .select("target_type, target_normalized, target_display, evaluation, comment, created_at, status")
        .eq("target_type", "bank_account")
        .eq("target_normalized", normalized)
        .eq("status", "visible")
        .order("created_at", { ascending: false }),
    ]);

    return {
      normalized,
      found: account
        ? buildAccountTarget(account as AccountRow, (evaluations ?? []) as EvaluationRow[])
        : null,
      display: account?.display_account_number ?? formatAccountDisplay(normalized),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (isMissingTableError(message)) {
      return fallbackFindTarget(kind, rawQuery);
    }
    throw error;
  }
}

export async function getRecentTargets() {
  if (!isSupabaseConfigured()) {
    return [...phoneTargets, ...accountTargets]
      .map((target) => ({
        target,
        latest: [...target.comments].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0],
      }))
      .sort((a, b) => b.latest.createdAt.localeCompare(a.latest.createdAt));
  }

  const supabase = getSupabaseAdmin();

  try {
    const { data, error } = await supabase
      .from("evaluations")
      .select("target_type, target_normalized, target_display, evaluation, comment, created_at, status")
      .eq("status", "visible")
      .order("created_at", { ascending: false })
      .limit(80);

    if (error) throw error;

    const rows = (data ?? []) as EvaluationRow[];
    const targetMap = await fetchTargetMap(rows);
    const seen = new Set<string>();

    return rows
      .map((row) => {
        const key =
          row.target_type === "phone"
            ? `phone-${row.target_normalized}`
            : `account-${row.target_normalized}`;
        if (seen.has(key)) return null;
        seen.add(key);

        const target = targetMap.get(key);
        if (!target) return null;

        return {
          target,
          latest: mapComment(row),
        };
      })
      .filter((entry): entry is { target: SearchTarget; latest: CommentRecord } => Boolean(entry));
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

