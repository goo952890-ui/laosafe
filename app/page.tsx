import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";

import { SearchTabs } from "@/components/SearchTabs";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getHomeStats, getRecentTargets } from "@/lib/site-repository";
import { maskAccountDisplay } from "@/lib/site-utils";

export const dynamic = "force-dynamic";

export default async function Home() {
  noStore();
  const [recentTargets, homeStats] = await Promise.all([
    getRecentTargets().then((items) => items.slice(0, 5)),
    getHomeStats(),
  ]);

  return (
    <main className="page-shell">
      <SiteHeader />

      <section className="hero-section">
        <div className="hero-copy-block">
          <h1 className="hero-title">모르는 번호, Lao Safe에서 확인하세요</h1>
          <p className="hero-subtitle">더 많은 사람들이 함께 만드는 안전한 전화·계좌 정보</p>
          <SearchTabs />
        </div>
      </section>

      <section className="stats-strip">
        <div className="stat-strip-item">
          <span className="stat-strip-label">등록된 번호</span>
          <strong>{formatNumber(homeStats.totalReports)}</strong>
        </div>
        <div className="stat-strip-item">
          <span className="stat-strip-label">안전한 번호</span>
          <strong>{formatNumber(homeStats.safeTargets)}</strong>
        </div>
        <div className="stat-strip-item">
          <span className="stat-strip-label">스팸 의심 번호</span>
          <strong>{formatNumber(homeStats.spamTargets)}</strong>
        </div>
        <div className="stat-strip-item">
          <span className="stat-strip-label">오늘 신규 제보</span>
          <strong>{formatNumber(homeStats.todayReports)}</strong>
        </div>
      </section>

      <section className="home-columns home-columns--single">
        <article className="board-section">
          <div className="board-header">
            <h2 className="board-title">최근 등록된 번호</h2>
            <Link href="/recent" className="board-link">
              더보기
            </Link>
          </div>
          <div className="board-table">
            <div className="board-table-head board-table-head--recent">
              <span>번호</span>
              <span>유형</span>
              <span>의견</span>
              <span>등록일</span>
            </div>
            {recentTargets.map(({ target, latest }) => {
              const typeLabel =
                target.kind === "phone"
                  ? "전화번호"
                  : target.normalized.startsWith("qr:")
                    ? "QR"
                    : "계좌번호";
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
        </article>
      </section>

      <SiteFooter />
    </main>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value);
}
