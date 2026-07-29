type LookupRateLimitState = {
  windowStartedAt: number;
  requestCount: number;
  blockedUntil: number;
};

type LookupRateLimitResult =
  | {
      blocked: false;
      ip: string;
      justBlocked: false;
    }
  | {
      blocked: true;
      ip: string;
      blockedUntil: number;
      remainingMs: number;
      justBlocked: boolean;
    };

const LOOKUP_WINDOW_MS = 60_000;
const LOOKUP_LIMIT = 20;
const LOOKUP_BLOCK_MS = 30 * 60_000;
const LOOKUP_STATE_TTL_MS = 2 * 60 * 60_000;
export const LOOKUP_COOKIE_NAME = "laosafe_lookup_token";
export const LOOKUP_REQUEST_HEADER = "x-laosafe-lookup-token";

function getLookupRateLimitStore() {
  const globalScope = globalThis as typeof globalThis & {
    __laoSafeLookupRateLimitStore__?: Map<string, LookupRateLimitState>;
  };

  if (!globalScope.__laoSafeLookupRateLimitStore__) {
    globalScope.__laoSafeLookupRateLimitStore__ = new Map<string, LookupRateLimitState>();
  }

  return globalScope.__laoSafeLookupRateLimitStore__;
}

export function extractClientIp(headers: Headers) {
  return (
    headers.get("cf-connecting-ip")?.trim() ||
    headers.get("x-real-ip")?.trim() ||
    headers
      .get("x-forwarded-for")
      ?.split(",")[0]
      ?.trim() ||
    "unknown"
  );
}

export function getLookupIdentity(ip: string, token?: string | null) {
  const normalizedToken = token?.trim();
  return normalizedToken ? `${ip}::${normalizedToken}` : ip;
}

export function checkLookupRateLimit(ip: string): LookupRateLimitResult {
  const now = Date.now();
  const store = getLookupRateLimitStore();

  for (const [key, state] of store.entries()) {
    if (
      state.blockedUntil < now &&
      now - state.windowStartedAt > LOOKUP_STATE_TTL_MS
    ) {
      store.delete(key);
    }
  }

  const current =
    store.get(ip) ??
    ({
      windowStartedAt: now,
      requestCount: 0,
      blockedUntil: 0,
    } satisfies LookupRateLimitState);

  if (current.blockedUntil > now) {
    return {
      blocked: true,
      ip,
      blockedUntil: current.blockedUntil,
      remainingMs: current.blockedUntil - now,
      justBlocked: false,
    };
  }

  if (now - current.windowStartedAt >= LOOKUP_WINDOW_MS) {
    current.windowStartedAt = now;
    current.requestCount = 0;
    current.blockedUntil = 0;
  }

  current.requestCount += 1;

  if (current.requestCount >= LOOKUP_LIMIT) {
    current.blockedUntil = now + LOOKUP_BLOCK_MS;
    current.windowStartedAt = now;
    current.requestCount = 0;
    store.set(ip, current);

    return {
      blocked: true,
      ip,
      blockedUntil: current.blockedUntil,
      remainingMs: LOOKUP_BLOCK_MS,
      justBlocked: true,
    };
  }

  store.set(ip, current);

  return {
    blocked: false,
    ip,
    justBlocked: false,
  };
}

export function formatRemainingMinutes(remainingMs: number) {
  return Math.max(1, Math.ceil(remainingMs / 60_000));
}
