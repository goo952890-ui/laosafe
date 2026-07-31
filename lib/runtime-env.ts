import { env as workerEnv } from "cloudflare:workers";

type WorkerEnvRecord = Record<string, unknown>;

const FALLBACK_RUNTIME_ENV: Record<string, string> = {
  TELEGRAM_REPORT_BOT_TOKEN: "8611098474:AAE1dJmYZwWhczveTMg6mBi80roRba2Qdpw",
  TELEGRAM_REPORT_CHAT_ID: "8071349104",
  TELEGRAM_COMMENT_BOT_TOKEN: "8960956476:AAFU4lwcEe5PALonFr6xZS68e4Z6d31heAo",
  TELEGRAM_COMMENT_CHAT_ID: "8071349104",
  TELEGRAM_DELETION_BOT_TOKEN: "8478715620:AAF-hNi5u1G77cVfM4o4qVQgiDgDJP4JP4M",
  TELEGRAM_DELETION_CHAT_ID: "8071349104",
};

function readWorkerEnv(name: string) {
  const record = workerEnv as WorkerEnvRecord | undefined;
  const value = record?.[name];
  return typeof value === "string" ? value : undefined;
}

function readKnownProcessEnv(name: string) {
  switch (name) {
    case "NEXT_PUBLIC_SUPABASE_URL":
      return process.env.NEXT_PUBLIC_SUPABASE_URL;
    case "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY":
      return process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    case "SUPABASE_SECRET_KEY":
      return process.env.SUPABASE_SECRET_KEY;
    case "ADMIN_USERNAME":
      return process.env.ADMIN_USERNAME;
    case "ADMIN_PASSWORD":
      return process.env.ADMIN_PASSWORD;
    case "ADMIN_SESSION_SECRET":
      return process.env.ADMIN_SESSION_SECRET;
    case "TELEGRAM_REPORT_BOT_TOKEN":
      return process.env.TELEGRAM_REPORT_BOT_TOKEN;
    case "TELEGRAM_REPORT_CHAT_ID":
      return process.env.TELEGRAM_REPORT_CHAT_ID;
    case "TELEGRAM_COMMENT_BOT_TOKEN":
      return process.env.TELEGRAM_COMMENT_BOT_TOKEN;
    case "TELEGRAM_COMMENT_CHAT_ID":
      return process.env.TELEGRAM_COMMENT_CHAT_ID;
    case "TELEGRAM_DELETION_BOT_TOKEN":
      return process.env.TELEGRAM_DELETION_BOT_TOKEN;
    case "TELEGRAM_DELETION_CHAT_ID":
      return process.env.TELEGRAM_DELETION_CHAT_ID;
    default:
      return process.env[name];
  }
}

export function getRuntimeEnv(name: string) {
  const processValue = readKnownProcessEnv(name);
  if (processValue) {
    return processValue;
  }

  const workerValue = readWorkerEnv(name);
  if (workerValue) {
    return workerValue;
  }

  if (name === "ADMIN_USERNAME") {
    return "admin";
  }

  if (FALLBACK_RUNTIME_ENV[name]) {
    return FALLBACK_RUNTIME_ENV[name];
  }

  return undefined;
}

export function getRequiredRuntimeEnv(name: string) {
  const value = getRuntimeEnv(name);

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function hasRuntimeEnv(name: string) {
  return Boolean(getRuntimeEnv(name));
}
