import { requireAdminSession } from "@/lib/admin-auth";
import { parseEvaluationMeta, serializeEvaluationMeta } from "@/lib/evaluation-meta";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { triggerStoredHomeStatsRefresh } from "@/lib/site-stats";
import { invalidateSiteRepositoryCaches } from "@/lib/site-repository";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireAdminSession();

  if (!isSupabaseConfigured()) {
    return Response.json({ error: "Supabase가 설정되지 않았습니다." }, { status: 500 });
  }

  const resolved = await params;
  const payload = (await request.json()) as {
    status?: "visible" | "hidden" | "deleted";
  };

  if (!payload.status) {
    return Response.json({ error: "변경할 상태가 없습니다." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data: current, error: currentError } = await supabase
    .from("evaluations")
    .select("user_agent")
    .eq("id", Number(resolved.id))
    .maybeSingle();

  if (currentError) {
    return Response.json({ error: currentError.message }, { status: 500 });
  }

  const meta = parseEvaluationMeta(current?.user_agent);
  const { error } = await supabase
    .from("evaluations")
    .update({
      status: payload.status,
      user_agent:
        payload.status === "visible" && meta.safeApprovalPending
          ? serializeEvaluationMeta({
              nickname: meta.nickname,
              isAdmin: meta.isAdmin,
              safeApprovalPending: false,
            })
          : current?.user_agent ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", Number(resolved.id));

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  triggerStoredHomeStatsRefresh();
  invalidateSiteRepositoryCaches();

  return Response.json({ ok: true });
}
