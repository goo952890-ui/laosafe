import { notFound } from "next/navigation";

import { DeletionRequestForm } from "@/components/DeletionRequestForm";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { type LookupKind } from "@/lib/site-data";

interface PageProps {
  params: Promise<{
    kind: string;
    query: string;
  }>;
}

export default async function DeleteRequestPage({ params }: PageProps) {
  const resolved = await params;

  if (resolved.kind !== "phone" && resolved.kind !== "account") {
    notFound();
  }

  const kind = resolved.kind as LookupKind;
  const label = decodeURIComponent(resolved.query);

  return (
    <main className="page-shell">
      <SiteHeader />
      <section className="subpage-section">
        <div className="subpage-heading">
          <h1 className="subpage-title">
            {kind === "phone" ? "전화번호" : "계좌번호"} 삭제 요청
          </h1>
          <p className="section-copy">{label}에 대한 삭제 요청 내용을 제출합니다.</p>
        </div>
        <div className="request-panel">
          <DeletionRequestForm target={label} targetNormalized={label} targetType={kind} />
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
