import { requireAdminSession } from "@/lib/admin-auth";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { triggerStoredHomeStatsRefresh } from "@/lib/site-stats";
import { invalidateSiteRepositoryCaches } from "@/lib/site-repository";

export async function PATCH(request: Request) {
  await requireAdminSession();

  if (!isSupabaseConfigured()) {
    return Response.json({ error: "Supabase가 설정되지 않았습니다." }, { status: 500 });
  }

  const payload = (await request.json()) as {
    kind?: "phone" | "account";
    normalized?: string;
    status?: "visible" | "hidden";
  };

  if (!payload.kind || !payload.normalized || !payload.status) {
    return Response.json({ error: "대상 정보가 올바르지 않습니다." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("evaluations")
    .update({
      status: payload.status,
      updated_at: new Date().toISOString(),
    })
    .eq("target_type", payload.kind === "phone" ? "phone" : "bank_account")
    .eq("target_normalized", payload.normalized);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  triggerStoredHomeStatsRefresh();
  invalidateSiteRepositoryCaches();

  return Response.json({ ok: true });
}
