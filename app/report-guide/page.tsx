import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export default function ReportGuidePage() {
  return (
    <main className="page-shell">
      <SiteHeader />
      <section className="subpage-section">
        <div className="subpage-heading">
          <h1 className="subpage-title">신고 안내</h1>
          <p className="section-copy">
            전화번호와 계좌번호는 로그인 없이 신고할 수 있으며, 내용 검토를 위해 최소한의
            접속정보가 저장됩니다.
          </p>
        </div>

        <div className="guide-grid">
          <div className="guide-panel">
            <strong>익명 신고 가능</strong>
            <p>별도의 회원가입 없이 의견과 신고 내용을 남길 수 있습니다.</p>
          </div>
          <div className="guide-panel">
            <strong>허위 신고 제한</strong>
            <p>허위 사실이나 타인의 개인정보를 등록하면 운영정책에 따라 삭제될 수 있습니다.</p>
          </div>
          <div className="guide-panel">
            <strong>IP 주소 저장</strong>
            <p>반복 신고와 악성 등록 방지를 위해 IP 주소와 접속정보를 저장합니다.</p>
          </div>
          <div className="guide-panel">
            <strong>삭제 요청 가능</strong>
            <p>잘못된 정보가 등록된 경우 별도 삭제 요청 페이지에서 검토를 요청할 수 있습니다.</p>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
