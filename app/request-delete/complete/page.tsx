import Link from "next/link";

import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

interface PageProps {
  searchParams: Promise<{
    type?: string;
    target?: string;
  }>;
}

export default async function DeleteRequestCompletePage({ searchParams }: PageProps) {
  const resolved = await searchParams;
  const target = resolved.target ? decodeURIComponent(resolved.target) : null;
  const typeLabel = resolved.type === "account" ? "계좌번호" : "전화번호";

  return (
    <main className="page-shell">
      <SiteHeader />
      <section className="subpage-section">
        <div className="subpage-heading">
          <h1 className="subpage-title">삭제 요청이 완료되었습니다.</h1>
          <p className="section-copy">
            {target
              ? `${typeLabel} ${target}에 대한 삭제 요청이 정상적으로 접수되었습니다.`
              : "삭제 요청이 정상적으로 접수되었습니다."}
          </p>
        </div>
        <div className="request-panel">
          <div className="panel-block">
            <p className="body-copy">
              운영자가 내용을 검토한 뒤 처리 여부를 결정합니다. 필요한 경우 입력한 연락처로 추가 안내를 드릴 수 있습니다.
            </p>
            <div className="button-row">
              <Link href="/" className="button button-secondary">
                메인으로 이동
              </Link>
              {target ? (
                <Link
                  href={`/request-delete/${resolved.type === "account" ? "account" : "phone"}/${encodeURIComponent(target)}`}
                  className="button"
                >
                  다시 작성
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
