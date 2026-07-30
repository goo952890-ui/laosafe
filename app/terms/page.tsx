import type { Metadata } from "next";
import { unstable_noStore as noStore } from "next/cache";

import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { TermsContent } from "@/components/TermsContent";
import { getUserDictionary } from "@/lib/i18n";
import { buildPageMetadata } from "@/lib/seo";
import { getTermsContent } from "@/lib/content-repository";
import { getUserLocale } from "@/lib/user-locale";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getUserLocale();
  const copy = getUserDictionary(locale);

  return buildPageMetadata({
    locale,
    path: "/terms",
    title: `${copy.terms.title} | Lao Safe`,
    description: copy.terms.subtitle,
  });
}

export default async function TermsPage() {
  noStore();
  const locale = await getUserLocale();
  const copy = getUserDictionary(locale);
  const content = await getTermsContent(locale);

  return (
    <main className="page-shell">
      <SiteHeader locale={locale} />
      <section className="subpage-section">
        <div className="subpage-heading">
          <h1 className="subpage-title">{copy.terms.title}</h1>
          <p className="section-copy">{copy.terms.subtitle}</p>
        </div>
        <TermsContent content={content} />
      </section>
      <SiteFooter locale={locale} />
    </main>
  );
}
