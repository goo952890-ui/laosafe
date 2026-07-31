import { notFound } from "next/navigation";

import { requireAdminSession } from "@/lib/admin-auth";
import { AdminShell } from "@/components/AdminShell";
import { getAdminDeletedTargetDetail } from "@/lib/site-repository";

export const dynamic = "force-dynamic";

export default async function AdminDeletedTargetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminSession();
  const resolved = await params;
  const id = Number(resolved.id);

  if (!Number.isFinite(id)) {
    notFound();
  }

  const detail = await getAdminDeletedTargetDetail(id);

  if (!detail) {
    notFound();
  }

  return (
    <AdminShell
      title={detail.target_display}
      subtitle="삭제 이력에 보관된 최초 내용과 추가 의견을 확인합니다."
    >
      <section className="subpage-section admin-console-section">
        <article className="primary-report-card">
          <div className="primary-report-label">삭제된 대상 정보</div>
          <div className="reply-head">
            <div className="reply-head-main">
              <strong>
                {detail.target_type === "phone"
                  ? "전화번호"
                  : detail.target_normalized.startsWith("qr:")
                    ? "QR"
                    : "계좌번호"}
              </strong>
            </div>
            <span className="comment-date">{detail.deleted_at.slice(0, 10)}</span>
          </div>
          <p className="body-copy">제보 유형: {detail.evaluation === "safe" ? "안전" : detail.evaluation === "spam" ? "스팸" : "-"}</p>
          <p className="body-copy">최초 등록일: {detail.reported_at?.slice(0, 10) ?? "-"}</p>
          <p className="body-copy">삭제일: {detail.deleted_at.slice(0, 10)}</p>
        </article>

        {detail.firstReport ? (
          <article className="primary-report-card">
            <div className="primary-report-label">최초 신고 내용</div>
            <div className="reply-head">
              <div className="reply-head-main">
                <strong>{detail.evaluation === "safe" ? "안전" : "스팸"}</strong>
              </div>
              <span className="comment-date">{detail.firstReport.created_at?.slice(0, 10) ?? "-"}</span>
            </div>
            <p className="primary-report-body">{detail.firstReport.comment || "(내용 없음)"}</p>
            <p className="meta-copy">
              최초 신고자 IP: {detail.firstReport.encrypted_ip ?? detail.firstReport.ip_hash ?? "미기록"}
            </p>
          </article>
        ) : null}

        <section className="panel-block admin-panel-box">
          <h2 className="panel-title">추가 의견</h2>
          <div className="admin-list">
            {detail.comments.length === 0 ? (
              <div className="admin-card">
                <p className="body-copy">보관된 추가 의견이 없습니다.</p>
              </div>
            ) : (
              detail.comments.map((item) => (
                <div className="admin-card" key={item.id ?? `${item.comment}-${item.created_at}`}>
                  <strong>{item.meta.isAdmin ? "관리자" : item.meta.nickname ?? "익명"}</strong>
                  <p className="meta-copy">{item.created_at?.slice(0, 10) ?? "-"}</p>
                  <p className="body-copy">{item.comment || "(내용 없음)"}</p>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="panel-block admin-panel-box">
          <h2 className="panel-title">삭제 요청 의견</h2>
          <div className="admin-list">
            {detail.deletionRequests.length === 0 ? (
              <div className="admin-card">
                <p className="body-copy">보관된 삭제 요청이 없습니다.</p>
              </div>
            ) : (
              detail.deletionRequests.map((item) => (
                <div className="admin-card" key={item.id ?? `${item.reason}-${item.created_at}`}>
                  <strong>{item.reason ?? "(사유 없음)"}</strong>
                  <p className="meta-copy">
                    {(item.created_at ?? "").slice(0, 10)} · 상태 {item.status ?? "-"}
                  </p>
                  <p className="body-copy">{item.description || "(상세 설명 없음)"}</p>
                  <p className="meta-copy">연락처: {item.contact || "-"}</p>
                </div>
              ))
            )}
          </div>
        </section>
      </section>
    </AdminShell>
  );
}
