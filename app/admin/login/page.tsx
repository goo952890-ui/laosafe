import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { AdminLoginForm } from "@/components/AdminLoginForm";

export default function AdminLoginPage() {
  return (
    <main className="page-shell">
      <SiteHeader />
      <section className="subpage-section admin-login-shell">
        <div className="subpage-heading">
          <h1 className="subpage-title">관리자 로그인</h1>
          <p className="section-copy">
            운영자만 평가 숨김, 삭제 요청 처리, 실제 데이터 검토 기능에 접근할 수 있습니다.
          </p>
        </div>
        <div className="request-panel">
          <AdminLoginForm />
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
