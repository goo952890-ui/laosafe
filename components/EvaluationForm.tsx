"use client";

import { useState } from "react";

export function EvaluationForm({
  label,
  targetType,
  targetDisplay,
  targetNormalized,
}: {
  label: string;
  targetType: "phone" | "account";
  targetDisplay: string;
  targetNormalized: string;
}) {
  const [comment, setComment] = useState("");
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitEvaluation() {
    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/evaluations", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          targetType,
          targetDisplay,
          targetNormalized,
          comment,
          evaluation: "spam",
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "평가를 등록하지 못했습니다.");
      }

      setSubmitted(true);
      setComment("");
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "평가를 등록하지 못했습니다.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="panel-block" aria-labelledby="evaluation-title">
      <h2 className="panel-title" id="evaluation-title">
        의견 작성
      </h2>
      <div className="field-stack">
        <label className="field-label" htmlFor="comment-input">
          설명 또는 사용자 의견
        </label>
        <textarea
          id="comment-input"
          className="textarea"
          placeholder={`${label}에 대한 경험이나 의견을 입력해 주세요.`}
          value={comment}
          onChange={(event) => setComment(event.target.value)}
        />
        <p className="form-note">
          허위 신고 방지를 위해 신고자의 IP 주소가 저장됩니다.
          <br />
          허위 사실이나 타인의 개인정보를 등록하지 마세요.
        </p>
        <div className="button-row">
          <button className="button" type="button" onClick={submitEvaluation} disabled={pending}>
            {pending ? "등록 중..." : "신고 등록"}
          </button>
        </div>

        {error ? <div className="inline-notice inline-notice--warning">{error}</div> : null}
        {submitted && (
          <div className="inline-notice inline-notice--success">
            평가가 등록되었습니다. 작성한 내용은 서비스 운영정책에 따라 수정, 숨김 또는 삭제될
            수 있습니다.
          </div>
        )}
      </div>
    </section>
  );
}
