"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { MAX_REPORT_COMMENT_LENGTH, validatePlainText } from "@/lib/input-validation";

export function AdminCommentForm({
  kind,
  normalized,
  display,
}: {
  kind: "phone" | "account";
  normalized: string;
  display: string;
}) {
  const router = useRouter();
  const [comment, setComment] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!comment.trim()) return;
    const commentError = validatePlainText(comment, false, "ko", MAX_REPORT_COMMENT_LENGTH);
    if (commentError) {
      setError(commentError);
      return;
    }
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/comments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          targetType: kind,
          targetNormalized: normalized,
          targetDisplay: display,
          comment,
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "관리자 댓글 등록에 실패했습니다.");
      setComment("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "관리자 댓글 등록에 실패했습니다.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="panel-block">
      <h2 className="panel-title">댓글 달기</h2>
      <textarea
        className="textarea"
        value={comment}
        maxLength={MAX_REPORT_COMMENT_LENGTH}
        onChange={(event) => setComment(event.target.value)}
        placeholder="관리자 댓글을 입력하세요."
      />
      <p className="field-help">최대 200자까지 작성할 수 있습니다.</p>
      <div className="button-row">
        <button className="button" type="button" onClick={submit} disabled={pending}>
          {pending ? "등록 중..." : "관리자 댓글 등록"}
        </button>
      </div>
      {error ? <div className="inline-notice inline-notice--warning">{error}</div> : null}
    </section>
  );
}
