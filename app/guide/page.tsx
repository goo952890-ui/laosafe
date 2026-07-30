import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getUserDictionary } from "@/lib/i18n";
import { buildPageMetadata } from "@/lib/seo";
import { getUserLocale } from "@/lib/user-locale";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getUserLocale();
  const copy = getUserDictionary(locale);

  return buildPageMetadata({
    locale,
    path: "/guide",
    title: `${copy.guide.title} | Lao Who`,
    description: copy.guide.intro,
  });
}

export default async function GuidePage() {
  const locale = await getUserLocale();
  const copy = getUserDictionary(locale);

  return (
    <main className="page-shell">
      <SiteHeader locale={locale} />
      <section className="subpage-section">
        <div className="subpage-heading">
          <h1 className="subpage-title">{copy.guide.title}</h1>
          <p className="section-copy">{copy.guide.intro}</p>
        </div>

        <div className="guide-grid">
          {copy.guide.items.map(([title, body]) => (
            <div className="guide-panel" key={title}>
              <strong>{title}</strong>
              <p>{body}</p>
            </div>
          ))}
        </div>

        <div className="inline-notice inline-notice--warning">{copy.guide.outro}</div>
      </section>
      <SiteFooter locale={locale} />
    </main>
  );
}
