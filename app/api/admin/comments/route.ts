import { requireAdminSession } from "@/lib/admin-auth";
import { serializeEvaluationMeta } from "@/lib/evaluation-meta";
import { MAX_REPORT_COMMENT_LENGTH, validatePlainText } from "@/lib/input-validation";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { triggerStoredHomeStatsRefresh } from "@/lib/site-stats";
import { invalidateSiteRepositoryCaches } from "@/lib/site-repository";

export async function POST(request: Request) {
  await requireAdminSession();

  if (!isSupabaseConfigured()) {
    return Response.json({ error: "Supabase가 설정되지 않았습니다." }, { status: 500 });
  }

  const payload = (await request.json()) as {
    targetType?: "phone" | "account";
    targetNormalized?: string;
    targetDisplay?: string;
    comment?: string;
  };

  if (!payload.targetType || !payload.targetNormalized || !payload.targetDisplay || !payload.comment?.trim()) {
    return Response.json({ error: "관리자 댓글 정보가 올바르지 않습니다." }, { status: 400 });
  }

  const commentError = validatePlainText(payload.comment, false, "ko", MAX_REPORT_COMMENT_LENGTH);
  if (commentError) {
    return Response.json({ error: commentError }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("evaluations").insert({
    target_type: payload.targetType === "phone" ? "phone" : "bank_account",
    target_normalized: payload.targetNormalized,
    target_display: payload.targetDisplay,
    evaluation: "safe",
    comment: payload.comment.trim(),
    user_agent: serializeEvaluationMeta({ nickname: "admin", isAdmin: true }),
    status: "visible",
  });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  triggerStoredHomeStatsRefresh();
  invalidateSiteRepositoryCaches();

  return Response.json({ ok: true });
}
