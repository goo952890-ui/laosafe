import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export default function GuidePage() {
  return (
    <main className="page-shell">
      <SiteHeader />
      <section className="subpage-section">
        <div className="subpage-heading">
          <h1 className="subpage-title">이용 안내</h1>
          <p className="section-copy">
            Lao Safe는 전화번호와 계좌번호에 대한 사용자 신고 내역을 빠르게 조회하기 위한
            서비스입니다.
          </p>
        </div>

        <div className="guide-grid">
          <div className="guide-panel">
            <strong>전화번호 조회</strong>
            <p>공백, 하이픈, 국가번호 형식을 정리해 같은 번호로 검색합니다.</p>
          </div>
          <div className="guide-panel">
            <strong>계좌번호 조회</strong>
            <p>은행 선택 없이 계좌번호만 입력합니다. 수취인 이름은 일부만 마스킹해 표시합니다.</p>
          </div>
          <div className="guide-panel">
            <strong>QR 조회</strong>
            <p>송금 QR 이미지에서 계좌번호를 확인할 수 있을 때만 검색 결과로 이동합니다.</p>
          </div>
          <div className="guide-panel">
            <strong>신고 및 의견</strong>
            <p>로그인 없이 의견을 남길 수 있으며 허위 신고 방지를 위해 IP 주소가 저장됩니다.</p>
          </div>
        </div>

        <div className="inline-notice inline-notice--warning">
          서비스는 특정 번호를 공식적으로 안전 또는 사기로 판정하지 않습니다. 검색 결과와 의견은
          참고 자료로만 활용해 주세요.
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
