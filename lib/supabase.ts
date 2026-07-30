import { createClient } from "@supabase/supabase-js";
import { getRequiredRuntimeEnv, hasRuntimeEnv } from "./runtime-env";

function getRequiredEnv(name: string) {
  return getRequiredRuntimeEnv(name);
}

export function isSupabaseConfigured() {
  return Boolean(
    hasRuntimeEnv("NEXT_PUBLIC_SUPABASE_URL") &&
      hasRuntimeEnv("SUPABASE_SECRET_KEY"),
  );
}

export function getSupabaseAdmin() {
  return createClient(
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getRequiredEnv("SUPABASE_SECRET_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
