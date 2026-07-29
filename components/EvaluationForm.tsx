"use client";

import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useState } from "react";

import { generateNumericNickname } from "@/lib/evaluation-meta";
import {
  validatePlainText,
  validateQrPayload,
  validateTargetLength,
} from "@/lib/input-validation";

export function EvaluationForm({
  label,
  targetType,
  targetDisplay,
  targetNormalized,
  qrPayload,
  title = "댓글 작성",
  submitLabel = "댓글 등록",
  requireComment = false,
  redirectPath,
  evaluation = "spam",
  showIdentityFields = true,
  requirePassword = true,
  allowEvaluationChoice = false,
  requireSafeApproval = false,
  safeApprovalNotice,
  pendingRedirectPath,
  topFields,
  submissionType,
}: {
  label: string;
  targetType: "phone" | "account";
  targetDisplay: string;
  targetNormalized: string;
  qrPayload?: string | null;
  title?: string;
  submitLabel?: string;
  requireComment?: boolean;
  redirectPath?: string;
  evaluation?: "spam" | "safe";
  showIdentityFields?: boolean;
  requirePassword?: boolean;
  allowEvaluationChoice?: boolean;
  requireSafeApproval?: boolean;
  safeApprovalNotice?: string;
  pendingRedirectPath?: string;
  topFields?: ReactNode;
  submissionType?: "report" | "comment";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [comment, setComment] = useState("");
  const [nickname, setNickname] = useState(() => generateNumericNickname());
  const [password, setPassword] = useState("");
  const [selectedEvaluation, setSelectedEvaluation] = useState<"spam" | "safe">(evaluation);
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitEvaluation() {
    setPending(true);
    setError(null);

    if (requireComment && !comment.trim()) {
      setError("의견을 입력해 주세요.");
      setPending(false);
      return;
    }

    const targetError = validateTargetLength(targetNormalized);
    if (targetError) {
      setError(targetError);
      setPending(false);
      return;
    }

    if (comment.trim()) {
      const commentError = validatePlainText(comment, requireComment);
      if (commentError) {
        setError(commentError);
        setPending(false);
        return;
      }
    }

    if (targetType === "account" && qrPayload) {
      const qrError = validateQrPayload(qrPayload);
      if (qrError) {
        setError(qrError);
        setPending(false);
        return;
      }
    }

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
          qrPayload,
          submissionType,
          nickname: showIdentityFields ? nickname : undefined,
          password: showIdentityFields ? password : undefined,
          comment,
          evaluation: selectedEvaluation,
          storeNickname: showIdentityFields,
          requirePassword,
          requireSafeApproval,
        }),
      });

      const payload = (await response.json()) as { error?: string; status?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "평가를 등록하지 못했습니다.");
      }

      if (payload.status === "pending") {
        if (pendingRedirectPath) {
          window.location.href = pendingRedirectPath;
          return;
        }
        setSubmitted(true);
        setComment("");
        setPassword("");
        setNickname(generateNumericNickname());
        return;
      }

      if (redirectPath) {
        window.location.href = redirectPath;
        return;
      }

      setSubmitted(true);
      setComment("");
      setPassword("");
      setNickname(generateNumericNickname());
      router.replace(pathname);
      router.refresh();
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "평가를 등록하지 못했습니다.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="panel-block" aria-labelledby="evaluation-title">
      <h2 className="panel-title" id="evaluation-title">
        {title}
      </h2>
      <div className="field-stack">
        {topFields}
        {allowEvaluationChoice ? (
          <div className="field-stack">
            <span className="field-label">제보 유형</span>
            <div className="evaluation-choice-row">
              <button
                type="button"
                className={`evaluation-choice evaluation-choice--spam ${selectedEvaluation === "spam" ? "is-active" : ""}`}
                onClick={() => setSelectedEvaluation("spam")}
              >
                스팸 제보
              </button>
              <button
                type="button"
                className={`evaluation-choice evaluation-choice--safe ${selectedEvaluation === "safe" ? "is-active" : ""}`}
                onClick={() => setSelectedEvaluation("safe")}
              >
                안전번호 제보
              </button>
            </div>
            {selectedEvaluation === "safe" && requireSafeApproval ? (
              <div className="inline-notice">
                {safeApprovalNotice ??
                  "안전번호 제보는 관리자가 검토한 뒤 공식 번호로 확인되는 경우에만 승인됩니다."}
              </div>
            ) : null}
          </div>
        ) : null}
        {showIdentityFields ? (
          <div className="inline-field-row">
            <div>
              <label className="field-label" htmlFor="nickname-input">
                닉네임
              </label>
              <input id="nickname-input" className="input" value={nickname} readOnly />
            </div>
            <div>
              <label className="field-label" htmlFor="password-input">
                비밀번호
              </label>
              <input
                id="password-input"
                className="input"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="삭제 시 필요"
              />
            </div>
          </div>
        ) : null}
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
          허위 제보 방지를 위해 제보자의 IP 주소가 저장됩니다.
          <br />
          허위 사실이나 타인의 개인정보를 등록하지 마세요.
        </p>
        <div className="button-row">
          <button className="button" type="button" onClick={submitEvaluation} disabled={pending}>
            {pending ? "등록 중..." : submitLabel}
          </button>
        </div>

        {error ? <div className="inline-notice inline-notice--warning">{error}</div> : null}
        {submitted && (
          <div className="inline-notice inline-notice--success">
            {selectedEvaluation === "safe" && requireSafeApproval
              ? "안전번호 제보가 접수되었습니다. 관리자 검토 후 공식 번호인 경우에만 승인됩니다."
              : "제보가 등록되었습니다. 작성한 내용은 서비스 운영정책에 따라 수정, 숨김 또는 삭제될 수 있습니다."}
          </div>
        )}
      </div>
    </section>
  );
}
