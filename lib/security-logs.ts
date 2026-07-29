import { getSupabaseAdmin, isSupabaseConfigured } from "./supabase";

export type SecurityLogType = "input_validation_failed" | "abnormal_ip_blocked";
export type SecurityLogSource = "evaluation" | "deletion_request" | "lookup_rate_limit";

export type SecurityLogRow = {
  id: number;
  log_type: SecurityLogType;
  source: SecurityLogSource;
  target_type?: "phone" | "bank_account" | null;
  target_value?: string | null;
  ip?: string | null;
  identity_key?: string | null;
  detail?: string | null;
  created_at: string;
};

function isMissingTableError(message: string) {
  return (
    message.includes("relation") ||
    message.includes("does not exist") ||
    message.includes("Could not find the table")
  );
}

export async function writeSecurityLog(input: {
  logType: SecurityLogType;
  source: SecurityLogSource;
  targetType?: "phone" | "bank_account" | null;
  targetValue?: string | null;
  ip?: string | null;
  identityKey?: string | null;
  detail?: string | null;
}) {
  if (!isSupabaseConfigured()) return;

  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("security_logs").insert({
      log_type: input.logType,
      source: input.source,
      target_type: input.targetType ?? null,
      target_value: input.targetValue ?? null,
      ip: input.ip ?? null,
      identity_key: input.identityKey ?? null,
      detail: input.detail ?? null,
    });

    if (error) throw error;
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (isMissingTableError(message)) {
      return;
    }

    console.error("Security log write failed", error);
  }
}
