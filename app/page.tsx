import Link from "next/link";

import { SearchTabs } from "@/components/SearchTabs";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getRecentTargets } from "@/lib/site-repository";
import { maskAccountDisplay } from "@/lib/site-utils";

export default async function Home() {
  const recentTargets = (await getRecentTargets()).slice(0, 5);

  return (
    <main className="page-shell">
      <SiteHeader />

      <section className="hero-section">
        <div className="hero-copy-block">
          <h1 className="hero-title">모르는 번호, 더콜에서 확인하세요</h1>
          <p className="hero-subtitle">더 많은 사람들이 함께 만드는 안전한 전화·계좌 정보</p>
          <SearchTabs />
        </div>
        <div className="hero-visual" aria-hidden="true">
          <div className="hero-phone">
            <div className="hero-phone-notch" />
            <div className="hero-phone-screen">
              <span className="hero-phone-logo">thecall</span>
              <span className="hero-phone-eye">◉</span>
            </div>
          </div>
          <span className="hero-float hero-float-call">◌</span>
          <span className="hero-float hero-float-alert">!</span>
          <span className="hero-float hero-float-shield">⌂</span>
        </div>
      </section>

      <section className="stats-strip">
        <div className="stat-strip-item">
          <span className="stat-strip-label">누적 신고 수</span>
          <strong>1,248,531</strong>
        </div>
        <div className="stat-strip-item">
          <span className="stat-strip-label">안전한 번호</span>
          <strong>872,643</strong>
        </div>
        <div className="stat-strip-item">
          <span className="stat-strip-label">스팸 번호</span>
          <strong>375,888</strong>
        </div>
        <div className="stat-strip-item">
          <span className="stat-strip-label">오늘 신규 신고</span>
          <strong>1,269</strong>
        </div>
      </section>

      <section className="home-columns home-columns--reference">
        <article className="board-section">
          <div className="board-header">
            <h2 className="board-title">최근 신고 내역</h2>
            <Link href="/recent" className="board-link">
              더보기
            </Link>
          </div>
          <div className="board-table">
            <div className="board-table-head board-table-head--compact">
              <span>번호</span>
              <span>의견</span>
              <span>등록일</span>
            </div>
            {recentTargets.map(({ target, latest }) => {
              const display =
                target.kind === "account" ? maskAccountDisplay(target.display) : target.display;

              return (
                <Link
                  key={`${target.kind}-${target.normalized}`}
                  href={`/lookup/${target.kind === "phone" ? "phone" : "account"}/${target.display}`}
                  className="board-row board-row--compact"
                >
                  <strong>{display}</strong>
                  <span className="board-comment">{latest.text}</span>
                  <span className="meta-copy">{latest.createdAt}</span>
                </Link>
              );
            })}
          </div>
        </article>

        <aside className="side-stack">
          <section className="board-section">
            <div className="board-header">
              <h2 className="board-title">더콜은 이렇게 운영돼요</h2>
            </div>
            <div className="guide-list">
              <div className="guide-item">
                <strong>함께 만드는 정보</strong>
                <p>여러분의 신고가 다른 사람을 보호합니다.</p>
              </div>
              <div className="guide-item">
                <strong>익명 신고</strong>
                <p>로그인 없이 누구나 익명으로 신고할 수 있습니다.</p>
              </div>
              <div className="guide-item">
                <strong>정확한 정보 제공</strong>
                <p>다수의 신고를 기반으로 신뢰도 높은 정보를 제공합니다.</p>
              </div>
              <div className="guide-item">
                <strong>안전한 서비스</strong>
                <p>허위 신고 방지를 위해 IP를 저장하고 있습니다.</p>
              </div>
            </div>
          </section>
        </aside>
      </section>

      <SiteFooter />
    </main>
  );
}
