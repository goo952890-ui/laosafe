import { NextResponse } from "next/server";

import { normalizeUserLocale } from "@/lib/i18n";
import { recordSiteDailyPageView } from "@/lib/page-views";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const payload = (await request.json()) as {
    locale?: string;
    path?: string;
  };

  if (!payload.path) {
    return NextResponse.json({ error: "Invalid page view payload." }, { status: 400 });
  }

  await recordSiteDailyPageView(normalizeUserLocale(payload.locale), payload.path);

  return NextResponse.json({ ok: true });
}
