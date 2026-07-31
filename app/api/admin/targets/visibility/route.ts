import { requireAdminSession } from "@/lib/admin-auth";
import { parseEvaluationMeta, serializeEvaluationMeta } from "@/lib/evaluation-meta";
import {
  formatAccountDisplay,
  formatPhoneDisplay,
  getPhoneLookupVariants,
  normalizeAccountLookupKey,
  normalizePhone,
} from "@/lib/site-utils";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { triggerStoredHomeStatsRefresh } from "@/lib/site-stats";
import { invalidateSiteRepositoryCaches } from "@/lib/site-repository";

export async function PATCH(request: Request) {
  await requireAdminSession();

  if (!isSupabaseConfigured()) {
    return Response.json({ error: "Supabase가 설정되지 않았습니다." }, { status: 500 });
  }

  const payload = (await request.json()) as {
    kind?: "phone" | "account";
    normalized?: string;
    status?: "visible" | "hidden" | "deleted";
  };

  if (!payload.kind || !payload.normalized || !payload.status) {
    return Response.json({ error: "대상 정보가 올바르지 않습니다." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const targetType = payload.kind === "phone" ? "phone" : "bank_account";
  const targetNormalizeds =
    payload.kind === "phone"
      ? [...new Set(getPhoneLookupVariants(payload.normalized).map(normalizePhone).filter(Boolean))]
      : [normalizeAccountLookupKey(payload.normalized)].filter(Boolean);

  const { data: rows, error: currentError } = await supabase
    .from("evaluations")
    .select("id, user_agent, target_normalized, target_display, evaluation, comment, ip_hash, encrypted_ip, device_fingerprint, created_at, updated_at, status")
    .eq("target_type", targetType)
    .in("target_normalized", targetNormalizeds);

  if (currentError) {
    return Response.json({ error: currentError.message }, { status: 500 });
  }

  const now = new Date().toISOString();
  const canonicalNormalized =
    payload.kind === "phone"
      ? normalizePhone(payload.normalized)
      : normalizeAccountLookupKey(payload.normalized);
  const canonicalDisplay =
    payload.kind === "phone"
      ? formatPhoneDisplay(canonicalNormalized)
      : formatAccountDisplay(canonicalNormalized);

  if (payload.status === "visible") {
    for (const row of rows ?? []) {
      const meta = parseEvaluationMeta(row.user_agent);
      const { error } = await supabase
        .from("evaluations")
        .update({
          status: "visible",
          user_agent: serializeEvaluationMeta({
            nickname: meta.nickname,
            isAdmin: meta.isAdmin,
            safeApprovalPending: false,
          }),
          updated_at: now,
        })
        .eq("id", row.id);

      if (error) {
        return Response.json({ error: error.message }, { status: 500 });
      }
    }

    if (payload.kind === "phone") {
      const { error } = await supabase.from("phone_numbers").upsert(
        {
          normalized_number: canonicalNormalized,
          display_number: canonicalDisplay,
          updated_at: now,
        },
        { onConflict: "normalized_number" },
      );

      if (error) {
        return Response.json({ error: error.message }, { status: 500 });
      }
    } else {
      const { error } = await supabase.from("bank_accounts").upsert(
        {
          normalized_account_number: canonicalNormalized,
          display_account_number: canonicalDisplay,
          updated_at: now,
        },
        { onConflict: "normalized_account_number" },
      );

      if (error) {
        return Response.json({ error: error.message }, { status: 500 });
      }
    }
  } else if (payload.status === "hidden") {
    const { error } = await supabase
      .from("evaluations")
      .update({
        status: "hidden",
        updated_at: now,
      })
      .eq("target_type", targetType)
      .in("target_normalized", targetNormalizeds);

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }
  } else {
    const [
      { data: voteRows, error: voteError },
      { data: requestRows, error: requestError },
      { data: phoneRow, error: phoneError },
      { data: accountRow, error: accountError },
      { data: qrRows, error: qrReadError },
    ] = await Promise.all([
      supabase
        .from("votes")
        .select("id, vote, ip_hash, encrypted_ip, created_at, updated_at, target_normalized, target_display")
        .eq("target_type", targetType)
        .in("target_normalized", targetNormalizeds),
      supabase
        .from("deletion_requests")
        .select("id, reason, description, contact, status, created_at, updated_at")
        .eq("target_type", targetType)
        .or(`target_label.eq.${canonicalDisplay},target_label.eq.${canonicalNormalized}`),
      payload.kind === "phone"
        ? supabase
            .from("phone_numbers")
            .select("normalized_number, display_number, created_at, updated_at")
            .eq("normalized_number", canonicalNormalized)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      payload.kind === "account"
        ? supabase
            .from("bank_accounts")
            .select(
              "normalized_account_number, display_account_number, bank_name, recipient_name, masked_recipient_name, created_at, updated_at",
            )
            .eq("normalized_account_number", canonicalNormalized)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      payload.kind === "account"
        ? supabase
            .from("qr_scans")
            .select("id, qr_payload, extracted_account_number, scan_status, error_code, created_at")
            .in("extracted_account_number", targetNormalizeds)
            .order("created_at", { ascending: false })
            .limit(20)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (voteError) {
      return Response.json({ error: voteError.message }, { status: 500 });
    }

    if (requestError) {
      return Response.json({ error: requestError.message }, { status: 500 });
    }
    if (phoneError) {
      return Response.json({ error: phoneError.message }, { status: 500 });
    }
    if (accountError) {
      return Response.json({ error: accountError.message }, { status: 500 });
    }
    if (qrReadError) {
      return Response.json({ error: qrReadError.message }, { status: 500 });
    }

    const commentRows = (rows ?? []).filter((row) => row.comment?.trim().length > 0);
    const firstReport =
      commentRows.sort((a, b) => a.created_at.localeCompare(b.created_at))[0] ??
      (rows ?? []).sort((a, b) => a.created_at.localeCompare(b.created_at))[0] ??
      null;

    const { error: archiveError } = await supabase.from("deleted_targets").insert({
      target_type: targetType,
      target_normalized: canonicalNormalized,
      target_display: canonicalDisplay,
      evaluation: firstReport?.evaluation ?? null,
      first_comment: firstReport?.comment ?? "",
      reported_at: firstReport?.created_at ?? null,
      deleted_at: now,
      archived_payload: {
        evaluations: rows ?? [],
        votes: voteRows ?? [],
        deletionRequests: requestRows ?? [],
        phoneRow: phoneRow ?? null,
        accountRow: accountRow ?? null,
        qrRows: qrRows ?? [],
      },
    });

    if (archiveError) {
      return Response.json({ error: archiveError.message }, { status: 500 });
    }

    const deleteTasks = [
      supabase.from("evaluations").delete().eq("target_type", targetType).in("target_normalized", targetNormalizeds),
      supabase.from("votes").delete().eq("target_type", targetType).in("target_normalized", targetNormalizeds),
      payload.kind === "phone"
        ? supabase.from("phone_numbers").delete().in("normalized_number", targetNormalizeds)
        : supabase.from("bank_accounts").delete().in("normalized_account_number", targetNormalizeds),
    ];

    if (payload.kind === "account") {
      deleteTasks.push(
        supabase.from("qr_scans").delete().in("extracted_account_number", targetNormalizeds),
      );
    }

    const deleteResults = await Promise.all(deleteTasks);
    const failed = deleteResults.find((result) => result.error);

    if (failed?.error) {
      return Response.json({ error: failed.error.message }, { status: 500 });
    }
  }

  triggerStoredHomeStatsRefresh();
  invalidateSiteRepositoryCaches();

  return Response.json({ ok: true });
}
