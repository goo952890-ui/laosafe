import { NextResponse } from "next/server";
import { env as workerEnv } from "cloudflare:workers";

import { getRuntimeEnv } from "@/lib/runtime-env";

export const dynamic = "force-dynamic";

export async function GET() {
  const workerRecord = workerEnv as Record<string, unknown> | undefined;

  return NextResponse.json({
    processEnvPresent: {
      nextPublicSupabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      nextPublicSupabasePublishableKey: Boolean(
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      ),
      supabaseSecretKey: Boolean(process.env.SUPABASE_SECRET_KEY),
      adminUsername: Boolean(process.env.ADMIN_USERNAME),
      adminPassword: Boolean(process.env.ADMIN_PASSWORD),
    },
    workerEnvPresent: {
      nextPublicSupabaseUrl: typeof workerRecord?.NEXT_PUBLIC_SUPABASE_URL === "string",
      nextPublicSupabasePublishableKey:
        typeof workerRecord?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY === "string",
      supabaseSecretKey: typeof workerRecord?.SUPABASE_SECRET_KEY === "string",
      adminUsername: typeof workerRecord?.ADMIN_USERNAME === "string",
      adminPassword: typeof workerRecord?.ADMIN_PASSWORD === "string",
    },
    runtimeEnvPresent: {
      nextPublicSupabaseUrl: Boolean(getRuntimeEnv("NEXT_PUBLIC_SUPABASE_URL")),
      nextPublicSupabasePublishableKey: Boolean(
        getRuntimeEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
      ),
      supabaseSecretKey: Boolean(getRuntimeEnv("SUPABASE_SECRET_KEY")),
      adminUsername: Boolean(getRuntimeEnv("ADMIN_USERNAME")),
      adminPassword: Boolean(getRuntimeEnv("ADMIN_PASSWORD")),
    },
  });
}
