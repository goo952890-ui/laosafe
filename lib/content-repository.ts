import type { UserLocale } from "./i18n";
import { DEFAULT_TERMS_CONTENTS } from "./site-content";
import { getSupabaseAdmin, isSupabaseConfigured } from "./supabase";
import type { AdminInquiryRow } from "./admin-types";

function isMissingTableError(message: string) {
  return (
    message.includes("relation") ||
    message.includes("does not exist") ||
    message.includes("Could not find the table")
  );
}

export async function getTermsContent(locale: UserLocale) {
  if (!isSupabaseConfigured()) {
    return DEFAULT_TERMS_CONTENTS[locale];
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("site_contents")
      .select("content")
      .eq("key", `terms_${locale}`)
      .maybeSingle();

    if (error) throw error;

    return data?.content?.trim() ? data.content : DEFAULT_TERMS_CONTENTS[locale];
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (isMissingTableError(message)) {
      return DEFAULT_TERMS_CONTENTS[locale];
    }

    throw error;
  }
}

export async function getAllTermsContents() {
  const locales: UserLocale[] = ["lo", "ko", "en"];
  const results = await Promise.all(locales.map((locale) => getTermsContent(locale)));

  return {
    lo: results[0],
    ko: results[1],
    en: results[2],
  } satisfies Record<UserLocale, string>;
}

export async function saveTermsContent(locale: UserLocale, content: string) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("site_contents").upsert(
    {
      key: `terms_${locale}`,
      content,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" },
  );

  if (error) throw error;
}

export async function createContactInquiry(input: {
  name: string;
  email: string;
  message: string;
}) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("contact_inquiries").insert({
    name: input.name,
    email: input.email,
    message: input.message,
  });

  if (error) throw error;
}

export async function getAdminInquiriesPage(page: number, pageSize = 10) {
  const safePage = Math.max(1, page);

  if (!isSupabaseConfigured()) {
    return {
      title: "문의하기",
      totalPages: 1,
      items: [] as AdminInquiryRow[],
    };
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error, count } = await supabase
      .from("contact_inquiries")
      .select("id, name, email, message, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .range((safePage - 1) * pageSize, safePage * pageSize - 1);

    if (error) throw error;

    const totalCount = count ?? data?.length ?? 0;

    return {
      title: "문의하기",
      totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
      items: (data ?? []) as AdminInquiryRow[],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (isMissingTableError(message)) {
      return {
        title: "문의하기",
        totalPages: 1,
        items: [] as AdminInquiryRow[],
      };
    }

    throw error;
  }
}
