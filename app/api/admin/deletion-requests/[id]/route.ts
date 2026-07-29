import { requireAdminSession } from "@/lib/admin-auth";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";

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
    status?: "submitted" | "reviewing" | "resolved" | "rejected";
  };

  if (!payload.status) {
    return Response.json({ error: "변경할 상태가 없습니다." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("deletion_requests")
    .update({
      status: payload.status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", Number(resolved.id));

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}
