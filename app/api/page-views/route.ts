import { NextResponse } from "next/server";

import { recordTargetPageView } from "@/lib/page-views";
import { normalizeUserLocale } from "@/lib/i18n";
import { normalizeAccountLookupKey, normalizePhone } from "@/lib/site-utils";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const payload = (await request.json()) as {
    kind?: "phone" | "account";
    normalized?: string;
    locale?: string;
    path?: string;
  };

  if (!payload.kind || !payload.normalized || !payload.path) {
    return NextResponse.json({ error: "Invalid page view payload." }, { status: 400 });
  }

  const normalized =
    payload.kind === "phone"
      ? normalizePhone(payload.normalized)
      : normalizeAccountLookupKey(payload.normalized);

  if (!normalized) {
    return NextResponse.json({ error: "Invalid target." }, { status: 400 });
  }

  await recordTargetPageView(
    payload.kind,
    normalized,
    normalizeUserLocale(payload.locale),
    payload.path,
  );

  return NextResponse.json({ ok: true });
}
