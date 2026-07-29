import { notFound } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";

import { EvaluationForm } from "@/components/EvaluationForm";
import { DeletionRequestForm } from "@/components/DeletionRequestForm";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { type LookupKind } from "@/lib/site-data";
import { hasHiddenTarget } from "@/lib/site-repository";
import { formatAccountDisplay, formatPhoneDisplay, normalizeAccountLookupKey, normalizePhone } from "@/lib/site-utils";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{
    kind: string;
    query: string;
  }>;
}

export default async function ReportPage({ params }: PageProps) {
  noStore();
  const resolved = await params;

  if (resolved.kind !== "phone" && resolved.kind !== "account") {
    notFound();
  }

  const kind = resolved.kind as LookupKind;
  const rawQuery = decodeURIComponent(resolved.query);
  const normalized = kind === "phone" ? normalizePhone(rawQuery) : normalizeAccountLookupKey(rawQuery);
  const hiddenTarget = await hasHiddenTarget(kind, rawQuery);
  const display =
    kind === "phone"
      ? formatPhoneDisplay(normalized)
      : formatAccountDisplay(normalized);

  return (
    <main className="page-shell">
      <SiteHeader />
      <section className="subpage-section">
        <div className="subpage-heading subpage-heading--stacked">
          <h1 className="subpage-title">제보하기</h1>
          <p className="section-copy">
            아직 신고된 이력이 없는 {kind === "phone" ? "번호" : "계좌번호"}입니다. 스팸으로 의심되거나
            다른 사용자에게 도움이 되는 정보가 있다면 제보를 등록해 주세요. 안전번호 제보는 관리자
            검토 후 공식 번호인 경우에만 승인됩니다.
          </p>
        </div>
        <div className="report-target-box">
          <strong>{display}</strong>
        </div>
        <div className="request-panel">
          {hiddenTarget ? (
            <DeletionRequestForm
              target={display}
              targetNormalized={normalized}
              targetType={kind}
              title="삭제요청이 접수된 번호입니다."
              intro="이 번호는 삭제 요청으로 인해 사용자 화면에서 숨김 처리된 상태입니다. 의의가 있으면 내용을 남겨 주세요."
              submitLabel="의의 내용 접수"
              defaultReason="삭제 요청 이의"
              reasonOptions={["삭제 요청 이의", "재노출 요청", "기타"]}
            />
          ) : (
            <EvaluationForm
              label={kind === "phone" ? "이 번호" : "이 계좌번호"}
              title="제보 작성"
              submitLabel="제보하기"
              requireComment
              allowEvaluationChoice
              requireSafeApproval
              safeApprovalNotice="안전번호 제보는 관리자가 검토한 뒤 공식 번호로 확인되는 경우에만 승인됩니다."
              showIdentityFields={false}
              requirePassword={false}
              submissionType="report"
              targetType={kind}
              targetDisplay={display}
              targetNormalized={normalized}
              qrPayload={normalized.startsWith("qr:") ? formatAccountDisplay(normalized) : null}
              redirectPath={`/lookup/${kind}/${encodeURIComponent(normalized)}`}
              pendingRedirectPath={`/lookup/${kind}/${encodeURIComponent(normalized)}?review=safe`}
            />
          )}
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
