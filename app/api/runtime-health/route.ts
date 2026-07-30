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
      telegramReportBotToken: Boolean(process.env.TELEGRAM_REPORT_BOT_TOKEN),
      telegramReportChatId: Boolean(process.env.TELEGRAM_REPORT_CHAT_ID),
      telegramCommentBotToken: Boolean(process.env.TELEGRAM_COMMENT_BOT_TOKEN),
      telegramCommentChatId: Boolean(process.env.TELEGRAM_COMMENT_CHAT_ID),
      telegramDeletionBotToken: Boolean(process.env.TELEGRAM_DELETION_BOT_TOKEN),
      telegramDeletionChatId: Boolean(process.env.TELEGRAM_DELETION_CHAT_ID),
    },
    workerEnvPresent: {
      nextPublicSupabaseUrl: typeof workerRecord?.NEXT_PUBLIC_SUPABASE_URL === "string",
      nextPublicSupabasePublishableKey:
        typeof workerRecord?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY === "string",
      supabaseSecretKey: typeof workerRecord?.SUPABASE_SECRET_KEY === "string",
      adminUsername: typeof workerRecord?.ADMIN_USERNAME === "string",
      adminPassword: typeof workerRecord?.ADMIN_PASSWORD === "string",
      telegramReportBotToken: typeof workerRecord?.TELEGRAM_REPORT_BOT_TOKEN === "string",
      telegramReportChatId: typeof workerRecord?.TELEGRAM_REPORT_CHAT_ID === "string",
      telegramCommentBotToken: typeof workerRecord?.TELEGRAM_COMMENT_BOT_TOKEN === "string",
      telegramCommentChatId: typeof workerRecord?.TELEGRAM_COMMENT_CHAT_ID === "string",
      telegramDeletionBotToken: typeof workerRecord?.TELEGRAM_DELETION_BOT_TOKEN === "string",
      telegramDeletionChatId: typeof workerRecord?.TELEGRAM_DELETION_CHAT_ID === "string",
    },
    runtimeEnvPresent: {
      nextPublicSupabaseUrl: Boolean(getRuntimeEnv("NEXT_PUBLIC_SUPABASE_URL")),
      nextPublicSupabasePublishableKey: Boolean(
        getRuntimeEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
      ),
      supabaseSecretKey: Boolean(getRuntimeEnv("SUPABASE_SECRET_KEY")),
      adminUsername: Boolean(getRuntimeEnv("ADMIN_USERNAME")),
      adminPassword: Boolean(getRuntimeEnv("ADMIN_PASSWORD")),
      telegramReportBotToken: Boolean(getRuntimeEnv("TELEGRAM_REPORT_BOT_TOKEN")),
      telegramReportChatId: Boolean(getRuntimeEnv("TELEGRAM_REPORT_CHAT_ID")),
      telegramCommentBotToken: Boolean(getRuntimeEnv("TELEGRAM_COMMENT_BOT_TOKEN")),
      telegramCommentChatId: Boolean(getRuntimeEnv("TELEGRAM_COMMENT_CHAT_ID")),
      telegramDeletionBotToken: Boolean(getRuntimeEnv("TELEGRAM_DELETION_BOT_TOKEN")),
      telegramDeletionChatId: Boolean(getRuntimeEnv("TELEGRAM_DELETION_CHAT_ID")),
    },
  });
}
