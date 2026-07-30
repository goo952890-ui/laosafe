import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getRequiredRuntimeEnv } from "./runtime-env";

const ADMIN_COOKIE_NAME = "laosafe_admin_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 12;

function getRequiredEnv(name: "ADMIN_USERNAME" | "ADMIN_PASSWORD" | "ADMIN_SESSION_SECRET") {
  return getRequiredRuntimeEnv(name);
}

function base64UrlEncode(input: string) {
  return Buffer.from(input, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(input: string) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return Buffer.from(`${normalized}${padding}`, "base64").toString("utf8");
}

async function sign(value: string) {
  const secret = getRequiredEnv("ADMIN_SESSION_SECRET");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return Buffer.from(signature)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function buildSessionToken(username: string) {
  const payload = {
    username,
    expiresAt: Date.now() + SESSION_TTL_MS,
  };
  const encoded = base64UrlEncode(JSON.stringify(payload));
  const signature = await sign(encoded);
  return `${encoded}.${signature}`;
}

async function parseSessionToken(token: string | undefined) {
  if (!token) return null;

  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;

  const expected = await sign(encoded);
  if (expected !== signature) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(encoded)) as {
      username: string;
      expiresAt: number;
    };

    if (payload.expiresAt < Date.now()) return null;

    return payload;
  } catch {
    return null;
  }
}

export function getAdminUsername() {
  return getRequiredEnv("ADMIN_USERNAME");
}

export function validateAdminCredentials(username: string, password: string) {
  return (
    username === getRequiredEnv("ADMIN_USERNAME") &&
    password === getRequiredEnv("ADMIN_PASSWORD")
  );
}

export async function createAdminSessionCookie() {
  const cookieStore = await cookies();
  const token = await buildSessionToken(getRequiredEnv("ADMIN_USERNAME"));

  cookieStore.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export async function clearAdminSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE_NAME);
}

export async function getAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  return parseSessionToken(token);
}

export async function requireAdminSession() {
  const session = await getAdminSession();
  if (!session) {
    redirect("/admin/login");
  }

  return session;
}
