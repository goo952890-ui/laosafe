import { notFound } from "next/navigation";

import { EvaluationForm } from "@/components/EvaluationForm";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { findTarget } from "@/lib/site-repository";
import { type LookupKind } from "@/lib/site-data";
import Link from "next/link";
import { maskRecipientName } from "@/lib/site-utils";

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
      <section className="lookup-stack">
        <article className="result-section">
          <div className="subpage-heading">
            <h1 className="subpage-title">{label} 조회 결과</h1>
            <p className="section-copy">검색한 대상에 등록된 최근 사용자 의견을 확인합니다.</p>
          </div>

          <div className="result-keyline">
            <strong className="lookup-number">{result.found?.display ?? result.display}</strong>
          </div>

          {result.found ? (
            <>
              <ResultSummary kind={kind} target={result.found} />
              <div className="comment-list" style={{ marginTop: 18 }}>
                {result.found.comments.map((comment) => (
                  <article className="comment-row" key={comment.id}>
                    <p className="body-copy">{comment.text}</p>
                    <p className="comment-date">{comment.createdAt}</p>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <div className="result-status-box">
              <p className="body-copy">현재 등록된 신고가 없습니다.</p>
              <p className="body-copy">
                등록되지 않은 {kind === "phone" ? "번호" : "계좌번호"}는 이 화면에서 바로 신고할 수
                있습니다.
              </p>
            </div>
          )}
          <div className="detail-actions">
            <Link
              className="button-secondary"
              href={`/request-delete/${kind}/${encodeURIComponent(result.found?.display ?? result.display)}`}
            >
              삭제 요청
            </Link>
          </div>
          <div className="detail-form-section">
            <EvaluationForm
              label={kind === "phone" ? "이 번호" : "이 계좌번호"}
              targetType={kind}
              targetDisplay={result.found?.display ?? result.display}
              targetNormalized={result.normalized}
            />
          </div>
        </article>
      </section>
      <SiteFooter />
    </main>
  );
}

function ResultSummary({
  target,
}: {
  kind: LookupKind;
  target: ReturnType<typeof findTarget>["found"] extends infer T ? NonNullable<T> : never;
}) {
  return (
    <>
      {"recipientName" in target && target.recipientName ? (
        <>
          <div className="account-meta-line">
            <span>수취인 {maskRecipientName(target.recipientName)}</span>
            <span>은행 {target.bankName ?? "미확인"}</span>
          </div>
          <p className="disclaimer" style={{ marginTop: 10 }}>
            수취인 이름은 QR코드 또는 사용자 제출 정보에서 확인된 값이며, 은행이 공식적으로
            확인한 정보가 아닐 수 있습니다.
          </p>
        </>
      ) : null}
    </>
  );
}
