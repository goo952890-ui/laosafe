import { SiteHeader } from "@/components/SiteHeader";
import { abuseSignals, deletionRequests } from "@/lib/site-data";
import { getRecentTargets } from "@/lib/site-utils";

export default function AdminPage() {
  const recent = getRecentTargets().slice(0, 4);

  return (
    <main className="page-shell">
      <SiteHeader />
      <section className="admin-layout">
        <article className="surface-card">
          <div className="eyebrow">운영 필수 관리자 화면</div>
          <h1 className="section-title">평가 검토와 삭제 요청 처리</h1>
          <p className="section-copy">
            로그인된 운영자는 최근 평가, 삭제 요청, 반복 신고 패턴을 확인하고 의견 숨김/삭제,
            요청 상태 변경, IP 차단 등의 조치를 수행할 수 있습니다.
          </p>

          <div className="admin-list">
            {recent.map(({ target, latest }) => (
              <div className="admin-card" key={`${target.kind}-${target.normalized}`}>
                <strong>{target.display}</strong>
                <p className="meta-copy">
                  {target.kind === "phone" ? "전화번호" : "계좌번호"} · 최근 평가 {latest.createdAt}
                </p>
                <p className="body-copy">{latest.text}</p>
                <div className="button-row">
                  <button className="button-secondary" type="button">
                    의견 숨김
                  </button>
                  <button className="button-secondary" type="button">
                    의견 삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        </article>

        <div className="field-stack">
          <section className="surface-card">
            <h2 className="section-title">삭제 요청</h2>
            <div className="admin-list">
              {deletionRequests.map((request) => (
                <div className="admin-card" key={request.id}>
                  <strong>{request.targetLabel}</strong>
                  <p className="meta-copy">
                    {request.reason} · 상태 {request.status}
                  </p>
                  <p className="body-copy">{request.detail}</p>
                  <p className="meta-copy">연락처: {request.contact}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="surface-card">
            <h2 className="section-title">반복 신고 신호</h2>
            <div className="admin-list">
              {abuseSignals.map((signal) => (
                <div className="admin-card" key={signal.label}>
                  <strong>{signal.label}</strong>
                  <p className="body-copy">{signal.detail}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
