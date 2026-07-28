import Link from "next/link";

import { SiteHeader } from "@/components/SiteHeader";
import { getCounts, getRecentTargets, maskRecipientName } from "@/lib/site-utils";

export default function RecentPage() {
  const entries = getRecentTargets();

  return (
    <main className="page-shell">
      <SiteHeader />
      <section className="surface-card">
        <div className="eyebrow">최근 등록</div>
        <h1 className="section-title">최근 평가와 등록 흐름</h1>
        <p className="section-copy">
          최근 올라온 전화번호와 계좌번호를 한 화면에서 확인할 수 있습니다. 평가는 시간순으로
          정렬되며, 정보가 없는 경우에도 신규 평가를 통해 첫 기록을 남길 수 있습니다.
        </p>
        <div className="record-list">
          {entries.map(({ target, latest }) => {
            const counts = getCounts(target.comments);
            return (
              <Link
                key={`${target.kind}-${target.normalized}`}
                href={`/lookup/${target.kind === "phone" ? "phone" : "account"}/${target.display}`}
                className="record-card"
              >
                <strong>{target.display}</strong>
                <p className="meta-copy">
                  {target.kind === "phone" ? "전화번호" : "계좌번호"} · 총 {counts.total}건 · 최근{" "}
                  {latest.createdAt}
                </p>
                {"recipientName" in target && target.recipientName ? (
                  <p className="meta-copy">
                    수취인: {maskRecipientName(target.recipientName)} · 은행:{" "}
                    {target.bankName ?? "미확인"}
                  </p>
                ) : null}
                <p className="body-copy">{latest.text}</p>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
