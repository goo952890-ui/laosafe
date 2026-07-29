import { NextResponse, type NextRequest } from "next/server";

import {
  LOOKUP_COOKIE_NAME,
  LOOKUP_REQUEST_HEADER,
} from "@/lib/lookup-rate-limit";

const LOOKUP_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

function createLookupToken() {
  return crypto.randomUUID().replace(/-/g, "");
}

export function proxy(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith("/lookup/")) {
    return NextResponse.next();
  }

  const existingToken = request.cookies.get(LOOKUP_COOKIE_NAME)?.value?.trim();
  const token = existingToken || createLookupToken();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(LOOKUP_REQUEST_HEADER, token);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  if (!existingToken) {
    response.cookies.set(LOOKUP_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: LOOKUP_COOKIE_MAX_AGE,
    });
  }

  return response;
}

export const config = {
  matcher: ["/lookup/:path*"],
};
