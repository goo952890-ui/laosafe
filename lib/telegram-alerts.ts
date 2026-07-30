import { getRuntimeEnv } from "./runtime-env";

type TelegramAlertKind = "report" | "comment" | "deletion";
type LookupTargetType = "phone" | "account";

type TelegramConfig = {
  token?: string;
  chatId?: string;
};

function getTelegramConfig(kind: TelegramAlertKind): TelegramConfig {
  if (kind === "report") {
    return {
      token: getRuntimeEnv("TELEGRAM_REPORT_BOT_TOKEN"),
      chatId: getRuntimeEnv("TELEGRAM_REPORT_CHAT_ID"),
    };
  }

  if (kind === "comment") {
    return {
      token: getRuntimeEnv("TELEGRAM_COMMENT_BOT_TOKEN"),
      chatId: getRuntimeEnv("TELEGRAM_COMMENT_CHAT_ID"),
    };
  }

  return {
    token: getRuntimeEnv("TELEGRAM_DELETION_BOT_TOKEN"),
    chatId: getRuntimeEnv("TELEGRAM_DELETION_CHAT_ID"),
  };
}

export function buildRequestOrigin(request: Request) {
  const requestUrl = new URL(request.url);
  const protocol =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
    requestUrl.protocol.replace(":", "");
  const host =
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    request.headers.get("host")?.trim() ||
    requestUrl.host;

  return `${protocol}://${host}`;
}

function buildAdminLookupUrl(origin: string, kind: LookupTargetType, normalized: string) {
  return `${origin}/admin/lookup/${kind}/${encodeURIComponent(normalized)}`;
}

function getTargetTypeLabel(kind: LookupTargetType, normalized: string) {
  if (kind === "phone") {
    return "전화번호";
  }

  return normalized.startsWith("qr:") ? "QR이미지" : "계좌번호";
}

function getEvaluationLabel(value: "spam" | "safe") {
  return value === "safe" ? "안전번호 제보" : "스팸 제보";
}

async function sendTelegramMessage(kind: TelegramAlertKind, text: string) {
  const { token, chatId } = getTelegramConfig(kind);

  if (!token || !chatId) {
    throw new Error(
      `Missing Telegram config for ${kind}: token=${token ? "set" : "missing"}, chatId=${chatId ? "set" : "missing"}`,
    );
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
      parse_mode: "HTML",
    }),
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(`Telegram send failed: ${payload}`);
  }
}

export async function notifyTelegramReport(input: {
  request: Request;
  targetType: LookupTargetType;
  targetNormalized: string;
  targetDisplay: string;
  evaluation: "spam" | "safe";
  comment: string;
  createdAt: string;
}) {
  const origin = buildRequestOrigin(input.request);
  const adminUrl = buildAdminLookupUrl(origin, input.targetType, input.targetNormalized);

  await sendTelegramMessage(
    "report",
    [
      "[새 제보 등록]",
      "",
      `번호 유형: ${getTargetTypeLabel(input.targetType, input.targetNormalized)}`,
      `제보 유형: ${getEvaluationLabel(input.evaluation)}`,
      `대상 번호: ${input.targetDisplay}`,
      `의견: ${input.comment || "-"}`,
      `등록일: ${input.createdAt}`,
      `관리자 확인: <a href="${adminUrl}">${adminUrl}</a>`,
    ].join("\n"),
  );
}

export async function notifyTelegramComment(input: {
  request: Request;
  targetType: LookupTargetType;
  targetNormalized: string;
  targetDisplay: string;
  nickname: string | null;
  comment: string;
  createdAt: string;
}) {
  const origin = buildRequestOrigin(input.request);
  const adminUrl = buildAdminLookupUrl(origin, input.targetType, input.targetNormalized);

  await sendTelegramMessage(
    "comment",
    [
      "[새 의견 등록]",
      "",
      `번호 유형: ${getTargetTypeLabel(input.targetType, input.targetNormalized)}`,
      `대상 번호: ${input.targetDisplay}`,
      `작성자: ${input.nickname ?? "익명"}`,
      `의견: ${input.comment || "-"}`,
      `등록일: ${input.createdAt}`,
      `관리자 확인: <a href="${adminUrl}">${adminUrl}</a>`,
    ].join("\n"),
  );
}

export async function notifyTelegramDeletionRequest(input: {
  request: Request;
  targetType: LookupTargetType;
  targetNormalized: string;
  targetLabel: string;
  reason: string;
  description: string;
  contact: string;
  createdAt: string;
}) {
  const origin = buildRequestOrigin(input.request);
  const adminUrl = buildAdminLookupUrl(origin, input.targetType, input.targetNormalized);

  await sendTelegramMessage(
    "deletion",
    [
      "[삭제 요청 접수]",
      "",
      `번호 유형: ${getTargetTypeLabel(input.targetType, input.targetNormalized)}`,
      `대상 번호: ${input.targetLabel}`,
      `삭제 사유: ${input.reason}`,
      `상세 설명: ${input.description || "-"}`,
      `연락처: ${input.contact || "-"}`,
      `등록일: ${input.createdAt}`,
      `관리자 확인: <a href="${adminUrl}">${adminUrl}</a>`,
    ].join("\n"),
  );
}
