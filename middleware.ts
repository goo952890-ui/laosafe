import { NextResponse, type NextRequest } from "next/server";

import {
  USER_LOCALE_COOKIE,
  isUserLocale,
  normalizeUserLocale,
} from "@/lib/i18n";
import { USER_LOCALE_HEADER } from "@/lib/locale-constants";

export function middleware(request: NextRequest) {
  const langParam = request.nextUrl.searchParams.get("lang");
  const cookieLocale = request.cookies.get(USER_LOCALE_COOKIE)?.value;
  const locale = normalizeUserLocale(isUserLocale(langParam) ? langParam : cookieLocale);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(USER_LOCALE_HEADER, locale);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  if (langParam || cookieLocale !== locale) {
    response.cookies.set(USER_LOCALE_COOKIE, locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\..*).*)"],
};
