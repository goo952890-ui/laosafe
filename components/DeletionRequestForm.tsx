"use client";

import { useState } from "react";

export function DeletionRequestForm({
  target,
  targetType,
}: {
  target: string;
  targetType: "phone" | "account";
}) {
  const [reason, setReason] = useState("잘못된 정보가 등록됨");
  const [description, setDescription] = useState("");
  const [contact, setContact] = useState("");
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitRequest() {
    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/deletion-requests", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          targetType,
          targetLabel: target,
          reason,
          description,
          contact,
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "삭제 요청을 접수하지 못했습니다.");
      }

      setSubmitted(true);
      setDescription("");
      setContact("");
    } catch (fetchError) {
      setError(
        fetchError instanceof Error ? fetchError.message : "삭제 요청을 접수하지 못했습니다.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="panel-block" aria-labelledby="deletion-title">
      <h2 className="panel-title" id="deletion-title">
        삭제 요청
      </h2>
      <p className="section-copy">
        {target}에 잘못된 정보가 등록되었거나 소유자 변경 등 검토가 필요한 경우 삭제 요청을
        보낼 수 있습니다.
      </p>
      <div className="field-stack">
        <select className="select" value={reason} onChange={(event) => setReason(event.target.value)}>
          <option>잘못된 정보가 등록됨</option>
          <option>허위 의견이 등록됨</option>
          <option>전화번호 소유자가 변경됨</option>
          <option>계좌번호 소유자가 변경됨</option>
          <option>개인정보가 포함됨</option>
          <option>중복으로 등록됨</option>
          <option>기타</option>
        </select>
        <textarea
          className="textarea"
          placeholder="삭제 요청 사유와 상세 설명을 입력해 주세요."
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
        <input
          className="input"
          placeholder="연락 가능한 이메일 또는 전화번호"
          value={contact}
          onChange={(event) => setContact(event.target.value)}
        />
        <div className="inline-notice inline-notice--warning">
          삭제 요청 접수와 악의적인 반복 요청 방지를 위해 IP 주소 및 접속정보가 저장됩니다.
        </div>
        <div className="button-row">
          <button className="button" type="button" onClick={submitRequest} disabled={pending}>
            {pending ? "접수 중..." : "삭제 요청 접수"}
          </button>
        </div>
        {error ? <div className="inline-notice inline-notice--warning">{error}</div> : null}
        {submitted && (
          <div className="inline-notice inline-notice--success">
            삭제 요청이 접수되었습니다. 관리자가 내용을 검토한 뒤 처리 상태를 결정합니다.
          </div>
        )}
      </div>
    </section>
  );
}
