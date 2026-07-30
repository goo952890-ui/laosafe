import type { Metadata } from "next";
import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";

import { SearchTabs } from "@/components/SearchTabs";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getTypeLabel, getUserDictionary, type UserLocale } from "@/lib/i18n";
import { buildPageMetadata, getSiteUrl } from "@/lib/seo";
import { getHomeStats, getRecentTargets } from "@/lib/site-repository";
import { maskAccountDisplay } from "@/lib/site-utils";
import { getUserLocale } from "@/lib/user-locale";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getUserLocale();
  const copy = getUserDictionary(locale);

  return buildPageMetadata({
    locale,
    path: "/",
    title: copy.meta.title,
    description: copy.meta.description,
  });
}

export default async function Home() {
  noStore();
  const locale = await getUserLocale();
  const copy = getUserDictionary(locale);
  const [recentTargets, homeStats] = await Promise.all([
    getRecentTargets().then((items) => items.slice(0, 5)),
    getHomeStats(),
  ]);

  return (
    <main className="page-shell">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "Lao Safe",
            url: getSiteUrl(),
            inLanguage: locale,
            publisher: {
              "@type": "Organization",
              name: "Lao Safe",
              url: getSiteUrl(),
            },
          }),
        }}
      />
      <SiteHeader locale={locale} />

      <section className="hero-section">
        <div className="hero-copy-block">
          <h1 className="hero-title">{copy.home.title}</h1>
          <p className="hero-subtitle">{copy.home.subtitle}</p>
          <SearchTabs locale={locale} />
        </div>
      </section>

      <section className="stats-strip stats-strip--summary">
        <div className="stat-strip-item">
          <span className="stat-strip-label">{copy.home.totalRegistered}</span>
          <strong>{formatNumber(homeStats.totalReports, locale)}</strong>
        </div>
        <div className="stat-strip-item">
          <span className="stat-strip-label">{copy.home.todayReports}</span>
          <strong>{formatNumber(homeStats.todayReports, locale)}</strong>
        </div>
      </section>

      <section className="home-columns home-columns--single">
        <article className="board-section">
          <div className="board-header">
            <h2 className="board-title">{copy.home.recentTitle}</h2>
            <Link href="/recent" className="board-link">
              {copy.common.more}
            </Link>
          </div>
          <div className="board-table">
            <div className="board-table-head board-table-head--recent">
              <span>{copy.home.columns.number}</span>
              <span>{copy.home.columns.type}</span>
              <span>{copy.home.columns.opinion}</span>
              <span>{copy.home.columns.date}</span>
            </div>
            {recentTargets.map(({ target, latest }) => {
              const typeLabel =
                target.kind === "phone"
                  ? getTypeLabel(locale, "phone")
                  : target.normalized.startsWith("qr:")
                    ? getTypeLabel(locale, "qr")
                    : getTypeLabel(locale, "account");
              const display =
                target.kind === "phone"
                  ? maskRecentPhoneDisplay(target.display)
                  : target.kind === "account"
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
        </article>
      </section>

      <SiteFooter locale={locale} />
    </main>
  );
}

function formatNumber(value: number, locale: UserLocale) {
  const intlLocale = locale === "lo" ? "lo-LA" : locale === "en" ? "en-US" : "ko-KR";
  return new Intl.NumberFormat(intlLocale).format(value);
}

function maskRecentPhoneDisplay(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.length < 7) {
    return value;
  }

  if (digits.length <= 8) {
    return `${digits.slice(0, 3)}${"*".repeat(Math.max(2, digits.length - 5))}${digits.slice(-2)}`;
  }

  return `${digits.slice(0, 4)}${"*".repeat(Math.max(3, digits.length - 7))}${digits.slice(-3)}`;
}
