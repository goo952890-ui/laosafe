"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { AdminDeletionRequestRow, AdminEvaluationRow } from "@/lib/admin-types";
import { parseEvaluationMeta } from "@/lib/evaluation-meta";

export function AdminModerationPanel({
  evaluations,
  deletionRequests,
  adminUsername,
}: {
  evaluations: AdminEvaluationRow[];
  deletionRequests: AdminDeletionRequestRow[];
  adminUsername: string;
}) {
  const router = useRouter();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function patchJson(url: string, body: Record<string, string>) {
    setBusyKey(url + JSON.stringify(body));
    setError(null);

    try {
      const response = await fetch(url, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "관리자 작업에 실패했습니다.");
      }

      router.refresh();
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "관리자 작업에 실패했습니다.",
      );
    } finally {
      setBusyKey(null);
    }
  }

  async function logout() {
    setBusyKey("logout");
    setError(null);

    try {
      await fetch("/api/admin/logout", { method: "POST" });
      router.push("/admin/login");
      router.refresh();
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <>
      <section className="subpage-section">
        <div className="subpage-heading">
          <div>
            <h1 className="subpage-title">평가 검토와 삭제 요청 처리</h1>
            <p className="section-copy">
              로그인된 운영자 계정으로 실제 Supabase 데이터를 검토하고 상태를 변경합니다.
            </p>
          </div>
          <div className="admin-session-bar">
            <span className="meta-copy">로그인: {adminUsername}</span>
            <button className="button-secondary" type="button" onClick={logout} disabled={busyKey === "logout"}>
              로그아웃
            </button>
          </div>
        </div>
        {error ? <div className="inline-notice inline-notice--warning">{error}</div> : null}
      </section>

      <section className="admin-layout">
        <article className="board-section">
          <div className="board-header">
            <h2 className="board-title">최근 평가</h2>
          </div>
          <div className="admin-list">
            {evaluations.length === 0 ? (
              <div className="empty-state">
                <p className="body-copy">등록된 평가가 없습니다.</p>
              </div>
            ) : (
              evaluations.map((item) => (
                <div className="admin-card" key={item.id}>
                  <strong>{item.target_display}</strong>
                  <p className="meta-copy">
                    {item.target_type === "phone" ? "전화번호" : "계좌번호"} · 상태 {statusLabel(item)} ·{" "}
                    {item.created_at.slice(0, 10)}
                  </p>
                  <p className="body-copy">{item.comment || "(의견 없음)"}</p>
                  <div className="button-row">
                    {isPendingSafeApproval(item) ? (
                      <button
                        className="button-secondary"
                        type="button"
                        onClick={() =>
                          patchJson(`/api/admin/evaluations/${item.id}`, {
                            status: "visible",
                          })
                        }
                        disabled={busyKey !== null}
                      >
                        승인
                      </button>
                    ) : null}
                    <button
                      className="button-secondary"
                      type="button"
                      onClick={() =>
                        patchJson(`/api/admin/evaluations/${item.id}`, {
                          status: item.status === "hidden" ? "visible" : "hidden",
                        })
                      }
                      disabled={busyKey !== null}
                    >
                      {item.status === "hidden" ? "다시 표시" : "숨김"}
                    </button>
                    <button
                      className="button-secondary"
                      type="button"
                      onClick={() =>
                        patchJson(`/api/admin/evaluations/${item.id}`, { status: "deleted" })
                      }
                      disabled={busyKey !== null || item.status === "deleted"}
                    >
                      삭제
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </article>

        <div className="side-stack">
          <section className="board-section">
            <div className="board-header">
              <h2 className="board-title">삭제 요청</h2>
            </div>
            <div className="admin-list">
              {deletionRequests.length === 0 ? (
                <div className="empty-state">
                  <p className="body-copy">접수된 삭제 요청이 없습니다.</p>
                </div>
              ) : (
                deletionRequests.map((request) => (
                  <div className="admin-card" key={request.id}>
                    <strong>{request.target_label}</strong>
                    <p className="meta-copy">
                      {request.reason} · 상태 {request.status} · {request.created_at.slice(0, 10)}
                    </p>
                    <p className="body-copy">{request.description || "(상세 설명 없음)"}</p>
                    <p className="meta-copy">연락처: {request.contact || "-"}</p>
                    <div className="button-row">
                      <button
                        className="button-secondary"
                        type="button"
                        onClick={() =>
                          patchJson(`/api/admin/deletion-requests/${request.id}`, {
                            status: "reviewing",
                          })
                        }
                        disabled={busyKey !== null || request.status === "reviewing"}
                      >
                        검토 중
                      </button>
                      <button
                        className="button-secondary"
                        type="button"
                        onClick={() =>
                          patchJson(`/api/admin/deletion-requests/${request.id}`, {
                            status: "resolved",
                          })
                        }
                        disabled={busyKey !== null || request.status === "resolved"}
                      >
                        처리 완료
                      </button>
                      <button
                        className="button-secondary"
                        type="button"
                        onClick={() =>
                          patchJson(`/api/admin/deletion-requests/${request.id}`, {
                            status: "rejected",
                          })
                        }
                        disabled={busyKey !== null || request.status === "rejected"}
                      >
                        거절
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </section>
    </>
  );
}

function isPendingSafeApproval(item: AdminEvaluationRow) {
  const meta = parseEvaluationMeta(item.user_agent);
  return item.status === "hidden" && item.evaluation === "safe" && meta.safeApprovalPending;
}

function statusLabel(item: AdminEvaluationRow) {
  if (isPendingSafeApproval(item)) {
    return "승인 대기";
  }

  switch (item.status) {
    case "hidden":
      return "숨김";
    case "deleted":
      return "삭제";
    default:
      return "표시";
  }
}
