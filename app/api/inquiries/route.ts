import {
  createContactInquiry,
  getAdminInquiriesPage,
} from "@/lib/content-repository";
import { normalizeUserLocale } from "@/lib/i18n";
import {
  validateInquiryEmail,
  validateInquiryMessage,
  validateInquiryName,
} from "@/lib/input-validation";
import { writeSecurityLog } from "@/lib/security-logs";
import { isSupabaseConfigured } from "@/lib/supabase";

function missingTableMessage() {
  return "Supabase 테이블이 아직 준비되지 않았습니다. `supabase/schema.sql`을 SQL Editor에서 먼저 실행해 주세요.";
}

export async function POST(request: Request) {
  const payload = (await request.json()) as {
    name?: string;
    email?: string;
    message?: string;
    locale?: string;
  };
  const locale = normalizeUserLocale(payload.locale);

  if (!isSupabaseConfigured()) {
    return Response.json(
      { error: locale === "lo" ? "ຍັງບໍ່ໄດ້ຕັ້ງຄ່າ Supabase." : locale === "en" ? "Supabase is not configured." : "Supabase 환경변수가 설정되지 않았습니다." },
      { status: 500 },
    );
  }

  const ip =
    request.headers.get("cf-connecting-ip")?.trim() ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip")?.trim() ??
    null;

  try {
    const name = String(payload.name ?? "").trim();
    const email = String(payload.email ?? "").trim();
    const message = String(payload.message ?? "").trim();

    const nameError = validateInquiryName(name, locale);
    if (nameError) {
      await writeSecurityLog({
        logType: "input_validation_failed",
        source: "contact_inquiry",
        ip,
        identityKey: ip,
        detail: nameError,
      });
      return Response.json({ error: nameError }, { status: 400 });
    }

    const emailError = validateInquiryEmail(email, locale);
    if (emailError) {
      await writeSecurityLog({
        logType: "input_validation_failed",
        source: "contact_inquiry",
        ip,
        identityKey: ip,
        detail: emailError,
      });
      return Response.json({ error: emailError }, { status: 400 });
    }

    const messageError = validateInquiryMessage(message, locale);
    if (messageError) {
      await writeSecurityLog({
        logType: "input_validation_failed",
        source: "contact_inquiry",
        ip,
        identityKey: ip,
        detail: messageError,
      });
      return Response.json({ error: messageError }, { status: 400 });
    }

    await createContactInquiry({ name, email, message });

    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : locale === "lo" ? "ບໍ່ສາມາດບັນທຶກຄຳຖາມໄດ້." : locale === "en" ? "Failed to save your inquiry." : "문의 내용을 저장하지 못했습니다.";
    const friendly =
      message.includes("relation") || message.includes("Could not find the table")
        ? missingTableMessage()
        : message;

    return Response.json({ error: friendly }, { status: 500 });
  }
}

export async function GET() {
  const data = await getAdminInquiriesPage(1, 10);
  return Response.json(data);
}
