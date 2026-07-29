import { createAdminSessionCookie, validateAdminCredentials } from "@/lib/admin-auth";

export async function POST(request: Request) {
  const payload = (await request.json()) as {
    username?: string;
    password?: string;
  };

  if (!payload.username || !payload.password) {
    return Response.json({ error: "아이디와 비밀번호를 입력해 주세요." }, { status: 400 });
  }

  if (!validateAdminCredentials(payload.username, payload.password)) {
    return Response.json({ error: "관리자 인증에 실패했습니다." }, { status: 401 });
  }

  await createAdminSessionCookie();
  return Response.json({ ok: true });
}
