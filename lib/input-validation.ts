import type { UserLocale } from "@/lib/i18n";

const URL_PATTERN =
  /(https?:\/\/|www\.|[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.(?:com|net|org|io|app|biz|info|co|me|la|kr|jp|vn|th|cn|dev|xyz|site)\b)/i;
const HTML_PATTERN = /<[^>]+>/;

export const MAX_TARGET_LENGTH = 20;
export const MAX_QR_PAYLOAD_LENGTH = 400;
export const MAX_QR_TARGET_LENGTH = 400;
export const MAX_REPORT_COMMENT_LENGTH = 200;
export const MAX_INQUIRY_NAME_LENGTH = 80;
export const MAX_INQUIRY_EMAIL_LENGTH = 160;
export const MAX_INQUIRY_MESSAGE_LENGTH = 2000;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

const messages: Record<
  UserLocale,
  {
    invalidTarget: string;
    qrInvalid: string;
    qrTooLong: string;
    numberTooLong: string;
    urlBlocked: string;
    htmlBlocked: string;
    plainRequired: string;
    plainTooLong: string;
    nameRequired: string;
    nameTooLong: string;
    emailRequired: string;
    emailTooLong: string;
    emailInvalid: string;
    inquiryRequired: string;
    inquiryTooLong: string;
  }
> = {
  lo: {
    invalidTarget: "ຂໍ້ມູນໝາຍເລກບໍ່ຖືກຕ້ອງ.",
    qrInvalid: "ຂໍ້ມູນ QR ບໍ່ຖືກຕ້ອງ.",
    qrTooLong: `ຂໍ້ຄວາມ QR ສູງສຸດ ${MAX_QR_PAYLOAD_LENGTH} ຕົວອັກສອນ.`,
    numberTooLong: `ໝາຍເລກສູງສຸດ ${MAX_TARGET_LENGTH} ຕົວອັກສອນ.`,
    urlBlocked: "ມີ URL ຢູ່ໃນຂໍ້ມູນ ຈຶ່ງບໍ່ສາມາດລົງໄດ້.",
    htmlBlocked: "ບໍ່ອະນຸຍາດ HTML.",
    plainRequired: "ກະລຸນາກອກເນື້ອຫາ.",
    plainTooLong: `ເນື້ອຫາສູງສຸດ ${MAX_REPORT_COMMENT_LENGTH} ຕົວອັກສອນ.`,
    nameRequired: "ກະລຸນາກອກຊື່.",
    nameTooLong: `ຊື່ສູງສຸດ ${MAX_INQUIRY_NAME_LENGTH} ຕົວອັກສອນ.`,
    emailRequired: "ກະລຸນາກອກອີເມວ.",
    emailTooLong: `ອີເມວສູງສຸດ ${MAX_INQUIRY_EMAIL_LENGTH} ຕົວອັກສອນ.`,
    emailInvalid: "ຮູບແບບອີເມວບໍ່ຖືກຕ້ອງ.",
    inquiryRequired: "ກະລຸນາກອກເນື້ອຫາການສອບຖາມ.",
    inquiryTooLong: `ເນື້ອຫາການສອບຖາມສູງສຸດ ${MAX_INQUIRY_MESSAGE_LENGTH} ຕົວອັກສອນ.`,
  },
  ko: {
    invalidTarget: "대상 정보가 올바르지 않습니다.",
    qrInvalid: "QR 원문 정보가 올바르지 않습니다.",
    qrTooLong: `QR 원문은 최대 ${MAX_QR_PAYLOAD_LENGTH}자까지 등록할 수 있습니다.`,
    numberTooLong: `번호는 최대 ${MAX_TARGET_LENGTH}자까지 등록할 수 있습니다.`,
    urlBlocked: "URL이 포함되어 있어 등록이 불가합니다.",
    htmlBlocked: "HTML 형식은 등록할 수 없습니다.",
    plainRequired: "내용을 입력해 주세요.",
    plainTooLong: `내용은 최대 ${MAX_REPORT_COMMENT_LENGTH}자까지 입력할 수 있습니다.`,
    nameRequired: "이름을 입력해 주세요.",
    nameTooLong: `이름은 최대 ${MAX_INQUIRY_NAME_LENGTH}자까지 입력할 수 있습니다.`,
    emailRequired: "이메일을 입력해 주세요.",
    emailTooLong: `이메일은 최대 ${MAX_INQUIRY_EMAIL_LENGTH}자까지 입력할 수 있습니다.`,
    emailInvalid: "올바른 이메일 형식이 아닙니다.",
    inquiryRequired: "문의 내용을 입력해 주세요.",
    inquiryTooLong: `문의 내용은 최대 ${MAX_INQUIRY_MESSAGE_LENGTH}자까지 입력할 수 있습니다.`,
  },
  en: {
    invalidTarget: "Invalid target information.",
    qrInvalid: "Invalid QR payload.",
    qrTooLong: `QR content can be up to ${MAX_QR_PAYLOAD_LENGTH} characters.`,
    numberTooLong: `The number can be up to ${MAX_TARGET_LENGTH} characters.`,
    urlBlocked: "Registration is not allowed because a URL is included.",
    htmlBlocked: "HTML content is not allowed.",
    plainRequired: "Please enter content.",
    plainTooLong: `Content can be up to ${MAX_REPORT_COMMENT_LENGTH} characters.`,
    nameRequired: "Please enter your name.",
    nameTooLong: `Name can be up to ${MAX_INQUIRY_NAME_LENGTH} characters.`,
    emailRequired: "Please enter your email.",
    emailTooLong: `Email can be up to ${MAX_INQUIRY_EMAIL_LENGTH} characters.`,
    emailInvalid: "Invalid email format.",
    inquiryRequired: "Please enter your message.",
    inquiryTooLong: `Message can be up to ${MAX_INQUIRY_MESSAGE_LENGTH} characters.`,
  },
};

export function containsUrl(value: string) {
  return URL_PATTERN.test(String(value ?? "").trim());
}

export function containsHtml(value: string) {
  return HTML_PATTERN.test(String(value ?? ""));
}

export function validateTargetLength(value: string, locale: UserLocale = "ko") {
  const copy = messages[locale];
  const trimmed = String(value ?? "").trim();

  if (!trimmed) {
    return copy.invalidTarget;
  }

  const isQrTarget = trimmed.startsWith("qr:");
  const qrValue = isQrTarget ? trimmed.slice(3).replace(/\s+/g, "") : trimmed;
  const limit = isQrTarget ? MAX_QR_TARGET_LENGTH : MAX_TARGET_LENGTH;

  if (qrValue.length > limit) {
    if (isQrTarget) {
      return copy.qrTooLong;
    }

    return copy.numberTooLong;
  }

  return null;
}

export function validateQrPayload(value: string | null | undefined, locale: UserLocale = "ko") {
  const copy = messages[locale];
  const trimmed = String(value ?? "").trim();

  if (!trimmed) {
    return copy.qrInvalid;
  }

  if (trimmed.length > MAX_QR_PAYLOAD_LENGTH) {
    return copy.qrTooLong;
  }

  if (containsUrl(trimmed)) {
    return copy.urlBlocked;
  }

  if (containsHtml(trimmed)) {
    return copy.htmlBlocked;
  }

  return null;
}

export function validatePlainText(
  value: string,
  emptyAllowed = true,
  locale: UserLocale = "ko",
  maxLength?: number,
) {
  const copy = messages[locale];
  const trimmed = String(value ?? "").trim();

  if (!trimmed) {
    return emptyAllowed ? null : copy.plainRequired;
  }

  if (typeof maxLength === "number" && trimmed.length > maxLength) {
    return copy.plainTooLong;
  }

  if (containsUrl(trimmed)) {
    return copy.urlBlocked;
  }

  if (containsHtml(trimmed)) {
    return copy.htmlBlocked;
  }

  return null;
}

export function validateInquiryName(value: string, locale: UserLocale = "ko") {
  const copy = messages[locale];
  const trimmed = String(value ?? "").trim();

  if (!trimmed) {
    return copy.nameRequired;
  }

  if (trimmed.length > MAX_INQUIRY_NAME_LENGTH) {
    return copy.nameTooLong;
  }

  if (containsUrl(trimmed)) {
    return copy.urlBlocked;
  }

  if (containsHtml(trimmed)) {
    return copy.htmlBlocked;
  }

  return null;
}

export function validateInquiryEmail(value: string, locale: UserLocale = "ko") {
  const copy = messages[locale];
  const trimmed = String(value ?? "").trim();

  if (!trimmed) {
    return copy.emailRequired;
  }

  if (trimmed.length > MAX_INQUIRY_EMAIL_LENGTH) {
    return copy.emailTooLong;
  }

  if (!EMAIL_PATTERN.test(trimmed)) {
    return copy.emailInvalid;
  }

  if (containsHtml(trimmed)) {
    return copy.htmlBlocked;
  }

  return null;
}

export function validateInquiryMessage(value: string, locale: UserLocale = "ko") {
  const copy = messages[locale];
  const trimmed = String(value ?? "").trim();

  if (!trimmed) {
    return copy.inquiryRequired;
  }

  if (trimmed.length > MAX_INQUIRY_MESSAGE_LENGTH) {
    return copy.inquiryTooLong;
  }

  return validatePlainText(trimmed, false, locale);
}
