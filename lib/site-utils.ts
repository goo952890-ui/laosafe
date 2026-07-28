import {
  accountTargets,
  phoneTargets,
  type CommentRecord,
  type LookupKind,
  type SearchTarget,
} from "./site-data";

export function detectLookupKind(input: string): LookupKind {
  const compact = input.replace(/\s+/g, "");
  const digits = input.replace(/\D/g, "");

  if (
    compact.startsWith("+856") ||
    digits.startsWith("85620") ||
    digits.startsWith("85630") ||
    digits.startsWith("020") ||
    digits.startsWith("030")
  ) {
    return "phone";
  }

  return "account";
}

export function normalizePhone(input: string) {
  const digits = input.replace(/\D/g, "");
  if (!digits) return "";

  if (digits.startsWith("856")) {
    return `0${digits.slice(3)}`;
  }

  if ((digits.startsWith("20") || digits.startsWith("30")) && digits.length >= 10) {
    return `0${digits}`;
  }

  return digits;
}

export function normalizeAccount(input: string) {
  return input.replace(/[^\d]/g, "");
}

export function formatPhoneDisplay(normalized: string) {
  if (normalized.length === 11) {
    return `${normalized.slice(0, 3)} ${normalized.slice(3, 7)} ${normalized.slice(7)}`;
  }

  return normalized;
}

export function formatAccountDisplay(normalized: string) {
  if (normalized.length >= 9) {
    const first = normalized.slice(0, 3);
    const second = normalized.slice(3, 6);
    const rest = normalized.slice(6);
    return [first, second, rest].filter(Boolean).join(" ");
  }

  return normalized;
}

export function maskAccountDisplay(value: string) {
  const digits = value.replace(/[^\d]/g, "");

  if (digits.length < 8) {
    return value;
  }

  return `${digits.slice(0, 3)}-${"*".repeat(4)}-${"*".repeat(4)}-${digits.slice(-2)}`;
}

export function maskRecipientName(name?: string) {
  if (!name) return null;

  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      const visible = word.length <= 2 ? 1 : Math.min(3, Math.ceil(word.length / 2.4));
      return `${word.slice(0, visible)}${"*".repeat(Math.max(1, word.length - visible))}`;
    })
    .join(" ");
}

export function getCounts(comments: CommentRecord[]) {
  const spam = comments.filter((comment) => comment.tone === "spam").length;
  const safe = comments.filter((comment) => comment.tone === "safe").length;
  const total = comments.length;

  return {
    spam,
    safe,
    total,
    spamRatio: total ? Math.round((spam / total) * 100) : 0,
    safeRatio: total ? Math.round((safe / total) * 100) : 0,
  };
}

export function findTarget(kind: LookupKind, rawQuery: string) {
  const normalized =
    kind === "phone" ? normalizePhone(rawQuery) : normalizeAccount(rawQuery);

  const source = kind === "phone" ? phoneTargets : accountTargets;
  const found = source.find((target) => target.normalized === normalized) ?? null;

  return {
    normalized,
    found,
    display:
      kind === "phone"
        ? formatPhoneDisplay(normalized)
        : formatAccountDisplay(normalized),
  };
}

export function getRecentTargets() {
  const targets = [...phoneTargets, ...accountTargets] as SearchTarget[];

  return targets
    .map((target) => ({
      target,
      latest: [...target.comments].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0],
    }))
    .sort((a, b) => b.latest.createdAt.localeCompare(a.latest.createdAt));
}

export function getPopularTargets() {
  const targets = [...phoneTargets, ...accountTargets] as SearchTarget[];

  return targets
    .map((target) => ({
      target,
      counts: getCounts(target.comments),
    }))
    .sort((a, b) => b.counts.total - a.counts.total || b.counts.spam - a.counts.spam);
}

export function getStatusSummary(spamCount: number) {
  if (spamCount === 0) {
    return {
      tone: "safe",
      label: "신고 없음",
      message: "현재 등록된 신고가 없습니다.",
    } as const;
  }

  if (spamCount >= 3) {
    return {
      tone: "danger",
      label: "신고 다수",
      message: "다수의 사용자가 신고한 번호입니다.",
    } as const;
  }

  return {
    tone: "warning",
    label: "신고 있음",
    message: "신고 내역이 있는 번호입니다.",
  } as const;
}

export function extractAccountFromQrPayload(payload: string) {
  const labeledMatch = payload.match(
    /(account|acct|acc|a\/c|to)\D*((?:\d[\s-]?){8,20}\d)/i,
  );

  if (labeledMatch?.[2]) {
    return normalizeAccount(labeledMatch[2]);
  }

  const candidates = Array.from(
    new Set(
      [...payload.matchAll(/((?:\d[\s-]?){8,20}\d)/g)]
        .map((match) => normalizeAccount(match[1]))
        .filter((value) => value.length >= 9),
    ),
  );

  if (candidates.length === 1) {
    return candidates[0];
  }

  return null;
}
