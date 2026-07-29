import { notFound } from "next/navigation";

import { requireAdminSession } from "@/lib/admin-auth";
import { AdminShell } from "@/components/AdminShell";
import { getAdminTargetDetail } from "@/lib/site-repository";
import { AdminCommentForm } from "@/components/AdminCommentForm";
import { AdminTargetVisibilityButton } from "@/components/AdminTargetVisibilityButton";
import { AdminVisibilityList } from "@/components/AdminVisibilityList";
import { CommentThread } from "@/components/CommentThread";

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
      subtitle="관리자 상세 페이지"
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
                <strong>최초 신고</strong>
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
          <h2 className="panel-title">전체 댓글</h2>
          <div className="admin-list">
            {detail.comments.map((item) => (
              <div className="admin-card" key={item.id}>
                <strong>{item.meta.isAdmin ? "관리자 댓글" : item.meta.nickname ?? "익명"}</strong>
                <p className="meta-copy">
                  {item.created_at.slice(0, 10)} · 상태 {item.status}
                </p>
                <p className="body-copy">{item.comment}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="panel-block admin-panel-box">
          <AdminVisibilityList
            items={detail.evaluations
              .filter((item) => item.comment.trim().length > 0)
              .filter((item) => item.id !== detail.firstReport?.id)
              .map((item) => ({
                id: item.id,
                label: item.comment.slice(0, 80) || "(의견 없음)",
                status: item.status,
              }))}
          />
        </section>

        {detail.comments.length > 0 ? (
          <CommentThread
            title="사용자단 댓글 미리보기"
            comments={detail.comments
              .filter((item) => item.id !== detail.firstReport?.id)
              .map((item) => ({
              id: String(item.id),
              tone: item.evaluation,
              text: item.comment,
              createdAt: item.created_at.slice(0, 10),
              nickname: item.meta.nickname,
              isAdmin: item.meta.isAdmin,
            }))}
          />
        ) : null}

        <div className="detail-form-section">
          <AdminCommentForm kind={detail.kind} normalized={detail.normalized} display={detail.display} />
        </div>
      </section>
    </AdminShell>
  );
}
