import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { hashPassword } from "@/lib/evaluation-meta";
import { triggerStoredHomeStatsRefresh } from "@/lib/site-stats";
import { invalidateSiteRepositoryCaches } from "@/lib/site-repository";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isSupabaseConfigured()) {
    return Response.json({ error: "Supabase가 설정되지 않았습니다." }, { status: 500 });
  }

  const resolved = await params;
  const payload = (await request.json()) as { password?: string };

  if (!payload.password?.trim()) {
    return Response.json({ error: "비밀번호를 입력해 주세요." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data: row, error: rowError } = await supabase
    .from("evaluations")
    .select("id, device_fingerprint, status")
    .eq("id", Number(resolved.id))
    .maybeSingle();

  if (rowError) {
    return Response.json({ error: rowError.message }, { status: 500 });
  }

  if (!row) {
    return Response.json({ error: "의견을 찾을 수 없습니다." }, { status: 404 });
  }

  const passwordHash = await hashPassword(payload.password.trim());

  if (!row.device_fingerprint || row.device_fingerprint !== passwordHash) {
    return Response.json({ error: "비밀번호가 일치하지 않습니다." }, { status: 403 });
  }

  const { error } = await supabase
    .from("evaluations")
    .update({
      status: "deleted",
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
