"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { AdminCommentForm } from "@/components/AdminCommentForm";

type CommentItem = {
  id: number;
  created_at: string;
  comment: string;
  status: "visible" | "hidden" | "deleted";
  meta: {
    nickname?: string | null;
    isAdmin?: boolean;
  };
};

export function AdminCommentsPanel({
  comments,
  kind,
  normalized,
  display,
}: {
  comments: CommentItem[];
  kind: "phone" | "account";
  normalized: string;
  display: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const visibleComments = useMemo(() => comments.slice(0, 5), [comments]);

  async function hideComment(id: number) {
    if (pendingId) return;
    setPendingId(id);

    try {
      const response = await fetch(`/api/admin/evaluations/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "hidden" }),
      });

      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "댓글 숨김 처리에 실패했습니다.");
      }

      router.refresh();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "댓글 숨김 처리에 실패했습니다.");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <section className="panel-block admin-panel-box">
      <div className="admin-section-head">
        <h2 className="panel-title">댓글</h2>
        {comments.length > 5 ? (
          <button className="board-link" type="button" onClick={() => setOpen(true)}>
            더보기
          </button>
        ) : null}
      </div>

      <div className="admin-list">
        {comments.length === 0 ? (
          <div className="admin-card">
            <p className="body-copy">등록된 추가 의견이 없습니다.</p>
          </div>
        ) : (
          visibleComments.map((item) => (
            <div className="admin-card admin-comment-card" key={item.id}>
              <div className="admin-comment-row">
                <strong>{item.meta.isAdmin ? "관리자" : item.meta.nickname ?? "익명"}</strong>
                <div className="admin-comment-actions">
                  <span className="meta-copy">{item.created_at.slice(0, 10)}</span>
                  <button
                    className={`button-secondary button-secondary--warning button-secondary--small ${item.status === "hidden" ? "is-disabled" : ""}`}
                    type="button"
                    disabled={pendingId === item.id || item.status === "hidden"}
                    onClick={() => hideComment(item.id)}
                  >
                    {item.status === "hidden" ? "미노출" : pendingId === item.id ? "처리 중..." : "숨기기"}
                  </button>
                </div>
              </div>
              <p className="body-copy admin-card-message">{item.comment}</p>
            </div>
          ))
        )}
      </div>

      <div className="admin-comment-form-wrap">
        <AdminCommentForm kind={kind} normalized={normalized} display={display} />
      </div>

      {open ? (
        <div className="admin-modal-backdrop" role="dialog" aria-modal="true">
          <div className="admin-modal">
            <div className="admin-section-head">
              <h3 className="panel-title">전체 댓글</h3>
              <button className="button-secondary button-secondary--small" type="button" onClick={() => setOpen(false)}>
                닫기
              </button>
            </div>
            <div className="admin-modal-body">
              {comments.map((item) => (
                <div className="admin-card admin-comment-card" key={item.id}>
                  <div className="admin-comment-row">
                    <strong>{item.meta.isAdmin ? "관리자" : item.meta.nickname ?? "익명"}</strong>
                    <div className="admin-comment-actions">
                      <span className="meta-copy">{item.created_at.slice(0, 10)}</span>
                      <button
                        className={`button-secondary button-secondary--warning button-secondary--small ${item.status === "hidden" ? "is-disabled" : ""}`}
                        type="button"
                        disabled={pendingId === item.id || item.status === "hidden"}
                        onClick={() => hideComment(item.id)}
                      >
                        {item.status === "hidden" ? "미노출" : pendingId === item.id ? "처리 중..." : "숨기기"}
                      </button>
                    </div>
                  </div>
                  <p className="body-copy admin-card-message">{item.comment}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
