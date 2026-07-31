import { notFound } from "next/navigation";

import { requireAdminSession } from "@/lib/admin-auth";
import { AdminShell } from "@/components/AdminShell";
import { getAdminTargetDetail } from "@/lib/site-repository";
import { AdminTargetVisibilityButton } from "@/components/AdminTargetVisibilityButton";
import { AdminCommentsPanel } from "@/components/AdminCommentsPanel";
import { AdminFirstReportEditor } from "@/components/AdminFirstReportEditor";
import { parseEvaluationMeta } from "@/lib/evaluation-meta";
import Link from "next/link";

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

  if (!detail) {
    return (
      <AdminShell
        title={decodeURIComponent(resolved.query)}
        subtitle="검색 결과가 없습니다."
      >
        <section className="subpage-section admin-console-section">
          <div className="empty-state">
            <p className="body-copy">검색 결과가 없습니다.</p>
          </div>
        </section>
      </AdminShell>
    );
  }

  const safeRequests = detail.evaluations
    .filter((item) => {
      const meta = parseEvaluationMeta(item.user_agent);
      return (
        item.comment.trim().length > 0 &&
        item.evaluation === "safe" &&
        item.status === "hidden" &&
        meta.safeApprovalPending
      );
    })
    .map((item) => ({ ...item, meta: parseEvaluationMeta(item.user_agent) }));

  return (
    <AdminShell
      title={detail.display}
      subtitle="최초 신고와 삭제 요청 내용을 확인합니다."
      actions={
        <div className="admin-detail-head-actions">
          <Link
            className="board-link"
            href={`/lookup/${detail.kind}/${encodeURIComponent(detail.normalized)}`}
            target="_blank"
          >
            사용자 화면 바로가기
          </Link>
          <AdminTargetVisibilityButton
            kind={detail.kind}
            normalized={detail.normalized}
            status={
              detail.evaluations.some((item) => item.status === "hidden")
                ? "hidden"
                : "visible"
            }
          />
        </div>
      }
    >
      <section className="subpage-section admin-console-section">
        <section className="admin-detail-stats">
          <article className="admin-detail-stat-card">
            <span className="admin-stat-label">누적 조회수</span>
            <strong className="admin-stat-value">{detail.viewStats.totalViews.toLocaleString()}</strong>
          </article>
        </section>
        {detail.firstReport ? (
          <article className="primary-report-card">
            <div className="primary-report-label">최초 신고 내용</div>
            <div className="reply-head">
              <div className="reply-head-main">
                <strong>{detail.kind === "phone" ? "전화번호" : "계좌번호"}</strong>
              </div>
              <span className="comment-date">{detail.firstReport.created_at.slice(0, 10)}</span>
            </div>
            <AdminFirstReportEditor
              evaluationId={detail.firstReport.id}
              initialComment={detail.firstReport.comment}
            />
            <p className="meta-copy">
              최초 신고자 IP: {detail.firstReport.encrypted_ip ?? detail.firstReport.ip_hash ?? "미기록"}
            </p>
          </article>
        ) : null}

        <div className="admin-history-stack">
          <section className="panel-block admin-panel-box admin-history-section" id="safe-history">
            <h2 className="panel-title">안전번호 요청 이력</h2>
            <div className="admin-list">
              {safeRequests.length === 0 ? (
                <div className="admin-card">
                  <p className="body-copy">등록된 안전번호 요청 이력이 없습니다.</p>
                </div>
              ) : (
                safeRequests.map((item) => (
                  <div className="admin-card" key={item.id}>
                    <strong>{item.meta.isAdmin ? "관리자" : item.meta.nickname ?? "익명"}</strong>
                    <p className="meta-copy">{item.created_at.slice(0, 10)} · 승인 대기</p>
                    <p className="body-copy admin-card-message">{item.comment}</p>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="panel-block admin-panel-box admin-history-section" id="deletion-history">
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
                    <p className="body-copy admin-card-message">{item.description || "(상세 설명 없음)"}</p>
                    <p className="meta-copy">연락처: {item.contact || "-"}</p>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <AdminCommentsPanel
          comments={detail.comments}
          kind={detail.kind}
          normalized={detail.normalized}
          display={detail.display}
        />
      </section>
    </AdminShell>
  );
}
