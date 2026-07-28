import Link from "next/link";

import { SearchTabs } from "@/components/SearchTabs";
import { SiteHeader } from "@/components/SiteHeader";
import { getCounts, getRecentTargets, maskRecipientName } from "@/lib/site-utils";

export default function Home() {
  const recentTargets = getRecentTargets().slice(0, 3);

  return (
    <main className="page-shell">
      <SiteHeader />

      <section className="hero">
        <article className="hero-card">
          <div className="eyebrow">한국어 베타 · 공개 평가 기반 조회 서비스</div>
          <h1 className="hero-title">라오스 번호와 계좌를 더 빠르게 확인하는 방법</h1>
          <p className="hero-copy">
            Lao Safe는 라오스 전화번호와 계좌번호를 검색하고, 다른 사용자가 남긴 스팸 또는
            안전 평가를 함께 확인할 수 있는 공개형 조회 서비스입니다. 서비스는 특정 번호의
            안전성을 공식 보증하지 않으며, 모든 결과는 사용자 평가를 기반으로 표시합니다.
          </p>
          <div className="hero-points">
            <div className="hero-point">
              <strong>전화번호</strong>
              <span>공백, 하이픈, 국가번호를 정리해 같은 번호로 조회합니다.</span>
            </div>
            <div className="hero-point">
              <strong>계좌번호</strong>
              <span>은행 선택 없이 숫자만으로 검색하고 기존 평가를 확인합니다.</span>
            </div>
            <div className="hero-point">
              <strong>QR 업로드</strong>
              <span>QR 이미지에서 계좌번호가 명확할 때만 추출해 자동 검색합니다.</span>
            </div>
          </div>
        </article>

        <SearchTabs />
      </section>

      <section className="section">
        <div className="section-grid">
          <article className="surface-card">
            <h2 className="section-title">서비스 원칙</h2>
            <p className="body-copy">
              일반 사용자는 로그인하지 않습니다. 누구나 검색하고, 익명으로 스팸 또는 안전
              평가를 남길 수 있습니다. 허위 신고와 반복적인 악성 등록을 줄이기 위해 IP 주소,
              브라우저 정보, 기기 식별값 등 접속 정보를 저장합니다.
            </p>
          </article>
          <article className="surface-card">
            <h2 className="section-title">주의 안내</h2>
            <p className="body-copy">
              검색 결과가 없다고 해서 반드시 안전한 번호라는 의미는 아닙니다. 평가 수가 적은
              경우에는 정보가 충분하지 않을 수 있으므로 거래 전 추가 확인이 필요합니다.
            </p>
          </article>
          <article className="surface-card">
            <h2 className="section-title">수취인 이름 표기</h2>
            <p className="body-copy">
              계좌 수취인 이름이 확인되는 경우에도 전체를 공개하지 않고 일부만 마스킹해
              표시합니다. 예: {maskRecipientName("SOMPHONE SHOP")}
            </p>
          </article>
        </div>
      </section>

      <section className="section">
        <article className="surface-card">
          <h2 className="section-title">최근 등록</h2>
          <div className="record-list">
            {recentTargets.map(({ target, latest }) => {
              const counts = getCounts(target.comments);
              return (
                <Link
                  key={`${target.kind}-${target.normalized}`}
                  href={`/lookup/${target.kind === "phone" ? "phone" : "account"}/${target.display}`}
                  className="record-card"
                >
                  <strong>{target.display}</strong>
                  <p className="meta-copy">
                    {target.kind === "phone" ? "전화번호" : "계좌번호"} · 총 {counts.total}건
                    평가 · 최근 {latest.createdAt}
                  </p>
                  <p className="body-copy">{latest.text}</p>
                </Link>
              );
            })}
          </div>
          <div className="button-row" style={{ marginTop: 18 }}>
            <Link className="button-secondary" href="/recent">
              전체 최근 등록 보기
            </Link>
          </div>
        </article>
      </section>

      <footer className="footer">
        Lao Safe는 특정 번호나 계좌를 공식적으로 안전 또는 사기로 판정하지 않습니다. 검색
        결과와 수취인 정보는 참고용이며, 실제 거래 전 추가 검증이 필요합니다.
      </footer>
    </main>
  );
}
