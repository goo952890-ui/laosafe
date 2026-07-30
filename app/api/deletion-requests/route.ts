import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { normalizeUserLocale } from "@/lib/i18n";
import { validatePlainText, validateTargetLength } from "@/lib/input-validation";
import { writeSecurityLog } from "@/lib/security-logs";
import { notifyTelegramDeletionRequest } from "@/lib/telegram-alerts";
import { normalizeAccountLookupKey, normalizePhone } from "@/lib/site-utils";

function missingTableMessage() {
  return "Supabase 테이블이 아직 준비되지 않았습니다. `supabase/schema.sql`을 SQL Editor에서 먼저 실행해 주세요.";
}

export async function POST(request: Request) {
  const payload = (await request.json()) as {
    targetType?: "phone" | "account";
    targetLabel?: string;
    targetNormalized?: string;
    reason?: string;
    description?: string;
    contact?: string;
    locale?: string;
  };
  const locale = normalizeUserLocale(payload.locale);

  if (!isSupabaseConfigured()) {
    return Response.json(
      { error: locale === "lo" ? "ຍັງບໍ່ໄດ້ຕັ້ງຄ່າ Supabase." : locale === "en" ? "Supabase is not configured." : "Supabase 환경변수가 설정되지 않았습니다." },
      { status: 500 },
    );
  }

  if (!payload.targetType || !payload.targetLabel || !payload.reason) {
    return Response.json({ error: locale === "lo" ? "ຂໍ້ມູນຄຳຂໍລຶບບໍ່ຖືກຕ້ອງ." : locale === "en" ? "Invalid delete request information." : "삭제 요청 정보가 올바르지 않습니다." }, { status: 400 });
  }

  const ip =
    request.headers.get("cf-connecting-ip")?.trim() ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip")?.trim() ??
    null;

  try {
    const supabase = getSupabaseAdmin();
    const normalized =
      payload.targetType === "phone"
        ? normalizePhone(payload.targetNormalized ?? payload.targetLabel)
        : normalizeAccountLookupKey(payload.targetNormalized ?? payload.targetLabel);
    const targetType = payload.targetType === "phone" ? "phone" : "bank_account";
    const targetError = validateTargetLength(normalized, locale);
    if (targetError) {
      await writeSecurityLog({
        logType: "input_validation_failed",
        source: "deletion_request",
        targetType,
        targetValue: normalized,
        ip,
        identityKey: ip,
        detail: targetError,
      });
      return Response.json({ error: targetError }, { status: 400 });
    }

    const descriptionError = validatePlainText(payload.description ?? "", true, locale);
    if (descriptionError) {
      await writeSecurityLog({
        logType: "input_validation_failed",
        source: "deletion_request",
        targetType,
        targetValue: normalized,
        ip,
        identityKey: ip,
        detail: descriptionError,
      });
      return Response.json({ error: descriptionError }, { status: 400 });
    }

    const contactError = validatePlainText(payload.contact ?? "", true, locale);
    if (contactError) {
      await writeSecurityLog({
        logType: "input_validation_failed",
        source: "deletion_request",
        targetType,
        targetValue: normalized,
        ip,
        identityKey: ip,
        detail: contactError,
      });
      return Response.json({ error: contactError }, { status: 400 });
    }

    const createdAt = new Date().toISOString().slice(0, 16).replace("T", " ");
    const { error } = await supabase.from("deletion_requests").insert({
      target_type: targetType,
      target_label: payload.targetLabel,
      reason: payload.reason,
      description: payload.description?.trim() ?? "",
      contact: payload.contact?.trim() ?? "",
      status: "submitted",
    });

    if (error) throw error;

    try {
      await notifyTelegramDeletionRequest({
        request,
        targetType: payload.targetType,
        targetNormalized: normalized,
        targetLabel: payload.targetLabel,
        reason: payload.reason,
        description: payload.description?.trim() ?? "",
        contact: payload.contact?.trim() ?? "",
        createdAt,
      });
    } catch (notificationError) {
      console.error("Telegram deletion notification failed", notificationError);
    }

    return Response.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : locale === "lo" ? "ບໍ່ສາມາດຮັບຄຳຂໍລຶບໄດ້." : locale === "en" ? "Failed to submit the delete request." : "삭제 요청을 접수하지 못했습니다.";
    const friendly = message.includes("relation") || message.includes("Could not find the table")
      ? missingTableMessage()
      : message;

    return Response.json({ error: friendly }, { status: 500 });
  }
}
