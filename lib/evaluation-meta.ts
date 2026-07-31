export function generateNumericNickname() {
  return String(Math.floor(10000 + Math.random() * 90000));
}

export async function hashPassword(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Buffer.from(digest).toString("hex");
}

export function serializeEvaluationMeta(meta: {
  nickname?: string | null;
  isAdmin?: boolean;
  safeApprovalPending?: boolean;
  hiddenTargetReport?: boolean;
}) {
  return JSON.stringify({
    nickname: meta.nickname ?? null,
    isAdmin: meta.isAdmin ?? false,
    safeApprovalPending: meta.safeApprovalPending ?? false,
    hiddenTargetReport: meta.hiddenTargetReport ?? false,
  });
}

export function parseEvaluationMeta(value?: string | null) {
  if (!value) {
    return {
      nickname: null as string | null,
      isAdmin: false,
      safeApprovalPending: false,
      hiddenTargetReport: false,
    };
  }

  try {
    const parsed = JSON.parse(value) as {
      nickname?: string | null;
      isAdmin?: boolean;
      safeApprovalPending?: boolean;
      hiddenTargetReport?: boolean;
    };
    return {
      nickname: parsed.nickname ?? null,
      isAdmin: parsed.isAdmin ?? false,
      safeApprovalPending: parsed.safeApprovalPending ?? false,
      hiddenTargetReport: parsed.hiddenTargetReport ?? false,
    };
  } catch {
    return {
      nickname: null as string | null,
      isAdmin: false,
      safeApprovalPending: false,
      hiddenTargetReport: false,
    };
  }
}
