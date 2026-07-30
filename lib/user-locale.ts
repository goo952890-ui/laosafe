import { cookies } from "next/headers";

import { USER_LOCALE_COOKIE, type UserLocale, normalizeUserLocale } from "@/lib/i18n";

export async function getUserLocale(): Promise<UserLocale> {
  const cookieStore = await cookies();
  return normalizeUserLocale(cookieStore.get(USER_LOCALE_COOKIE)?.value);
}
