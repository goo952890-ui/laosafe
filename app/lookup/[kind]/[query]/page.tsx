import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { headers } from "next/headers";
import QRCode from "qrcode";

import { CommentThread } from "@/components/CommentThread";
import { EvaluationForm } from "@/components/EvaluationForm";
import { SearchTabs } from "@/components/SearchTabs";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getTypeLabel, getUserDictionary, type UserLocale } from "@/lib/i18n";
import { buildLocalizedUrl, buildPageMetadata, getSiteUrl, truncateSeoText } from "@/lib/seo";
import { findTarget } from "@/lib/site-repository";
import { type LookupKind } from "@/lib/site-data";
import Link from "next/link";
import { extractQrPayload, getCounts, maskRecipientName, normalizeAccountLookupKey, normalizePhone } from "@/lib/site-utils";
import { VotePanel } from "@/components/VotePanel";
import {
  checkLookupRateLimit,
  extractClientIp,
  formatRemainingMinutes,
  getLookupIdentity,
  LOOKUP_REQUEST_HEADER,
} from "@/lib/lookup-rate-limit";
import { writeSecurityLog } from "@/lib/security-logs";
import { getUserLocale } from "@/lib/user-locale";

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
  const locale = await getUserLocale();
  const copy = getUserDictionary(locale);
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
        <SiteHeader locale={locale} />
        <section className="subpage-section lookup-search-shell">
          <SearchTabs locale={locale} />
        </section>
        <section className="lookup-stack">
          <article className="result-section">
            <div className="subpage-heading">
              <h1 className="subpage-title">{copy.lookup.rateLimitTitle}</h1>
              <p className="section-copy">{copy.lookup.rateLimitSubtitle}</p>
            </div>
            <div className="result-status-box">
              <p className="body-copy">{copy.lookup.rateLimitDetected}</p>
              <p className="body-copy">{copy.lookup.rateLimitRetry.replace("{minutes}", String(formatRemainingMinutes(rateLimit.remainingMs)))}</p>
            </div>
          </article>
        </section>
        <SiteFooter locale={locale} />
      </main>
    );
  }

  const result = await findTarget(kind, rawQuery);
  const label = lookupTitle(locale, rawQuery);
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
  const typeLabel = lookupSeoTypeLabel(locale, kind, rawQuery, result.normalized);
  const canonicalPath = `/lookup/${kind}/${encodeURIComponent(result.normalized || rawQuery)}`;
  const pageUrl = buildLocalizedUrl(canonicalPath, locale);
  const seoTitle = buildLookupSeoTitle({
    locale,
    kind,
    rawQuery,
    detailDisplay,
    normalized: result.normalized,
  });
  const seoDescription = buildLookupSeoDescription({
    locale,
    detailDisplay,
    typeLabel,
    primaryComment: primaryComment?.text ?? null,
    found: Boolean(result.found),
    hidden: result.hidden,
  });

  const counts = result.found ? getCounts(result.found) : { spam: 0, safe: 0, total: 0, spamRatio: 0, safeRatio: 0 };

  return (
    <main className="page-shell">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "BreadcrumbList",
                "@id": `${pageUrl}#breadcrumb`,
                itemListElement: [
                  {
                    "@type": "ListItem",
                    position: 1,
                    name: "Lao Who",
                    item: getSiteUrl(),
                  },
                  {
                    "@type": "ListItem",
                    position: 2,
                    name: detailDisplay,
                    item: pageUrl,
                  },
                ],
              },
              {
                "@type": "WebPage",
                "@id": `${pageUrl}#webpage`,
                url: pageUrl,
                name: seoTitle,
                description: seoDescription,
                inLanguage: locale,
                isPartOf: {
                  "@type": "WebSite",
                  name: "Lao Who",
                  url: getSiteUrl(),
                },
                breadcrumb: {
                  "@id": `${pageUrl}#breadcrumb`,
                },
                mainEntity: {
                  "@id": `${pageUrl}#target`,
                },
              },
              {
                "@type": "PropertyValue",
                "@id": `${pageUrl}#target`,
                name: typeLabel,
                value: detailDisplay,
                identifier: result.normalized || detailDisplay,
                description: seoDescription,
              },
            ],
          }),
        }}
      />
      <SiteHeader locale={locale} />
      <section className="subpage-section lookup-search-shell">
        <SearchTabs locale={locale} />
      </section>
      <section className="lookup-stack">
        <article className="result-section">
          <div className="subpage-heading">
            <h1 className="subpage-title">{label}</h1>
            <p className="section-copy">{copy.lookup.subtitle}</p>
          </div>
          {query.review === "safe" ? (
            <div className="inline-notice">{copy.lookup.safePending}</div>
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
                {copy.common.deleteRequest}
              </Link>
            ) : null}
          </div>
          {qrPayload && qrPreview ? (
            <div className="qr-preview-panel">
              <div className="qr-preview-copy">
                <h2 className="panel-title">{copy.lookup.qrRaw}</h2>
                <p className="body-copy">{qrPayload}</p>
              </div>
              <img src={qrPreview} alt="QR preview" className="qr-preview-image" />
            </div>
          ) : null}

          {result.found ? (
            <>
              <ResultSummary locale={locale} target={result.found} />
              {primaryComment ? (
                <article className="primary-report-card">
                  <div className="primary-report-label">{copy.lookup.firstReport}</div>
                  <div className="reply-head">
                    <div className="reply-head-main" />
                    <span className="comment-date">{primaryComment.createdAt}</span>
                  </div>
                  <p className="primary-report-body">{primaryComment.text || copy.common.noOpinion}</p>
                </article>
              ) : null}
              <VotePanel
                locale={locale}
                targetType={kind}
                targetDisplay={detailDisplay}
                targetNormalized={result.normalized}
                qrPayload={qrPayload}
                spamCount={counts.spam}
                safeCount={counts.safe}
              />
              {replyComments.length > 0 ? <CommentThread locale={locale} comments={replyComments} title={copy.lookup.comments} /> : null}
            </>
          ) : (
            <div className="result-status-box">
              {result.hidden ? (
                <>
                  <p className="body-copy">{copy.lookup.hiddenTitle}</p>
                  <p className="body-copy">{copy.lookup.hiddenBody}</p>
                </>
              ) : (
                <>
                  <p className="body-copy">{copy.lookup.noReport}</p>
                  <p className="body-copy">{copy.lookup.noReportHelp}</p>
                </>
              )}
              {result.suggestions.length > 0 ? (
                <div className="lookup-suggestions">
                  <strong className="panel-title">{copy.lookup.didYouMean}</strong>
                  <div className="lookup-suggestion-list">
                    {result.suggestions.map((item) => (
                      <Link
                        key={`${item.kind}-${item.normalized}`}
                        className="lookup-suggestion-link"
                        href={`/lookup/${item.kind}/${encodeURIComponent(item.normalized)}`}
                      >
                        {item.display}{" "}
                        <span className="meta-copy">
                          ({suggestionTypeLabel(locale, item.kind, item.normalized)})
                        </span>
                      </Link>
                    ))}
                  </div>
                  <p className="meta-copy">{copy.lookup.suggestionHelp}</p>
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
                    {copy.common.report}
                  </Link>
                </div>
              ) : null}
            </div>
          )}
          {result.found ? (
            <div className="detail-form-section">
              <EvaluationForm
                locale={locale}
                label={copy.common.target}
                title={copy.form.commentTitle}
                submitLabel={copy.form.commentSubmit}
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
      <SiteFooter locale={locale} />
    </main>
  );
}

export async function generateMetadata({ params }: Pick<PageProps, "params">): Promise<Metadata> {
  const locale = await getUserLocale();
  const copy = getUserDictionary(locale);
  const resolved = await params;

  if (resolved.kind !== "phone" && resolved.kind !== "account") {
    return buildPageMetadata({
      locale,
      path: "/",
      title: copy.meta.title,
      description: copy.meta.description,
      noindex: true,
    });
  }

  const kind = resolved.kind as LookupKind;
  const rawQuery = decodeURIComponent(resolved.query);
  const result = await findTarget(kind, rawQuery);
  const normalizedPathValue =
    kind === "phone"
      ? result.normalized || normalizePhone(rawQuery) || rawQuery
      : result.normalized || normalizeAccountLookupKey(rawQuery) || rawQuery;
  const canonicalPath = `/lookup/${kind}/${encodeURIComponent(normalizedPathValue)}`;
  const detailDisplay = result.found?.display ?? result.display;
  const typeLabel = lookupSeoTypeLabel(locale, kind, rawQuery, normalizedPathValue);

  if (result.hidden) {
    return buildPageMetadata({
      locale,
      path: canonicalPath,
      title: buildLookupSeoTitle({
        locale,
        kind,
        rawQuery,
        detailDisplay,
        normalized: normalizedPathValue,
      }),
      description: buildLookupSeoDescription({
        locale,
        detailDisplay,
        typeLabel,
        primaryComment: null,
        found: false,
        hidden: true,
      }),
      noindex: true,
    });
  }

  if (!result.found) {
    return buildPageMetadata({
      locale,
      path: canonicalPath,
      title: buildLookupSeoTitle({
        locale,
        kind,
        rawQuery,
        detailDisplay,
        normalized: normalizedPathValue,
      }),
      description: buildLookupSeoDescription({
        locale,
        detailDisplay,
        typeLabel,
        primaryComment: null,
        found: false,
        hidden: false,
      }),
      noindex: true,
    });
  }

  const comments = result.found.comments
    .filter((comment) => !comment.isVoteOnly && comment.text.trim().length > 0)
    .sort((a, b) => Number(a.id) - Number(b.id));
  const primaryComment = comments[0]?.text?.trim();
  const description = buildLookupSeoDescription({
    locale,
    detailDisplay,
    typeLabel,
    primaryComment: primaryComment ?? null,
    found: true,
    hidden: false,
  });

  return buildPageMetadata({
    locale,
    path: canonicalPath,
    title: buildLookupSeoTitle({
      locale,
      kind,
      rawQuery,
      detailDisplay: result.found.display,
      normalized: normalizedPathValue,
    }),
    description,
  });
}

async function buildQrPreviewSafely(payload: string) {
  try {
    return await QRCode.toDataURL(payload, { width: 220, margin: 1 });
  } catch {
    return null;
  }
}

function suggestionTypeLabel(locale: UserLocale, kind: LookupKind, normalized: string) {
  if (kind === "phone") return getTypeLabel(locale, "phone");
  return normalized.startsWith("qr:") ? getTypeLabel(locale, "qr") : getTypeLabel(locale, "account");
}

function lookupSeoTypeLabel(
  locale: UserLocale,
  kind: LookupKind,
  rawQuery: string,
  normalized: string,
) {
  if (kind === "phone") {
    return getTypeLabel(locale, "phone");
  }

  if (extractQrPayload(rawQuery) || normalized.startsWith("qr:")) {
    return getTypeLabel(locale, "qr");
  }

  return getTypeLabel(locale, "account");
}

function buildLookupSeoTitle({
  locale,
  kind,
  rawQuery,
  detailDisplay,
  normalized,
}: {
  locale: UserLocale;
  kind: LookupKind;
  rawQuery: string;
  detailDisplay: string;
  normalized: string;
}) {
  const isQrLookup = kind === "account" && (extractQrPayload(rawQuery) || normalized.startsWith("qr:"));

  if (isQrLookup && (!detailDisplay || detailDisplay === normalized || normalized.startsWith("qr:"))) {
    return `${lookupInfoLabel(locale, "qr")} | Lao Who`;
  }

  const number = truncateSeoText(detailDisplay, 60);
  const infoLabel = lookupInfoLabel(locale, kind === "phone" ? "phone" : "account");
  return `${number} / ${number} ${infoLabel} | Lao Who`;
}

function lookupInfoLabel(locale: UserLocale, type: "phone" | "account" | "qr") {
  switch (locale) {
    case "ko":
      if (type === "phone") return "번호 정보";
      if (type === "account") return "계좌번호 정보";
      return "QR 정보";
    case "en":
      if (type === "phone") return "Phone Number Info";
      if (type === "account") return "Account Info";
      return "QR Info";
    default:
      if (type === "phone") return "ຂໍ້ມູນເບີໂທ";
      if (type === "account") return "ຂໍ້ມູນເລກບັນຊີ";
      return "ຂໍ້ມູນ QR";
  }
}

function buildLookupSeoDescription({
  locale,
  detailDisplay,
  typeLabel,
  primaryComment,
  found,
  hidden,
}: {
  locale: UserLocale;
  detailDisplay: string;
  typeLabel: string;
  primaryComment: string | null;
  found: boolean;
  hidden: boolean;
}) {
  const copy = getUserDictionary(locale);

  if (hidden) {
    return truncateSeoText(`${detailDisplay} ${typeLabel}. ${copy.lookup.hiddenBody}`, 160);
  }

  if (!found) {
    return truncateSeoText(`${detailDisplay} ${typeLabel}. ${copy.lookup.noReportHelp}`, 160);
  }

  if (primaryComment) {
    return truncateSeoText(`${detailDisplay} ${typeLabel}. ${primaryComment}`, 160);
  }

  return truncateSeoText(`${detailDisplay} ${typeLabel}. ${copy.lookup.subtitle}`, 160);
}

function lookupTitle(locale: UserLocale, rawQuery: string) {
  const copy = getUserDictionary(locale);
  if (extractQrPayload(rawQuery)) return copy.lookup.qrTitle;
  return copy.lookup.title;
}

function ResultSummary({
  locale,
  target,
}: {
  locale: UserLocale;
  target: NonNullable<Awaited<ReturnType<typeof findTarget>>["found"]>;
}) {
  const copy = getUserDictionary(locale);

  return (
    <>
      {"recipientName" in target && target.recipientName ? (
        <>
          <div className="account-meta-line">
            <span>{copy.lookup.recipient} {maskRecipientName(target.recipientName)}</span>
            <span>{copy.lookup.bank} {target.bankName ?? copy.lookup.unknown}</span>
          </div>
          <p className="disclaimer" style={{ marginTop: 10 }}>
            {copy.lookup.recipientDisclaimer}
          </p>
        </>
      ) : null}
    </>
  );
}
