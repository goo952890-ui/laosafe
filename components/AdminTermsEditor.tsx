"use client";

import { useState } from "react";

type TermsByLocale = {
  lo: string;
  ko: string;
  en: string;
};

export function AdminTermsEditor({ initialContents }: { initialContents: TermsByLocale }) {
  const [contents, setContents] = useState(initialContents);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function save() {
    setPending(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/admin/terms", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ contents }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "이용약관을 저장하지 못했습니다.");
      }

      setSuccess("이용약관이 저장되었습니다.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "이용약관을 저장하지 못했습니다.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="subpage-section admin-console-section">
      <div className="panel-block">
        <h2 className="panel-title">이용약관 편집</h2>
        <p className="section-copy">사용자 화면의 이용약관 페이지에 바로 반영되는 내용을 수정합니다.</p>
        <div className="field-stack">
          <label className="field-label" htmlFor="terms-lo">
            라오어
          </label>
          <textarea
            id="terms-lo"
            className="textarea textarea--terms"
            value={contents.lo}
            onChange={(event) => setContents((current) => ({ ...current, lo: event.target.value }))}
          />
        </div>
        <div className="field-stack">
          <label className="field-label" htmlFor="terms-ko">
            한국어
          </label>
          <textarea
            id="terms-ko"
            className="textarea textarea--terms"
            value={contents.ko}
            onChange={(event) => setContents((current) => ({ ...current, ko: event.target.value }))}
          />
        </div>
        <div className="field-stack">
          <label className="field-label" htmlFor="terms-en">
            영어
          </label>
          <textarea
            id="terms-en"
            className="textarea textarea--terms"
            value={contents.en}
            onChange={(event) => setContents((current) => ({ ...current, en: event.target.value }))}
          />
        </div>
        <div className="button-row">
          <button className="button" type="button" onClick={save} disabled={pending}>
            {pending ? "저장 중..." : "저장"}
          </button>
        </div>
        {error ? <div className="inline-notice inline-notice--warning">{error}</div> : null}
        {success ? <div className="inline-notice inline-notice--success">{success}</div> : null}
      </div>
    </section>
  );
}
