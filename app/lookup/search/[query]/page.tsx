import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";

import { SearchTabs } from "@/components/SearchTabs";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getTypeLabel, getUserDictionary } from "@/lib/i18n";
import { resolveUnifiedLookup } from "@/lib/site-repository";
import { buildPageMetadata } from "@/lib/seo";
import { getUserLocale } from "@/lib/user-locale";

export const dynamic = "force-dynamic";

export default async function UnifiedLookupPage({
  params,
}: {
  params: Promise<{ query: string }>;
}) {
  noStore();
  const locale = await getUserLocale();
  const copy = getUserDictionary(locale);
  const resolved = await params;
  const rawQuery = decodeURIComponent(resolved.query);
  const result = await resolveUnifiedLookup(rawQuery);

  if (result.exactMatches.length === 1) {
    const exact = result.exactMatches[0];
    redirect(`/lookup/${exact.kind}/${encodeURIComponent(rawQuery)}`);
  }

  return (
    <main className="page-shell">
      <SiteHeader locale={locale} />
      <section className="subpage-section lookup-search-shell">
        <SearchTabs locale={locale} />
      </section>
      <section className="lookup-stack">
        <article className="result-section">
          <div className="subpage-heading">
            <h1 className="subpage-title">{copy.lookup.title}</h1>
            <p className="section-copy">{copy.lookup.subtitle}</p>
          </div>

          <div className="result-keyline">
            <strong className="lookup-number">{rawQuery}</strong>
          </div>

          <div className="result-status-box">
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
                        ({item.kind === "phone" ? getTypeLabel(locale, "phone") : item.normalized.startsWith("qr:") ? getTypeLabel(locale, "qr") : getTypeLabel(locale, "account")})
                      </span>
                    </Link>
                  ))}
                </div>
                <p className="meta-copy">{copy.lookup.suggestionHelp}</p>
              </div>
            ) : (
              <>
                <p className="body-copy">{copy.lookup.noReport}</p>
                <p className="body-copy">{copy.lookup.noReportHelp}</p>
              </>
            )}

            <div className="button-row" style={{ marginTop: 16 }}>
              <Link className="button" href={`/report?query=${encodeURIComponent(rawQuery)}`}>
                {copy.common.report}
              </Link>
            </div>
          </div>
        </article>
      </section>
      <SiteFooter locale={locale} />
    </main>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ query: string }>;
}): Promise<Metadata> {
  const locale = await getUserLocale();
  const copy = getUserDictionary(locale);
  const resolved = await params;
  const rawQuery = decodeURIComponent(resolved.query);

  return buildPageMetadata({
    locale,
    path: `/lookup/search/${encodeURIComponent(rawQuery)}`,
    title: `${rawQuery} | Lao Who`,
    description: copy.lookup.subtitle,
    noindex: true,
  });
}
