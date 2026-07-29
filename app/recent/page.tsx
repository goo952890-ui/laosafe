import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";

import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getRecentTargets } from "@/lib/site-repository";
import { maskAccountDisplay } from "@/lib/site-utils";

export const dynamic = "force-dynamic";

export default async function RecentPage() {
  noStore();
  const entries = await getRecentTargets();

  return (
    <main className="page-shell">
      <SiteHeader />
      <section className="subpage-section">
        <div className="subpage-heading">
          <h1 className="subpage-title">최근 제보 내역</h1>
          <p className="section-copy">
            최근 등록된 전화번호와 계좌번호 제보를 시간순으로 확인할 수 있습니다.
          </p>
        </div>
        <div className="board-table">
          <div className="board-table-head board-table-head--recent">
            <span>번호</span>
            <span>유형</span>
            <span>의견</span>
            <span>등록일</span>
          </div>
          {entries.map(({ target, latest }) => {
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
      </section>
      <SiteFooter />
    </main>
  );
}
