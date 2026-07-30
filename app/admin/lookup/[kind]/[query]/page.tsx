import { notFound } from "next/navigation";

import { requireAdminSession } from "@/lib/admin-auth";
import { AdminShell } from "@/components/AdminShell";
import { getAdminTargetDetail } from "@/lib/site-repository";
import { AdminCommentForm } from "@/components/AdminCommentForm";
import { AdminTargetVisibilityButton } from "@/components/AdminTargetVisibilityButton";

export const dynamic = "force-dynamic";

export default async function AdminTargetDetailPage({
  params,
}: {
  params: Promise<{ kind: string; query: string }>;
}) {
  await requireAdminSession();
  const resolved = await params;
  if (resolved.kind !== "phone" && resolved.kind !== "account") notFound();

  const detail = await getAdminTargetDetail(
    resolved.kind,
    decodeURIComponent(resolved.query),
  );

  if (!detail) notFound();

  return (
    <AdminShell
      title={detail.display}
      subtitle="최초 신고와 삭제 요청 내용을 확인합니다."
      actions={
        <AdminTargetVisibilityButton
          kind={detail.kind}
          normalized={detail.normalized}
          hidden={detail.evaluations.some((item) => item.status === "hidden" || item.status === "deleted")}
        />
      }
    >
      <section className="subpage-section admin-console-section">
        {detail.firstReport ? (
          <article className="primary-report-card">
            <div className="primary-report-label">최초 신고 내용</div>
            <div className="reply-head">
              <div className="reply-head-main">
                <strong>{detail.kind === "phone" ? "전화번호" : "계좌번호"}</strong>
              </div>
              <span className="comment-date">{detail.firstReport.created_at.slice(0, 10)}</span>
            </div>
            <p className="primary-report-body">{detail.firstReport.comment}</p>
            <p className="meta-copy">
              최초 신고자 IP: {detail.firstReport.encrypted_ip ?? detail.firstReport.ip_hash ?? "미기록"}
            </p>
          </article>
        ) : null}

        <section className="panel-block admin-panel-box">
          <h2 className="panel-title">삭제 요청 의견</h2>
          <div className="admin-list">
            {detail.deletionRequests.length === 0 ? (
              <div className="admin-card">
                <p className="body-copy">접수된 삭제 요청이 없습니다.</p>
              </div>
            ) : (
              detail.deletionRequests.map((item) => (
                <div className="admin-card" key={item.id}>
                  <strong>{item.reason}</strong>
                  <p className="meta-copy">
                    {item.created_at.slice(0, 10)} · 상태 {item.status}
                  </p>
                  <p className="body-copy">{item.description || "(상세 설명 없음)"}</p>
                  <p className="meta-copy">연락처: {item.contact || "-"}</p>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="panel-block admin-panel-box">
          <h2 className="panel-title">추가 의견</h2>
          <div className="admin-list">
            {detail.comments.length === 0 ? (
              <div className="admin-card">
                <p className="body-copy">등록된 추가 의견이 없습니다.</p>
              </div>
            ) : (
              detail.comments.map((item) => (
                <div className="admin-card" key={item.id}>
                  <strong>{item.meta.isAdmin ? "관리자" : item.meta.nickname ?? "익명"}</strong>
                  <p className="meta-copy">{item.created_at.slice(0, 10)}</p>
                  <p className="body-copy">{item.comment}</p>
                </div>
              ))
            )}
          </div>
        </section>

        <div className="detail-form-section">
          <AdminCommentForm kind={detail.kind} normalized={detail.normalized} display={detail.display} />
        </div>
      </section>
    </AdminShell>
  );
}
