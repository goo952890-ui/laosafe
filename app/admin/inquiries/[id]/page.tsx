import { notFound } from "next/navigation";

import { requireAdminSession } from "@/lib/admin-auth";
import { AdminShell } from "@/components/AdminShell";
import { getAdminInquiryDetail } from "@/lib/content-repository";

export const dynamic = "force-dynamic";

export default async function AdminInquiryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminSession();
  const resolved = await params;
  const inquiry = await getAdminInquiryDetail(Number(resolved.id));

  if (!inquiry) {
    notFound();
  }

  return (
    <AdminShell
      title={inquiry.name}
      subtitle="문의 상세 내용을 확인합니다."
    >
      <section className="subpage-section admin-console-section">
        <article className="admin-panel-box admin-inquiry-detail">
          <div className="admin-inquiry-detail-grid">
            <div>
              <p className="meta-copy">이름</p>
              <strong>{inquiry.name}</strong>
            </div>
            <div>
              <p className="meta-copy">이메일</p>
              <strong>{inquiry.email}</strong>
            </div>
            <div>
              <p className="meta-copy">등록일</p>
              <strong>{inquiry.created_at.slice(0, 10)}</strong>
            </div>
          </div>
          <div className="admin-inquiry-message">
            <p className="meta-copy">문의 내용</p>
            <div className="admin-inquiry-message-box">{inquiry.message}</div>
          </div>
        </article>
      </section>
    </AdminShell>
  );
}
