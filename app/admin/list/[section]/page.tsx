import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAdminSession } from "@/lib/admin-auth";
import { AdminShell } from "@/components/AdminShell";
import { getAdminInquiriesPage } from "@/lib/content-repository";
import { parseEvaluationMeta } from "@/lib/evaluation-meta";
import { getAdminListPage } from "@/lib/site-repository";
import { normalizeAccountLookupKey, normalizePhone } from "@/lib/site-utils";

function getAdminTypeLabel(kind: "phone" | "account", normalized: string) {
  if (kind === "phone") return "전화";
  return normalized.startsWith("qr:") ? "QR" : "계좌";
}

export const dynamic = "force-dynamic";

export default async function AdminListPage({
  params,
  searchParams,
}: {
  params: Promise<{ section: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  await requireAdminSession();
  const resolved = await params;
  const query = await searchParams;
  const listSection = resolved.section as
    | "targets"
    | "comments"
    | "safe-requests"
    | "requests"
    | "objections"
    | "input-failures"
    | "abnormal-ips";

  if (
    resolved.section !== "targets" &&
    resolved.section !== "comments" &&
    resolved.section !== "safe-requests" &&
    resolved.section !== "requests" &&
    resolved.section !== "objections" &&
    resolved.section !== "inquiries" &&
    resolved.section !== "input-failures" &&
    resolved.section !== "abnormal-ips"
  ) {
    notFound();
  }

  const page = Math.max(1, Number(query.page ?? "1") || 1);
  const inquiriesData =
    resolved.section === "inquiries" ? await getAdminInquiriesPage(page, 10) : null;
  const data = inquiriesData ?? (await getAdminListPage(listSection, page, 10));
  const pageGroupStart = Math.floor((page - 1) / 10) * 10 + 1;
  const pageGroupEnd = Math.min(data.totalPages, pageGroupStart + 9);
  const pageNumbers = Array.from(
    { length: Math.max(0, pageGroupEnd - pageGroupStart + 1) },
    (_, index) => pageGroupStart + index,
  );

  return (
    <AdminShell
      title={data.title}
      subtitle="페이지당 10개씩 확인할 수 있습니다."
      actions={
        <Link className="board-link" href="/admin">
          관리자 메인
        </Link>
      }
    >
      <section className="subpage-section admin-console-section">
        <div className="admin-table admin-table--list">
          {data.items.length === 0 ? (
            <div className="empty-state">
              <p className="body-copy">표시할 항목이 없습니다.</p>
            </div>
          ) : resolved.section === "targets" ? (
            <>
              <div className="admin-table-head admin-table-head--targets">
                <span>No</span>
                <span>번호 유형</span>
                <span>제보 유형</span>
                <span>번호</span>
                <span>평가</span>
                <span>상태</span>
                <span>등록일</span>
              </div>
              {data.items.map((item, index) => (
                <Link
                  key={`${item.kind}-${item.normalized}`}
                  href={`/admin/lookup/${item.kind}/${encodeURIComponent(item.normalized)}`}
                  className="admin-table-row admin-table-row--targets"
                >
                  <span className="admin-mono">{(page - 1) * 10 + index + 1}</span>
                  <span className="admin-chip">{getAdminTypeLabel(item.kind, item.normalized)}</span>
                  <span className="admin-chip">{item.evaluationLabel}</span>
                  <strong className="admin-break">{item.number}</strong>
                  <span className={`status-text ${item.evaluationLabel === "안전" ? "safe" : "danger"}`}>
                    {item.evaluationLabel}
                  </span>
                  <span className={`status-text ${item.statusLabel === "표시" ? "safe" : item.statusLabel === "승인 대기" ? "warning" : "danger"}`}>
                    {item.statusLabel}
                  </span>
                  <span className="meta-copy">{item.createdAt.slice(0, 10)}</span>
                </Link>
              ))}
            </>
          ) : resolved.section === "comments" ? (
            <>
              <div className="admin-table-head admin-table-head--comments">
                <span>No</span>
                <span>ID</span>
                <span>대상</span>
                <span>평가</span>
                <span>상태</span>
                <span>의견</span>
                <span>등록일</span>
              </div>
              {data.items.map((item, index) => (
                <Link
                  key={item.id}
                  href={`/admin/lookup/${item.target_type === "phone" ? "phone" : "account"}/${encodeURIComponent(
                    item.target_type === "phone" ? normalizePhone(item.target_normalized) : item.target_normalized,
                  )}`}
                  className="admin-table-row admin-table-row--comments"
                >
                  <span className="admin-mono">{(page - 1) * 10 + index + 1}</span>
                  <span className="admin-mono">{item.id}</span>
                  <strong className="admin-break">{item.target_display}</strong>
                  <span className={`status-text ${item.evaluation === "spam" ? "danger" : "safe"}`}>
                    {item.evaluation === "spam" ? "스팸" : "안전"}
                  </span>
                  <span className={`status-text ${isPendingSafeApproval(item) ? "warning" : item.status === "visible" ? "safe" : "danger"}`}>
                    {isPendingSafeApproval(item) ? "승인 대기" : item.status === "visible" ? "표시" : item.status}
                  </span>
                  <span className="admin-ellipsis">{item.comment || "(의견 없음)"}</span>
                  <span className="meta-copy">{item.created_at.slice(0, 10)}</span>
                </Link>
              ))}
            </>
          ) : resolved.section === "safe-requests" ? (
            <>
              <div className="admin-table-head admin-table-head--safe-requests">
                <span>No</span>
                <span>번호 유형</span>
                <span>대상</span>
                <span>상태</span>
                <span>의견</span>
                <span>등록일</span>
              </div>
              {data.items.map((item, index) => (
                <Link
                  key={item.id}
                  href={`/admin/lookup/${item.target_type === "phone" ? "phone" : "account"}/${encodeURIComponent(
                    item.target_type === "phone" ? normalizePhone(item.target_normalized) : item.target_normalized,
                  )}`}
                  className="admin-table-row admin-table-row--safe-requests"
                >
                  <span className="admin-mono">{(page - 1) * 10 + index + 1}</span>
                  <span className="admin-chip">
                    {item.target_type === "phone"
                      ? "전화"
                      : item.target_normalized.startsWith("qr:")
                        ? "QR"
                        : "계좌"}
                  </span>
                  <strong className="admin-break">{item.target_display}</strong>
                  <span className="status-text warning">승인 대기</span>
                  <span className="admin-ellipsis">{item.comment || "(의견 없음)"}</span>
                  <span className="meta-copy">{item.created_at.slice(0, 10)}</span>
                </Link>
              ))}
            </>
          ) : resolved.section === "inquiries" ? (
            <>
              <div className="admin-table-head admin-table-head--inquiries">
                <span>No</span>
                <span>이름</span>
                <span>이메일</span>
                <span>문의 내용</span>
                <span>등록일</span>
              </div>
              {inquiriesData?.items.map((item, index) => (
                <div
                  key={item.id}
                  className="admin-table-row admin-table-row--inquiries"
                >
                  <span className="admin-mono">{(page - 1) * 10 + index + 1}</span>
                  <strong>{item.name}</strong>
                  <span className="admin-ellipsis">{item.email}</span>
                  <span className="admin-ellipsis admin-ellipsis--multiline">{item.message}</span>
                  <span className="meta-copy">{item.created_at.slice(0, 10)}</span>
                </div>
              ))}
            </>
          ) : resolved.section === "input-failures" || resolved.section === "abnormal-ips" ? (
            <>
              <div className="admin-table-head admin-table-head--requests">
                <span>No</span>
                <span>소스</span>
                <span>대상 유형</span>
                <span>대상값</span>
                <span>IP</span>
                <span>상세</span>
                <span>등록일</span>
              </div>
              {data.items.map((item, index) => (
                <div
                  key={item.id}
                  className="admin-table-row admin-table-row--requests"
                >
                  <span className="admin-mono">{(page - 1) * 10 + index + 1}</span>
                  <span className="admin-chip">{securitySourceLabel(item.source)}</span>
                  <span className="admin-chip">{securityTargetTypeLabel(item.target_type)}</span>
                  <strong className="admin-break">{item.target_value ?? "-"}</strong>
                  <span className="admin-mono">{item.ip ?? "-"}</span>
                  <span className="admin-ellipsis">{item.detail ?? "-"}</span>
                  <span className="meta-copy">{item.created_at.slice(0, 10)}</span>
                </div>
              ))}
            </>
          ) : (
            <>
              <div
                className={
                  resolved.section === "objections"
                    ? "admin-table-head admin-table-head--objections"
                    : "admin-table-head admin-table-head--requests"
                }
              >
                <span>No</span>
                <span>유형</span>
                <span>대상</span>
                <span>{resolved.section === "objections" ? "이의 내용" : "사유"}</span>
                {resolved.section === "requests" ? <span>상세 설명</span> : null}
                {resolved.section === "requests" ? <span>연락처</span> : null}
                {resolved.section === "requests" ? <span>상태</span> : null}
                <span>등록일</span>
              </div>
              {data.items.map((item, index) => {
                const kind = item.target_type === "phone" ? "phone" : "account";
                const normalized =
                  kind === "phone"
                    ? normalizePhone(item.target_label)
                    : normalizeAccountLookupKey(item.target_label);

                return (
                  <Link
                    key={item.id}
                    href={`/admin/lookup/${kind}/${encodeURIComponent(normalized)}`}
                    className={
                      resolved.section === "objections"
                        ? "admin-table-row admin-table-row--objections"
                        : "admin-table-row admin-table-row--requests"
                    }
                  >
                    <span className="admin-mono">{(page - 1) * 10 + index + 1}</span>
                    <span className="admin-chip">{kind === "phone" ? "전화" : "계좌"}</span>
                    <strong className="admin-break">{item.target_label}</strong>
                    <span className="admin-ellipsis">
                      {resolved.section === "objections" ? item.description || "(내용 없음)" : item.reason}
                    </span>
                    {resolved.section === "requests" ? (
                      <span className="admin-ellipsis">{item.description || "(상세 설명 없음)"}</span>
                    ) : null}
                    {resolved.section === "requests" ? (
                      <span className="admin-ellipsis">{item.contact || "-"}</span>
                    ) : null}
                    {resolved.section === "requests" ? (
                      <span className="meta-copy">{requestStatusLabel(item)}</span>
                    ) : null}
                    <span className="meta-copy">{item.created_at.slice(0, 10)}</span>
                  </Link>
                );
              })}
            </>
          )}
        </div>

        <div className="pagination-row">
          <Link
            className={`button button-secondary ${page <= 1 ? "is-disabled" : ""}`}
            href={page <= 1 ? "#" : `/admin/list/${resolved.section}?page=${page - 1}`}
            aria-disabled={page <= 1}
          >
            이전
          </Link>
          <div className="pagination-pages">
            {pageNumbers.map((pageNumber) => (
              <Link
                key={pageNumber}
                className={`pagination-page ${pageNumber === page ? "is-active" : ""}`}
                href={`/admin/list/${resolved.section}?page=${pageNumber}`}
              >
                {pageNumber}
              </Link>
            ))}
          </div>
          <Link
            className={`button button-secondary ${page >= data.totalPages ? "is-disabled" : ""}`}
            href={page >= data.totalPages ? "#" : `/admin/list/${resolved.section}?page=${page + 1}`}
            aria-disabled={page >= data.totalPages}
          >
            다음
          </Link>
        </div>
      </section>
    </AdminShell>
  );
}

function isPendingSafeApproval(item: {
  status: "visible" | "hidden" | "deleted";
  evaluation: "spam" | "safe";
  user_agent?: string | null;
}) {
  const meta = parseEvaluationMeta(item.user_agent);
  return item.status === "hidden" && item.evaluation === "safe" && meta.safeApprovalPending;
}

function securitySourceLabel(source: "evaluation" | "deletion_request" | "lookup_rate_limit") {
  switch (source) {
    case "evaluation":
      return "제보/댓글";
    case "deletion_request":
      return "삭제요청";
    case "contact_inquiry":
      return "문의하기";
    default:
      return "조회차단";
  }
}

function securityTargetTypeLabel(targetType?: "phone" | "bank_account" | null) {
  if (targetType === "phone") return "전화";
  if (targetType === "bank_account") return "계좌";
  return "-";
}

function requestStatusLabel(item: {
  status: "submitted" | "reviewing" | "resolved" | "rejected";
  target_hidden?: boolean;
}) {
  if (item.target_hidden) {
    return "숨김 처리 완료";
  }

  const status = item.status;
  switch (status) {
    case "reviewing":
      return "검토 중";
    case "resolved":
      return "처리 완료";
    case "rejected":
      return "거절";
    default:
      return "접수됨";
  }
}
