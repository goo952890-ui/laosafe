const URL_PATTERN =
  /(https?:\/\/|www\.|[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.(?:com|net|org|io|app|biz|info|co|me|la|kr|jp|vn|th|cn|dev|xyz|site)\b)/i;
const HTML_PATTERN = /<[^>]+>/;

export const MAX_TARGET_LENGTH = 20;
export const MAX_QR_PAYLOAD_LENGTH = 200;

export function containsUrl(value: string) {
  return URL_PATTERN.test(String(value ?? "").trim());
}

export function containsHtml(value: string) {
  return HTML_PATTERN.test(String(value ?? ""));
}

export function validateTargetLength(value: string) {
  const trimmed = String(value ?? "").trim();

  if (!trimmed) {
    return "대상 정보가 올바르지 않습니다.";
  }

  if (trimmed.length > MAX_TARGET_LENGTH) {
    return `번호는 최대 ${MAX_TARGET_LENGTH}자까지 등록할 수 있습니다.`;
  }

  return null;
}

export function validateQrPayload(value: string | null | undefined) {
  const trimmed = String(value ?? "").trim();

  if (!trimmed) {
    return "QR 원문 정보가 올바르지 않습니다.";
  }

  if (trimmed.length > MAX_QR_PAYLOAD_LENGTH) {
    return `QR 원문은 최대 ${MAX_QR_PAYLOAD_LENGTH}자까지 등록할 수 있습니다.`;
  }

  if (containsUrl(trimmed)) {
    return "URL이 포함되어 있어 등록이 불가합니다.";
  }

  if (containsHtml(trimmed)) {
    return "HTML 형식은 등록할 수 없습니다.";
  }

  return null;
}

export function validatePlainText(value: string, emptyAllowed = true) {
  const trimmed = String(value ?? "").trim();

  if (!trimmed) {
    return emptyAllowed ? null : "내용을 입력해 주세요.";
  }

  if (containsUrl(trimmed)) {
    return "URL이 포함되어 있어 등록이 불가합니다.";
  }

  if (containsHtml(trimmed)) {
    return "HTML 형식은 등록할 수 없습니다.";
  }

  return null;
}
