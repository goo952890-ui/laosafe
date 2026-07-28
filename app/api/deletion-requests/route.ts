import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";

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
    targetLabel?: string;
    reason?: string;
    description?: string;
    contact?: string;
  };

  if (!payload.targetType || !payload.targetLabel || !payload.reason) {
    return Response.json({ error: "삭제 요청 정보가 올바르지 않습니다." }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("deletion_requests").insert({
      target_type: payload.targetType === "phone" ? "phone" : "bank_account",
      target_label: payload.targetLabel,
      reason: payload.reason,
      description: payload.description?.trim() ?? "",
      contact: payload.contact?.trim() ?? "",
      status: "submitted",
    });

    if (error) throw error;

    return Response.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "삭제 요청을 접수하지 못했습니다.";
    const friendly = message.includes("relation") || message.includes("Could not find the table")
      ? missingTableMessage()
      : message;

    return Response.json({ error: friendly }, { status: 500 });
  }
}
