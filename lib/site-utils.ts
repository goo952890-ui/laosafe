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
    digits.startsWith("856") ||
    (digits.startsWith("0") && digits.length >= 7 && digits.length <= 11) ||
    (digits.length >= 5 && digits.length <= 8) ||
    digits.startsWith("20") ||
    digits.startsWith("30") ||
    digits.startsWith("21") ||
    digits.startsWith("31") ||
    digits.startsWith("41") ||
    digits.startsWith("51") ||
    digits.startsWith("61") ||
    digits.startsWith("71") ||
    digits.startsWith("81")
  ) {
    return "phone";
  }

  return "account";
}

export function normalizePhone(input: string) {
  const digits = input.replace(/\D/g, "");
  if (!digits) return "";

  if (digits.startsWith("856")) {
    return normalizePhone(digits.slice(3));
  }

  if (digits.startsWith("0") && digits.length >= 7) {
    return digits.slice(1);
  }

  return digits;
}

export function getPhoneLookupVariants(input: string) {
  const digits = String(input ?? "").replace(/\D/g, "");
  const normalized = normalizePhone(digits);
  const variants = new Set<string>();

  if (normalized) {
    variants.add(normalized);
  }

  if (digits) {
    variants.add(digits);
  }

  if (normalized && normalized.length >= 7) {
    variants.add(`0${normalized}`);
    variants.add(`856${normalized}`);
    variants.add(`8560${normalized}`);
  }

  if (normalized && normalized.length === 8 && !/^(20|21|30|31|41|51|61|71|81)/.test(normalized)) {
    variants.add(`20${normalized}`);
  }

  return [...variants];
}

export function normalizeAccount(input: string) {
  return input.replace(/[^\d]/g, "");
}

export function cleanQrPayload(input: string) {
  return String(input ?? "")
    .replace(/^qr:/i, "")
    .replace(/\s+/g, "")
    .trim();
}

export function normalizeAccountLookupKey(input: string) {
  const trimmed = input.trim();

  if (/^qr:/i.test(trimmed)) {
    const payload = cleanQrPayload(trimmed);
    return payload ? `qr:${payload}` : "";
  }

  const extracted = extractAccountFromQrPayload(input);

  if (extracted) {
    return extracted;
  }

  if (!trimmed) {
    return "";
  }

  if (/[^\d\s-]/.test(trimmed)) {
    const payload = cleanQrPayload(trimmed);
    return payload ? `qr:${payload}` : "";
  }

  return normalizeAccount(trimmed);
}

export function formatPhoneDisplay(normalized: string) {
  return normalized;
}

export function formatAccountDisplay(normalized: string) {
  if (normalized.startsWith("qr:")) {
    return cleanQrPayload(normalized);
  }

  return normalized;
}

export function maskAccountDisplay(value: string) {
  if (value.startsWith("qr:")) {
    return cleanQrPayload(value);
  }

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

export function getCounts(input: CommentRecord[] | Pick<SearchTarget, "comments" | "spamVotes" | "safeVotes">) {
  const comments = Array.isArray(input) ? input : input.comments;
  const explicitSpamVotes = Array.isArray(input) ? undefined : input.spamVotes;
  const explicitSafeVotes = Array.isArray(input) ? undefined : input.safeVotes;
  const voteRows = comments.filter((comment) => comment.isVoteOnly);
  const spam = explicitSpamVotes ?? voteRows.filter((comment) => comment.tone === "spam").length;
  const safe = explicitSafeVotes ?? voteRows.filter((comment) => comment.tone === "safe").length;
  const total = voteRows.length;

  const totalCount =
    explicitSpamVotes !== undefined || explicitSafeVotes !== undefined ? spam + safe : total;

  return {
    spam,
    safe,
    total: totalCount,
    spamRatio: totalCount ? Math.round((spam / totalCount) * 100) : 0,
    safeRatio: totalCount ? Math.round((safe / totalCount) * 100) : 0,
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

export function getStatusSummary(spamCount: number, safeCount: number) {
  if (spamCount === 0 && safeCount === 0) {
    return {
      tone: "safe",
      label: "신고 없음",
      message: "현재 등록된 신고가 없습니다.",
    } as const;
  }

  if (spamCount > safeCount) {
    return {
      tone: spamCount >= 3 ? "danger" : "warning",
      label: spamCount >= 3 ? "신고 다수" : "신고 있음",
      message:
        spamCount >= 3
          ? "다수의 사용자가 신고한 번호입니다."
          : "신고 내역이 있는 번호입니다.",
    } as const;
  }

  if (safeCount > spamCount) {
    return {
      tone: "safe",
      label: "안전 우세",
      message: "안전 평가가 더 많은 번호입니다.",
    } as const;
  }

  return {
    tone: "warning",
    label: "의견 혼재",
    message: "스팸과 안전 평가가 비슷하게 등록된 번호입니다.",
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

export function looksLikeQrPayload(input: string) {
  return input.trim().startsWith("qr:") || /[^\d\s-]/.test(input.trim());
}

export function extractQrPayload(input: string) {
  if (/^qr:/i.test(input)) {
    return cleanQrPayload(input);
  }

  if (looksLikeQrPayload(input)) {
    return cleanQrPayload(input);
  }

  return null;
}
