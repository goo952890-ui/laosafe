"use client";

import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useState } from "react";

import { trackCommentSubmit, trackReportSubmit } from "@/lib/analytics";
import { generateNumericNickname } from "@/lib/evaluation-meta";
import { getUserDictionary, type UserLocale } from "@/lib/i18n";
import {
  MAX_REPORT_COMMENT_LENGTH,
  validatePlainText,
  validateQrPayload,
  validateTargetLength,
} from "@/lib/input-validation";

export function EvaluationForm({
  label,
  locale,
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
  locale: UserLocale;
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
  const copy = getUserDictionary(locale);
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
      setError(copy.form.commentRequired);
      setPending(false);
      return;
    }

    const targetError = validateTargetLength(targetNormalized, locale);
    if (targetError) {
      setError(targetError);
      setPending(false);
      return;
    }

    if (comment.trim()) {
      const commentError = validatePlainText(comment, requireComment, locale, MAX_REPORT_COMMENT_LENGTH);
      if (commentError) {
        setError(commentError);
        setPending(false);
        return;
      }
    }

    if (targetType === "account" && qrPayload) {
      const qrError = validateQrPayload(qrPayload, locale);
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
          locale,
        }),
      });

      const payload = (await response.json()) as { error?: string; status?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? copy.form.submitError);
      }

      const analyticsTargetType =
        targetType === "account" && qrPayload ? "qr" : targetType;

      if (submissionType === "comment") {
        trackCommentSubmit({ targetType: analyticsTargetType });
      } else {
        trackReportSubmit({
          targetType: analyticsTargetType,
          evaluation: selectedEvaluation,
          status: payload.status === "pending" ? "pending" : "success",
        });
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
      setError(fetchError instanceof Error ? fetchError.message : copy.form.submitError);
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
            <span className="field-label">{copy.common.reportType}</span>
            <div className="evaluation-choice-row">
              <button
                type="button"
                className={`evaluation-choice evaluation-choice--spam ${selectedEvaluation === "spam" ? "is-active" : ""}`}
                onClick={() => setSelectedEvaluation("spam")}
              >
                {copy.form.spamReport}
              </button>
              <button
                type="button"
                className={`evaluation-choice evaluation-choice--safe ${selectedEvaluation === "safe" ? "is-active" : ""}`}
                onClick={() => setSelectedEvaluation("safe")}
              >
                {copy.form.safeReport}
              </button>
            </div>
            {selectedEvaluation === "safe" && requireSafeApproval ? (
              <div className="inline-notice">
                {safeApprovalNotice ??
                  copy.form.safeApproval}
              </div>
            ) : null}
          </div>
        ) : null}
        {showIdentityFields ? (
          <div className="inline-field-row">
            <div>
              <label className="field-label" htmlFor="nickname-input">
                {copy.form.nickname}
              </label>
              <input id="nickname-input" className="input" value={nickname} readOnly />
            </div>
            <div>
              <label className="field-label" htmlFor="password-input">
                {copy.form.password}
              </label>
              <input
                id="password-input"
                className="input"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={copy.form.passwordPlaceholder}
              />
            </div>
          </div>
        ) : null}
        <label className="field-label" htmlFor="comment-input">
          {copy.common.description}
        </label>
        <textarea
          id="comment-input"
          className="textarea"
          placeholder={copy.form.commentPlaceholder.replace("{label}", label)}
          value={comment}
          maxLength={MAX_REPORT_COMMENT_LENGTH}
          onChange={(event) => setComment(event.target.value)}
        />
        <p className="field-help">최대 200자까지 작성할 수 있습니다.</p>
        <p className="form-note">
          {copy.form.ipNotice}
          <br />
          {copy.form.privacyNotice}
        </p>
        <div className="button-row">
          <button className="button" type="button" onClick={submitEvaluation} disabled={pending}>
            {pending ? copy.form.submitting : submitLabel}
          </button>
        </div>

        {error ? <div className="inline-notice inline-notice--warning">{error}</div> : null}
        {submitted && (
          <div className="inline-notice inline-notice--success">
            {selectedEvaluation === "safe" && requireSafeApproval
              ? copy.form.safePending
              : copy.form.reportSuccess}
          </div>
        )}
      </div>
    </section>
  );
}
