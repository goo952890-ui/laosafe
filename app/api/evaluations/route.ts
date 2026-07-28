import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import {
  formatAccountDisplay,
  formatPhoneDisplay,
  normalizeAccount,
  normalizePhone,
} from "@/lib/site-utils";

function missingTableMessage() {
  return "Supabase 테이블이 아직 준비되지 않았습니다. `supabase/schema.sql`을 SQL Editor에서 먼저 실행해 주세요.";
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return Response.json(
      { error: "Supabase 환경변수가 설정되지 않았습니다." },
      { status: 500 },
    );
  }

  const payload = (await request.json()) as {
    targetType?: "phone" | "account";
    targetNormalized?: string;
    targetDisplay?: string;
    evaluation?: "spam" | "safe";
    comment?: string;
  };

  if (!payload.targetType || !payload.targetNormalized || !payload.targetDisplay) {
    return Response.json({ error: "대상 정보가 올바르지 않습니다." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const normalized =
    payload.targetType === "phone"
      ? normalizePhone(payload.targetNormalized)
      : normalizeAccount(payload.targetNormalized);
  const display =
    payload.targetType === "phone"
      ? formatPhoneDisplay(normalized)
      : formatAccountDisplay(normalized);

  try {
    if (payload.targetType === "phone") {
      const { error } = await supabase.from("phone_numbers").upsert(
        {
          normalized_number: normalized,
          display_number: display,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "normalized_number" },
      );

      if (error) throw error;
    } else {
      const { error } = await supabase.from("bank_accounts").upsert(
        {
          normalized_account_number: normalized,
          display_account_number: display,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "normalized_account_number" },
      );

      if (error) throw error;
    }

    const { error } = await supabase.from("evaluations").insert({
      target_type: payload.targetType === "phone" ? "phone" : "bank_account",
      target_normalized: normalized,
      target_display: display,
      evaluation: payload.evaluation ?? "spam",
      comment: payload.comment?.trim() ?? "",
      status: "visible",
    });

    if (error) throw error;

    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "평가를 등록하지 못했습니다.";
    const friendly = message.includes("relation") || message.includes("Could not find the table")
      ? missingTableMessage()
      : message;

    return Response.json({ error: friendly }, { status: 500 });
  }
}
