import { notFound } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";

import { EvaluationForm } from "@/components/EvaluationForm";
import { DeletionRequestForm } from "@/components/DeletionRequestForm";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getTypeLabel, getUserDictionary } from "@/lib/i18n";
import { type LookupKind } from "@/lib/site-data";
import { hasHiddenTarget } from "@/lib/site-repository";
import { formatAccountDisplay, formatPhoneDisplay, normalizeAccountLookupKey, normalizePhone } from "@/lib/site-utils";
import { getUserLocale } from "@/lib/user-locale";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{
    kind: string;
    query: string;
  }>;
}

export default async function ReportPage({ params }: PageProps) {
  noStore();
  const locale = await getUserLocale();
  const copy = getUserDictionary(locale);
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
      <SiteHeader locale={locale} />
      <section className="subpage-section">
        <div className="subpage-heading subpage-heading--stacked">
          <h1 className="subpage-title">{copy.reportPage.title}</h1>
          <p className="section-copy">{copy.reportPage.subtitle}</p>
        </div>
        <div className="report-target-box">
          <strong>{display}</strong>
        </div>
        <div className="request-panel">
          {hiddenTarget ? (
            <DeletionRequestForm
              locale={locale}
              target={display}
              targetNormalized={normalized}
              targetType={kind}
              title={copy.reportPage.hiddenTitle}
              intro={copy.reportPage.hiddenIntro}
              submitLabel={copy.reportPage.hiddenSubmit}
              defaultReason={copy.reportPage.objectionReason}
              reasonOptions={copy.reportPage.objectionReasons}
            />
          ) : (
            <EvaluationForm
              locale={locale}
              label={copy.common.target}
              title={copy.form.reportTitle}
              submitLabel={copy.form.reportSubmit}
              requireComment
              allowEvaluationChoice
              requireSafeApproval
              safeApprovalNotice={copy.form.safeApproval}
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
      <SiteFooter locale={locale} />
    </main>
  );
}
