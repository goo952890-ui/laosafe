import { cookies, headers } from "next/headers";

import { USER_LOCALE_COOKIE, type UserLocale, normalizeUserLocale } from "@/lib/i18n";
import { USER_LOCALE_HEADER } from "@/lib/locale-constants";

export async function getUserLocale(): Promise<UserLocale> {
  const requestHeaders = await headers();
  const headerLocale = requestHeaders.get(USER_LOCALE_HEADER);
  if (headerLocale) {
    return normalizeUserLocale(headerLocale);
  }

  const cookieStore = await cookies();
  return normalizeUserLocale(cookieStore.get(USER_LOCALE_COOKIE)?.value);
}
