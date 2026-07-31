"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { MAX_REPORT_COMMENT_LENGTH, validatePlainText } from "@/lib/input-validation";

export function AdminFirstReportEditor({
  evaluationId,
  initialComment,
}: {
  evaluationId: number;
  initialComment: string;
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [comment, setComment] = useState(initialComment);
  const [isPending, startTransition] = useTransition();

  async function saveComment() {
    const trimmed = comment.trim();
    const commentError = validatePlainText(trimmed, false, "ko", MAX_REPORT_COMMENT_LENGTH);
    if (commentError) {
      window.alert(commentError);
      return;
    }

    try {
      const response = await fetch(`/api/admin/evaluations/${evaluationId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ comment: trimmed }),
      });

      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "최초 신고 내용 수정에 실패했습니다.");
      }

      setComment(trimmed);
      setIsEditing(false);
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "최초 신고 내용 수정에 실패했습니다.");
    }
  }

  return (
    <div className="admin-first-report-editor">
      {isEditing ? (
        <>
          <textarea
            className="field-textarea admin-first-report-textarea"
            value={comment}
            maxLength={MAX_REPORT_COMMENT_LENGTH}
            onChange={(event) => setComment(event.target.value)}
            rows={5}
            disabled={isPending}
          />
          <p className="field-help">최대 200자까지 작성할 수 있습니다.</p>
          <div className="admin-first-report-actions">
            <button
              className="button-primary button-primary--compact"
              type="button"
              disabled={isPending}
              onClick={saveComment}
            >
              {isPending ? "저장 중..." : "저장"}
            </button>
            <button
              className="button-secondary button-secondary--small"
              type="button"
              disabled={isPending}
              onClick={() => {
                setComment(initialComment);
                setIsEditing(false);
              }}
            >
              취소
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="primary-report-body">{comment || "(내용 없음)"}</p>
          <div className="admin-first-report-actions">
            <button
              className="button-secondary button-secondary--small"
              type="button"
              onClick={() => setIsEditing(true)}
            >
              수정
            </button>
          </div>
        </>
      )}
    </div>
  );
}
