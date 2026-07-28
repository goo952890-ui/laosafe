import Link from "next/link";

import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getRecentTargets } from "@/lib/site-repository";
import { getCounts, maskAccountDisplay } from "@/lib/site-utils";

export default async function RecentPage() {
  const entries = await getRecentTargets();

  return (
    <main className="page-shell">
      <SiteHeader />
      <section className="subpage-section">
        <div className="subpage-heading">
          <h1 className="subpage-title">최근 신고 내역</h1>
          <p className="section-copy">
            최근 등록된 전화번호와 계좌번호 신고를 시간순으로 확인할 수 있습니다.
          </p>
        </div>
        <div className="board-table">
          <div className="board-table-head">
            <span>번호</span>
            <span>유형</span>
            <span>상태</span>
            <span>의견</span>
            <span>등록일</span>
          </div>
          {entries.map(({ target, latest }) => {
            const counts = getCounts(target.comments);
            const display =
              target.kind === "account" ? maskAccountDisplay(target.display) : target.display;

            return (
              <Link
                key={`${target.kind}-${target.normalized}`}
                href={`/lookup/${target.kind === "phone" ? "phone" : "account"}/${target.display}`}
                className="board-row board-row--five"
              >
                <strong>{display}</strong>
                <span className="meta-copy">
                  {target.kind === "phone" ? "전화번호" : "계좌번호"}
                </span>
                <span className={`status-text ${counts.spam >= 3 ? "danger" : counts.spam > 0 ? "warning" : "safe"}`}>
                  {counts.spam >= 3 ? "신고 다수" : counts.spam > 0 ? "신고 있음" : "신고 없음"}
                </span>
                <span className="board-comment">{latest.text}</span>
                <span className="meta-copy">{latest.createdAt}</span>
              </Link>
            );
          })}
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
