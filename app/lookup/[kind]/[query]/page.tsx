import { notFound } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { headers } from "next/headers";
import QRCode from "qrcode";

import { CommentThread } from "@/components/CommentThread";
import { EvaluationForm } from "@/components/EvaluationForm";
import { SearchTabs } from "@/components/SearchTabs";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { findTarget } from "@/lib/site-repository";
import { type LookupKind } from "@/lib/site-data";
import Link from "next/link";
import { extractQrPayload, getCounts, maskRecipientName } from "@/lib/site-utils";
import { VotePanel } from "@/components/VotePanel";
import {
  checkLookupRateLimit,
  extractClientIp,
  formatRemainingMinutes,
  getLookupIdentity,
  LOOKUP_REQUEST_HEADER,
} from "@/lib/lookup-rate-limit";
import { writeSecurityLog } from "@/lib/security-logs";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{
    kind: string;
    query: string;
  }>;
  searchParams: Promise<{
    review?: string;
  }>;
}

export default async function LookupPage({ params, searchParams }: PageProps) {
  noStore();
  const resolved = await params;
  const query = await searchParams;
  const requestHeaders = await headers();

  if (resolved.kind !== "phone" && resolved.kind !== "account") {
    notFound();
  }

  const kind = resolved.kind as LookupKind;
  const rawQuery = decodeURIComponent(resolved.query);
  const lookupToken = requestHeaders.get(LOOKUP_REQUEST_HEADER);
  const rateLimit = checkLookupRateLimit(
    getLookupIdentity(extractClientIp(requestHeaders), lookupToken),
  );

  if (rateLimit.blocked && rateLimit.justBlocked) {
    await writeSecurityLog({
      logType: "abnormal_ip_blocked",
      source: "lookup_rate_limit",
      ip: extractClientIp(requestHeaders),
      identityKey: getLookupIdentity(extractClientIp(requestHeaders), lookupToken),
      detail: "1분 내 20회 이상 조회가 감지되어 30분 차단되었습니다.",
    });
  }

  if (rateLimit.blocked) {
    return (
      <main className="page-shell">
        <SiteHeader />
        <section className="subpage-section lookup-search-shell">
          <SearchTabs />
        </section>
        <section className="lookup-stack">
          <article className="result-section">
            <div className="subpage-heading">
              <h1 className="subpage-title">조회가 일시 제한되었습니다</h1>
              <p className="section-copy">
                크롤링 및 비정상적인 대량 조회 방지를 위해 30분 동안 조회가 제한됩니다.
              </p>
            </div>
            <div className="result-status-box">
              <p className="body-copy">
                같은 IP에서 1분 동안 20회 이상 조회가 감지되었습니다.
              </p>
              <p className="body-copy">
                약 {formatRemainingMinutes(rateLimit.remainingMs)}분 후 다시 시도해 주세요.
              </p>
            </div>
          </article>
        </section>
        <SiteFooter />
      </main>
    );
  }

  const result = await findTarget(kind, rawQuery);
  const label = lookupTitle(kind, rawQuery);
  const qrPayload = kind === "account" ? extractQrPayload(rawQuery) ?? result.found?.qrPayload ?? null : null;
  const qrPreview = qrPayload ? await buildQrPreviewSafely(qrPayload) : null;
  const orderedComments = result.found
    ? [...result.found.comments]
        .filter((comment) => !comment.isVoteOnly && comment.text.trim().length > 0)
        .sort((a, b) => Number(a.id) - Number(b.id))
    : [];
  const primaryComment = orderedComments[0] ?? null;
  const replyComments = orderedComments.slice(1);
  const detailDisplay = result.found?.display ?? result.display;

  const counts = result.found ? getCounts(result.found) : { spam: 0, safe: 0, total: 0, spamRatio: 0, safeRatio: 0 };

  return (
    <main className="page-shell">
      <SiteHeader />
      <section className="subpage-section lookup-search-shell">
        <SearchTabs />
      </section>
      <section className="lookup-stack">
        <article className="result-section">
          <div className="subpage-heading">
            <h1 className="subpage-title">{label}</h1>
            <p className="section-copy">검색한 대상에 등록된 최근 사용자 의견을 확인합니다.</p>
          </div>
          {query.review === "safe" ? (
            <div className="inline-notice">
              안전번호 제보가 접수되었습니다. 관리자 검토 후 공식 번호인 경우에만 승인됩니다.
            </div>
          ) : null}

          <div className="result-keyline">
            <strong className="lookup-number">{detailDisplay}</strong>
            {result.found ? (
              <Link
                className="detail-action-link"
                href={`/request-delete/${kind}/${encodeURIComponent(
                  kind === "account" ? result.normalized : result.found?.display ?? result.display,
                )}`}
              >
                삭제 요청
              </Link>
            ) : null}
          </div>
          {qrPayload && qrPreview ? (
            <div className="qr-preview-panel">
              <div className="qr-preview-copy">
                <h2 className="panel-title">QR 원문</h2>
                <p className="body-copy">{qrPayload}</p>
              </div>
              <img src={qrPreview} alt="QR 재생성 이미지" className="qr-preview-image" />
            </div>
          ) : null}

          {result.found ? (
            <>
              <ResultSummary kind={kind} target={result.found} />
              {primaryComment ? (
                <article className="primary-report-card">
                  <div className="primary-report-label">최초 신고 내용</div>
                  <div className="reply-head">
                    <div className="reply-head-main" />
                    <span className="comment-date">{primaryComment.createdAt}</span>
                  </div>
                  <p className="primary-report-body">{primaryComment.text || "(의견 없음)"}</p>
                </article>
              ) : null}
              <VotePanel
                targetType={kind}
                targetDisplay={detailDisplay}
                targetNormalized={result.normalized}
                qrPayload={qrPayload}
                spamCount={counts.spam}
                safeCount={counts.safe}
              />
              {replyComments.length > 0 ? <CommentThread comments={replyComments} title="댓글" /> : null}
            </>
          ) : (
            <div className="result-status-box">
              {result.hidden ? (
                <>
                  <p className="body-copy">이 번호는 제보된 번호이나 관리자에 의해 숨김처리된 번호입니다.</p>
                  <p className="body-copy">숨김된 번호는 사용자 화면에서 추가 제보를 등록할 수 없습니다.</p>
                </>
              ) : (
                <>
                  <p className="body-copy">현재 등록된 제보가 없습니다.</p>
                  <p className="body-copy">
                    아직 등록된 이력이 없는 번호입니다. 스팸으로 의심되면 제보 페이지에서 내용을 등록해 주세요.
                  </p>
                </>
              )}
              {result.suggestions.length > 0 ? (
                <div className="lookup-suggestions">
                  <strong className="panel-title">이 번호를 찾으셨나요?</strong>
                  <div className="lookup-suggestion-list">
                    {result.suggestions.map((item) => (
                      <Link
                        key={`${item.kind}-${item.normalized}`}
                        className="lookup-suggestion-link"
                        href={`/lookup/${item.kind}/${encodeURIComponent(item.normalized)}`}
                      >
                        {item.display}{" "}
                        <span className="meta-copy">
                          ({suggestionTypeLabel(item.kind, item.normalized)})
                        </span>
                      </Link>
                    ))}
                  </div>
                  <p className="meta-copy">원하는 번호가 없다면 아래에서 직접 제보할 수 있습니다.</p>
                </div>
              ) : null}
              {!result.hidden ? (
                <div className="button-row" style={{ marginTop: 16 }}>
                  <Link
                    className="button"
                    href={
                      qrPayload
                        ? `/report?mode=qr&query=${encodeURIComponent(`qr:${qrPayload}`)}`
                        : `/report?query=${encodeURIComponent(rawQuery)}`
                    }
                  >
                    제보하기
                  </Link>
                </div>
              ) : null}
            </div>
          )}
          {result.found ? (
            <div className="detail-form-section">
              <EvaluationForm
                label={kind === "phone" ? "이 번호" : "이 계좌번호"}
                title="댓글 작성"
                submitLabel="댓글 등록"
                submissionType="comment"
                targetType={kind}
                targetDisplay={detailDisplay}
                targetNormalized={result.normalized}
                qrPayload={qrPayload}
              />
            </div>
          ) : null}
        </article>
      </section>
      <SiteFooter />
    </main>
  );
}

async function buildQrPreviewSafely(payload: string) {
  try {
    return await QRCode.toDataURL(payload, { width: 220, margin: 1 });
  } catch {
    return null;
  }
}

function suggestionTypeLabel(kind: LookupKind, normalized: string) {
  if (kind === "phone") return "전화번호";
  return normalized.startsWith("qr:") ? "QR" : "계좌번호";
}

function lookupTitle(kind: LookupKind, rawQuery: string) {
  if (extractQrPayload(rawQuery)) return "QR 조회 결과";
  return "번호 조회 결과";
}

function ResultSummary({
  target,
}: {
  kind: LookupKind;
  target: NonNullable<Awaited<ReturnType<typeof findTarget>>["found"]>;
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
