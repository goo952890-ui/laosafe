import { notFound } from "next/navigation";

import { DeletionRequestForm } from "@/components/DeletionRequestForm";
import { EvaluationForm } from "@/components/EvaluationForm";
import { SiteHeader } from "@/components/SiteHeader";
import { type LookupKind } from "@/lib/site-data";
import { findTarget, getCounts, maskRecipientName } from "@/lib/site-utils";

interface PageProps {
  params: Promise<{
    kind: string;
    query: string;
  }>;
}

export default async function LookupPage({ params }: PageProps) {
  const resolved = await params;

  if (resolved.kind !== "phone" && resolved.kind !== "account") {
    notFound();
  }

  const kind = resolved.kind as LookupKind;
  const rawQuery = decodeURIComponent(resolved.query);
  const result = findTarget(kind, rawQuery);
  const label = kind === "phone" ? "전화번호" : "계좌번호";

  return (
    <main className="page-shell">
      <SiteHeader />
      <section className="result-layout">
        <article className="surface-card">
          <div className="eyebrow">{label} 조회 결과</div>
          <span className="tag">{kind === "phone" ? "전화번호 검색" : "계좌번호 검색"}</span>
          <h1 className="result-title">{result.found?.display ?? result.display}</h1>

          {result.found ? (
            <>
              <ResultSummary kind={kind} target={result.found} />
              <div className="comment-list" style={{ marginTop: 18 }}>
                {result.found.comments.map((comment) => (
                  <article className="comment-card" key={comment.id}>
                    <span className={`comment-badge ${comment.tone}`}>
                      {comment.tone === "spam" ? "스팸이에요" : "안전해요"}
                    </span>
                    <p className="body-copy">{comment.text}</p>
                    <p className="comment-date">{comment.createdAt}</p>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <div className="empty-state">
              <strong>해당 {label}에 등록된 정보가 없습니다.</strong>
              <p className="body-copy">
                등록된 정보가 없다고 해서 반드시 안전한 {kind === "phone" ? "번호" : "계좌"}라는
                의미는 아닙니다. 첫 평가를 등록하면 이 검색 결과 페이지가 생성됩니다.
              </p>
              <div className="button-row">
                <button className="button" type="button">
                  이 {kind === "phone" ? "번호" : "계좌번호"}를 스팸으로 신고하시겠습니까?
                </button>
                <button className="button-secondary" type="button">
                  안전한 {kind === "phone" ? "번호" : "계좌"}로 평가하기
                </button>
              </div>
            </div>
          )}
        </article>

        <div className="field-stack">
          <EvaluationForm label={kind === "phone" ? "이 번호" : "이 계좌번호"} />
          <DeletionRequestForm target={result.found?.display ?? result.display} />
        </div>
      </section>
    </main>
  );
}

function ResultSummary({
  kind,
  target,
}: {
  kind: LookupKind;
  target: ReturnType<typeof findTarget>["found"] extends infer T ? NonNullable<T> : never;
}) {
  const counts = getCounts(target.comments);

  return (
    <>
      <div className="result-subline">
        <span>총 {counts.total}명이 평가했습니다.</span>
        <span>스팸 {counts.spam}명</span>
        <span>안전 {counts.safe}명</span>
      </div>

      {"recipientName" in target && target.recipientName ? (
        <div className="field-stack" style={{ marginTop: 18 }}>
          <span className="tag">수취인 {maskRecipientName(target.recipientName)}</span>
          <span className="tag">은행 {target.bankName ?? "미확인"}</span>
          <p className="disclaimer">
            수취인 이름은 QR코드 또는 사용자 제출 정보에서 확인된 값이며, 은행이 공식적으로
            확인한 정보가 아닐 수 있습니다.
          </p>
        </div>
      ) : null}

      <div className="stats-grid">
        <div className="stat-card">
          <strong>{counts.total}</strong>
          <span>전체 평가 수</span>
        </div>
        <div className="stat-card">
          <strong>{counts.spam}</strong>
          <span>스팸 평가</span>
        </div>
        <div className="stat-card">
          <strong>{counts.safe}</strong>
          <span>안전 평가</span>
        </div>
        <div className="stat-card">
          <strong>{counts.spamRatio}%</strong>
          <span>{kind === "phone" ? "스팸 평가 비율" : "위험 평가 비율"}</span>
        </div>
      </div>

      {counts.total < 3 ? (
        <div className="alert" style={{ marginTop: 18 }}>
          아직 평가가 충분하지 않습니다. 검색 결과는 참고용이며 서비스가 공식 판정을 내리지
          않습니다.
        </div>
      ) : (
        <p className="disclaimer" style={{ marginTop: 18 }}>
          서비스는 이 결과를 바탕으로 번호나 계좌의 안전성을 공식적으로 보증하지 않습니다.
        </p>
      )}
    </>
  );
}
