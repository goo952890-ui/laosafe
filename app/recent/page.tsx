import type { Metadata } from "next";
import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";

import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getTypeLabel, getUserDictionary } from "@/lib/i18n";
import { buildPageMetadata, getSiteUrl } from "@/lib/seo";
import { getRecentTargets } from "@/lib/site-repository";
import { maskAccountDisplay } from "@/lib/site-utils";
import { getUserLocale } from "@/lib/user-locale";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getUserLocale();
  const copy = getUserDictionary(locale);

  return buildPageMetadata({
    locale,
    path: "/recent",
    title: `${copy.recent.title} | Lao Who`,
    description: copy.recent.subtitle,
  });
}

export default async function RecentPage() {
  noStore();
  const locale = await getUserLocale();
  const copy = getUserDictionary(locale);
  const entries = await getRecentTargets();

  return (
    <main className="page-shell">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: copy.recent.title,
            itemListElement: entries.slice(0, 50).map(({ target }, index) => ({
              "@type": "ListItem",
              position: index + 1,
              url: `${getSiteUrl()}/lookup/${target.kind === "phone" ? "phone" : "account"}/${encodeURIComponent(
                target.kind === "account" ? target.normalized : target.display,
              )}`,
              name: target.display,
            })),
          }),
        }}
      />
      <SiteHeader locale={locale} />
      <section className="subpage-section">
        <div className="subpage-heading">
          <h1 className="subpage-title">{copy.recent.title}</h1>
          <p className="section-copy">{copy.recent.subtitle}</p>
        </div>
        <div className="board-table">
          <div className="board-table-head board-table-head--recent">
            <span>{copy.home.columns.number}</span>
            <span>{copy.home.columns.type}</span>
            <span>{copy.home.columns.opinion}</span>
            <span>{copy.home.columns.date}</span>
          </div>
          {entries.map(({ target, latest }) => {
            const typeLabel =
              target.kind === "phone"
                ? getTypeLabel(locale, "phone")
                : target.normalized.startsWith("qr:")
                  ? getTypeLabel(locale, "qr")
                  : getTypeLabel(locale, "account");
            const display =
              target.kind === "account"
                ? maskAccountDisplay(target.display)
                : target.display;

            return (
              <Link
                key={`${target.kind}-${target.normalized}`}
                href={`/lookup/${target.kind === "phone" ? "phone" : "account"}/${encodeURIComponent(
                  target.kind === "account" ? target.normalized : target.display,
                )}`}
                className="board-row board-row--recent"
              >
                <strong>{display}</strong>
                <span className="meta-copy">{typeLabel}</span>
                <span className="board-comment">{latest.text || "-"}</span>
                <span className="meta-copy">{latest.createdAt}</span>
              </Link>
            );
          })}
        </div>
      </section>
      <SiteFooter locale={locale} />
    </main>
  );
}
