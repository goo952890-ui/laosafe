import { ReportComposer } from "@/components/ReportComposer";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { hasHiddenTargetAny } from "@/lib/site-repository";

export const dynamic = "force-dynamic";

export default async function ReportHomePage({
  searchParams,
}: {
  searchParams: Promise<{ query?: string; mode?: string }>;
}) {
  const resolved = await searchParams;
  const query = decodeURIComponent(resolved.query ?? "");
  const mode = resolved.mode === "qr" ? "qr" : "text";
  const hiddenQuery = query ? await hasHiddenTargetAny(query, mode === "qr" ? "account" : "phone") : false;

  return (
    <main className="page-shell">
      <SiteHeader />
      <section className="subpage-section">
        <div className="subpage-heading subpage-heading--stacked">
          <h1 className="subpage-title">제보하기</h1>
          <p className="section-copy">
            전화번호, 계좌번호 또는 QR코드 이미지를 선택해 제보를 등록할 수 있습니다.
          </p>
        </div>
        <ReportComposer initialQuery={query} initialMode={mode} hiddenQuery={hiddenQuery} />
      </section>
      <SiteFooter />
    </main>
  );
}
