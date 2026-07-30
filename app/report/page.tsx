import { ReportComposer } from "@/components/ReportComposer";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getUserDictionary } from "@/lib/i18n";
import { hasHiddenTargetAny } from "@/lib/site-repository";
import { getUserLocale } from "@/lib/user-locale";

export const dynamic = "force-dynamic";

export default async function ReportHomePage({
  searchParams,
}: {
  searchParams: Promise<{ query?: string; mode?: string }>;
}) {
  const locale = await getUserLocale();
  const copy = getUserDictionary(locale);
  const resolved = await searchParams;
  const query = decodeURIComponent(resolved.query ?? "");
  const mode = resolved.mode === "qr" ? "qr" : "text";
  const hiddenQuery = query ? await hasHiddenTargetAny(query, mode === "qr" ? "account" : "phone") : false;

  return (
    <main className="page-shell">
      <SiteHeader locale={locale} />
      <section className="subpage-section">
        <div className="subpage-heading subpage-heading--stacked">
          <h1 className="subpage-title">{copy.reportPage.title}</h1>
          <p className="section-copy">{copy.reportPage.subtitle}</p>
        </div>
        <ReportComposer locale={locale} initialQuery={query} initialMode={mode} hiddenQuery={hiddenQuery} />
      </section>
      <SiteFooter locale={locale} />
    </main>
  );
}
