"use client";

import { useState } from "react";

export function EvaluationForm({ label }: { label: string }) {
  const [tone, setTone] = useState<"spam" | "safe">("spam");
  const [comment, setComment] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  return (
    <section className="surface-card" aria-labelledby="evaluation-title">
      <h2 className="section-title" id="evaluation-title">
        이 번호 평가하기
      </h2>
      <p className="section-copy">
        {label}에 대한 경험이나 의견을 남겨 주세요. 스팸 유형이나 피해 금액 입력 없이
        평가와 설명만 받습니다.
      </p>

      <div className="field-stack">
        <div className="radio-row">
          <button
            className={`pill-button ${tone === "spam" ? "is-selected" : ""}`}
            onClick={() => setTone("spam")}
            type="button"
          >
            스팸이에요
          </button>
          <button
            className={`pill-button ${tone === "safe" ? "is-selected" : ""}`}
            onClick={() => setTone("safe")}
            type="button"
          >
            안전해요
          </button>
        </div>
        <textarea
          className="textarea"
          placeholder={`${label}에 대한 경험이나 의견을 입력해 주세요.`}
          value={comment}
          onChange={(event) => setComment(event.target.value)}
        />
        <div className="alert">
          허위 신고와 반복적인 악성 신고를 방지하기 위해 IP 주소 및 접속정보가 저장됩니다.
          사실과 다른 내용을 고의로 등록하거나 타인에게 피해를 주기 위해 이용하는 경우 해당
          내용이 삭제되고 서비스 이용이 제한될 수 있습니다.
        </div>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
          />
          <span>허위 내용을 고의로 등록하지 않았습니다.</span>
        </label>
        <div className="button-row">
          <button
            className="button"
            type="button"
            disabled={!confirmed}
            onClick={() => setSubmitted(true)}
          >
            익명으로 등록하기
          </button>
        </div>

        {submitted && (
          <div className="alert alert-success">
            평가가 등록되었습니다. 작성한 내용은 서비스 운영정책에 따라 수정, 숨김 또는 삭제될
            수 있습니다.
          </div>
        )}
      </div>
    </section>
  );
}
