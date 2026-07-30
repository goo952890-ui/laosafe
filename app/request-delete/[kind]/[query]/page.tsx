import { notFound } from "next/navigation";

import { DeletionRequestForm } from "@/components/DeletionRequestForm";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getTypeLabel, getUserDictionary } from "@/lib/i18n";
import { type LookupKind } from "@/lib/site-data";
import { getUserLocale } from "@/lib/user-locale";

interface PageProps {
  params: Promise<{
    kind: string;
    query: string;
  }>;
}

export default async function DeleteRequestPage({ params }: PageProps) {
  const locale = await getUserLocale();
  const copy = getUserDictionary(locale);
  const resolved = await params;

  if (resolved.kind !== "phone" && resolved.kind !== "account") {
    notFound();
  }

  const kind = resolved.kind as LookupKind;
  const label = decodeURIComponent(resolved.query);

  return (
    <main className="page-shell">
      <SiteHeader locale={locale} />
      <section className="subpage-section">
        <div className="subpage-heading">
          <h1 className="subpage-title">
            {getTypeLabel(locale, kind === "phone" ? "phone" : "account")} {copy.common.deleteRequest}
          </h1>
          <p className="section-copy">{`${label} ${copy.deletion.submit}`}</p>
        </div>
        <div className="request-panel">
          <DeletionRequestForm locale={locale} target={label} targetNormalized={label} targetType={kind} />
        </div>
      </section>
      <SiteFooter locale={locale} />
    </main>
  );
}
