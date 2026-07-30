import { getAdminSession } from "@/lib/admin-auth";
import { saveTermsContent } from "@/lib/content-repository";
import type { UserLocale } from "@/lib/i18n";
import { isSupabaseConfigured } from "@/lib/supabase";

function missingTableMessage() {
  return "Supabase 테이블이 아직 준비되지 않았습니다. `supabase/schema.sql`을 SQL Editor에서 먼저 실행해 주세요.";
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return Response.json(
      { error: "Supabase 환경변수가 설정되지 않았습니다." },
      { status: 500 },
    );
  }

  const payload = (await request.json()) as {
    contents?: Partial<Record<UserLocale, string>>;
  };
  const locales: UserLocale[] = ["lo", "ko", "en"];

  if (!payload.contents) {
    return Response.json({ error: "이용약관 내용을 입력해 주세요." }, { status: 400 });
  }

  for (const locale of locales) {
    const content = String(payload.contents[locale] ?? "").trim();
    if (!content) {
      return Response.json({ error: `${locale.toUpperCase()} 약관 내용을 입력해 주세요.` }, { status: 400 });
    }
  }

  try {
    await Promise.all(
      locales.map((locale) => saveTermsContent(locale, String(payload.contents?.[locale] ?? "").trim())),
    );
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "이용약관을 저장하지 못했습니다.";
    const friendly =
      message.includes("relation") || message.includes("Could not find the table")
        ? missingTableMessage()
        : message;

    return Response.json({ error: friendly }, { status: 500 });
  }
}
