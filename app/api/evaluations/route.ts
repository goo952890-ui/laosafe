import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { triggerStoredHomeStatsRefresh } from "@/lib/site-stats";
import { invalidateSiteRepositoryCaches } from "@/lib/site-repository";
import { hashPassword, serializeEvaluationMeta } from "@/lib/evaluation-meta";
import { normalizeUserLocale } from "@/lib/i18n";
import {
  notifyTelegramComment,
  notifyTelegramReport,
} from "@/lib/telegram-alerts";
import {
  validatePlainText,
  validateQrPayload,
  validateTargetLength,
} from "@/lib/input-validation";
import { writeSecurityLog } from "@/lib/security-logs";
import {
  extractQrPayload,
  formatAccountDisplay,
  formatPhoneDisplay,
  getPhoneLookupVariants,
  normalizeAccountLookupKey,
  normalizePhone,
} from "@/lib/site-utils";

function missingTableMessage() {
  return "Supabase 테이블이 아직 준비되지 않았습니다. `supabase/schema.sql`을 SQL Editor에서 먼저 실행해 주세요.";
}

function getRequesterIdentity(request: Request) {
  const ip =
    request.headers.get("cf-connecting-ip")?.trim() ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip")?.trim() ??
    null;
  const clientVoteKey = request.headers.get("x-laosafe-vote-key")?.trim() ?? null;

  return {
    ip,
    identity: ip ?? clientVoteKey ?? "local-dev",
  };
}

export async function POST(request: Request) {
  const payload = (await request.json()) as {
    targetType?: "phone" | "account";
    targetNormalized?: string;
    targetDisplay?: string;
    evaluation?: "spam" | "safe";
    comment?: string;
    nickname?: string;
    password?: string;
    qrPayload?: string | null;
    storeNickname?: boolean;
    requirePassword?: boolean;
    requireSafeApproval?: boolean;
    submissionType?: "report" | "comment";
    locale?: string;
  };
  const locale = normalizeUserLocale(payload.locale);

  if (!isSupabaseConfigured()) {
    return Response.json(
      { error: locale === "lo" ? "ຍັງບໍ່ໄດ້ຕັ້ງຄ່າ Supabase." : locale === "en" ? "Supabase is not configured." : "Supabase 환경변수가 설정되지 않았습니다." },
      { status: 500 },
    );
  }

  if (!payload.targetType || !payload.targetNormalized || !payload.targetDisplay) {
    return Response.json({ error: locale === "lo" ? "ຂໍ້ມູນໝາຍເລກບໍ່ຖືກຕ້ອງ." : locale === "en" ? "Invalid target information." : "대상 정보가 올바르지 않습니다." }, { status: 400 });
  }
  const hasComment = Boolean(payload.comment?.trim());

  const requirePassword = payload.requirePassword !== false;
  const storeNickname = payload.storeNickname !== false;

  if (hasComment && requirePassword && !payload.password?.trim()) {
    return Response.json({ error: locale === "lo" ? "ກະລຸນາກອກລະຫັດຜ່ານສຳລັບລຶບ." : locale === "en" ? "Please enter the password used for deletion." : "삭제용 비밀번호를 입력해 주세요." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { ip, identity } = getRequesterIdentity(request);
  const normalized =
    payload.targetType === "phone"
      ? normalizePhone(payload.targetNormalized)
      : normalizeAccountLookupKey(payload.targetNormalized);
  const display =
    payload.targetType === "phone"
      ? formatPhoneDisplay(normalized)
      : formatAccountDisplay(normalized);
  const createdAt = new Date().toISOString().slice(0, 16).replace("T", " ");
  const targetType = payload.targetType === "phone" ? "phone" : "bank_account";
  const requiresSafeApproval =
    Boolean(payload.requireSafeApproval) && (payload.evaluation ?? "spam") === "safe" && hasComment;
  const targetNormalizeds =
    payload.targetType === "phone"
      ? [...new Set(getPhoneLookupVariants(normalized).map(normalizePhone).filter(Boolean))]
      : [normalized];

  const targetError = validateTargetLength(normalized, locale);
  if (targetError) {
    await writeSecurityLog({
      logType: "input_validation_failed",
      source: "evaluation",
      targetType,
      targetValue: normalized,
      ip,
      identityKey: identity,
      detail: targetError,
    });
    return Response.json({ error: targetError }, { status: 400 });
  }

  if (hasComment) {
    const commentError = validatePlainText(payload.comment ?? "", requireComment(payload.submissionType), locale);
    if (commentError) {
      await writeSecurityLog({
        logType: "input_validation_failed",
        source: "evaluation",
        targetType,
        targetValue: normalized,
        ip,
        identityKey: identity,
        detail: commentError,
      });
      return Response.json({ error: commentError }, { status: 400 });
    }
  }

  if (payload.targetType === "account" && payload.qrPayload) {
    const qrError = validateQrPayload(extractQrPayload(payload.qrPayload) ?? payload.qrPayload, locale);
    if (qrError) {
      await writeSecurityLog({
        logType: "input_validation_failed",
        source: "evaluation",
        targetType,
        targetValue: normalized,
        ip,
        identityKey: identity,
        detail: qrError,
      });
      return Response.json({ error: qrError }, { status: 400 });
    }
  }

  try {
    const { data: hiddenRows, error: hiddenRowsError } = await supabase
      .from("evaluations")
      .select("id, user_agent")
      .eq("target_type", targetType)
      .in("target_normalized", targetNormalizeds)
      .eq("status", "hidden");

    if (hiddenRowsError) throw hiddenRowsError;

    const hiddenTargetExists = (hiddenRows ?? []).length > 0;
    const hiddenTargetSpamReport =
      hiddenTargetExists && hasComment && (payload.evaluation ?? "spam") === "spam";

    if (!requiresSafeApproval && !hiddenTargetExists && payload.targetType === "phone") {
      const { error } = await supabase.from("phone_numbers").upsert(
        {
          normalized_number: normalized,
          display_number: display,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "normalized_number" },
      );

      if (error) throw error;
    } else if (!requiresSafeApproval && !hiddenTargetExists) {
      const { error } = await supabase.from("bank_accounts").upsert(
        {
          normalized_account_number: normalized,
          display_account_number: display,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "normalized_account_number" },
      );

      if (error) throw error;
    }

    if (!hasComment) {
      const { data: existingVote, error: existingVoteError } = await supabase
        .from("votes")
        .select("id, vote")
        .eq("target_type", targetType)
        .eq("target_normalized", normalized)
        .eq("ip_hash", identity)
        .maybeSingle();

      if (existingVoteError) throw existingVoteError;

      if (existingVote) {
        if (existingVote.vote === (payload.evaluation ?? "spam")) {
          const { error } = await supabase.from("votes").delete().eq("id", existingVote.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("votes")
            .update({
              vote: payload.evaluation ?? "spam",
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingVote.id);

          if (error) throw error;
        }
      } else {
        const { error } = await supabase.from("votes").insert({
          target_type: targetType,
          target_normalized: normalized,
          target_display: display,
          vote: payload.evaluation ?? "spam",
          ip_hash: identity,
          encrypted_ip: ip,
        });

        if (error) throw error;
      }
    } else {
      const nextStatus = requiresSafeApproval || hiddenTargetExists ? "hidden" : "visible";
      const nickname = hasComment && storeNickname
        ? (payload.nickname?.replace(/\D/g, "").slice(0, 5) || "00000").padStart(5, "0")
        : null;
      const passwordHash =
        hasComment && requirePassword && payload.password?.trim()
          ? await hashPassword(payload.password.trim())
          : null;
        const { error } = await supabase.from("evaluations").insert({
        target_type: targetType,
        target_normalized: normalized,
        target_display: display,
        evaluation: payload.evaluation ?? "spam",
        comment: payload.comment?.trim() ?? "",
        ip_hash: identity,
        encrypted_ip: ip,
        user_agent:
          nickname || requiresSafeApproval || hiddenTargetSpamReport
            ? serializeEvaluationMeta({
                nickname,
                safeApprovalPending: requiresSafeApproval,
                hiddenTargetReport: hiddenTargetSpamReport,
              })
            : null,
        device_fingerprint: passwordHash,
        status: nextStatus,
      });

      if (error) throw error;

      if (payload.submissionType === "report") {
        try {
          await notifyTelegramReport({
            request,
            targetType: payload.targetType,
            targetNormalized: normalized,
            targetDisplay: display,
            evaluation: payload.evaluation ?? "spam",
            comment: payload.comment?.trim() ?? "",
            createdAt,
          });
        } catch (notificationError) {
          console.error("Telegram report notification failed", notificationError);
        }
      }

      if (payload.submissionType === "comment") {
        try {
          await notifyTelegramComment({
            request,
            targetType: payload.targetType,
            targetNormalized: normalized,
            targetDisplay: display,
            nickname,
            comment: payload.comment?.trim() ?? "",
            createdAt,
          });
        } catch (notificationError) {
          console.error("Telegram comment notification failed", notificationError);
        }
      }
    }

    if (payload.targetType === "account") {
      const qrPayload = extractQrPayload(payload.qrPayload ?? payload.targetNormalized);

      if (qrPayload) {
        const { error: qrError } = await supabase.from("qr_scans").insert({
          qr_payload: qrPayload,
          extracted_account_number: normalized,
          scan_status: "success",
        });

        if (qrError) throw qrError;
      }
    }

    triggerStoredHomeStatsRefresh();
    invalidateSiteRepositoryCaches();

    return Response.json({
      ok: true,
      status:
        hasComment && payload.requireSafeApproval && (payload.evaluation ?? "spam") === "safe"
          ? "pending"
          : "visible",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : locale === "lo" ? "ບໍ່ສາມາດບັນທຶກໄດ້." : locale === "en" ? "Failed to submit." : "평가를 등록하지 못했습니다.";
    const friendly = message.includes("relation") || message.includes("Could not find the table")
      ? missingTableMessage()
      : message;

    return Response.json({ error: friendly }, { status: 500 });
  }
}

function requireComment(submissionType?: "report" | "comment") {
  return submissionType === "report";
}
