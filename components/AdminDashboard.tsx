"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { AdminDeletionRequestRow, AdminEvaluationRow } from "@/lib/admin-types";
import type { LookupKind } from "@/lib/site-data";
import { parseEvaluationMeta } from "@/lib/evaluation-meta";
import { normalizeAccountLookupKey, normalizePhone } from "@/lib/site-utils";
import { scanQrPayloadFromFile } from "@/lib/qr-scan-client";

function getAdminTypeLabel(kind: LookupKind, normalized: string) {
  if (kind === "phone") return "전화";
  return normalized.startsWith("qr:") ? "QR" : "계좌";
}

export function AdminDashboard({
  adminUsername,
  stats,
  targets,
  recentComments,
  safeRequests,
  deletionRequests,
  objections,
}: {
  adminUsername: string;
  stats: {
    totalRegistered: number;
    todayRegistered: number;
    hiddenTargets: number;
    spamTargets: number;
    safeTargets: number;
  };
  targets: Array<{
    kind: LookupKind;
    normalized: string;
    number: string;
    latestCreatedAt: string;
    evaluationLabel: string;
    statusLabel: "표시" | "숨김" | "승인 대기";
  }>;
  recentComments: AdminEvaluationRow[];
  safeRequests: AdminEvaluationRow[];
  deletionRequests: AdminDeletionRequestRow[];
  objections: AdminDeletionRequestRow[];
}) {
  const router = useRouter();
  const [searchKind, setSearchKind] = useState<LookupKind>("phone");
  const [searchValue, setSearchValue] = useState("");
  const [qrMessage, setQrMessage] = useState<string | null>(null);

  function goDetail(kind: LookupKind, value: string) {
    const normalized = kind === "phone" ? normalizePhone(value) : normalizeAccountLookupKey(value);
    if (!normalized) return;
    router.push(`/admin/lookup/${kind}/${encodeURIComponent(normalized)}`);
  }

  async function onQrFileChange(file: File | null) {
    if (!file) return;

    setQrMessage("QR코드를 분석하는 중입니다.");

    try {
      const payload = await scanQrPayloadFromFile(file);
      if (!payload) {
        setQrMessage("이미지에서 QR코드를 찾을 수 없습니다.");
        return;
      }

      setQrMessage("QR코드를 확인했습니다.");
      router.push(`/admin/lookup/account/${encodeURIComponent(`qr:${payload}`)}`);
    } catch {
      setQrMessage("이미지를 처리하는 중 문제가 발생했습니다.");
    }
  }

  return (
    <>
      <section className="subpage-section admin-console-section">
        <div className="admin-workspace">
          <div className="admin-workspace-main">
            <div className="admin-console-heading">
              <div>
                <h2 className="admin-console-tab is-active">번호 관리</h2>
                <p className="section-copy">등록된 번호, 최근 의견, 삭제 요청, 삭제 이의를 빠르게 검토합니다.</p>
              </div>
              <div className="admin-session-bar">
                <span className="meta-copy">로그인: {adminUsername}</span>
              </div>
            </div>

            <div className="admin-search-box admin-search-box--panel">
              <div className="sub-switch">
                <button
                  type="button"
                  className={`sub-switch-button ${searchKind === "phone" ? "is-active" : ""}`}
                  onClick={() => setSearchKind("phone")}
                >
                  번호 검색
                </button>
                <button
                  type="button"
                  className={`sub-switch-button ${searchKind === "account" ? "is-active" : ""}`}
                  onClick={() => setSearchKind("account")}
                >
                  계좌 검색
                </button>
              </div>
              <div className="admin-search-row">
                <input
                  className="input"
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                  placeholder={searchKind === "phone" ? "020 5555 1234" : "010 123 456789"}
                />
                <button className="button" type="button" onClick={() => goDetail(searchKind, searchValue)}>
                  상세 이동
                </button>
              </div>
              {searchKind === "account" ? (
                <div className="admin-qr-row">
                  <input
                    className="input"
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                    onChange={(event) => onQrFileChange(event.target.files?.[0] ?? null)}
                  />
                  {qrMessage ? <p className="meta-copy">{qrMessage}</p> : null}
                </div>
              ) : null}
            </div>
          </div>
          <aside className="admin-guide-panel">
            <h3 className="admin-guide-title">운영 가이드</h3>
            <p className="body-copy">
              등록된 번호, 최근 의견, 삭제 요청을 한 화면에서 검토하고 상세 페이지로 바로 이동할 수 있습니다.
            </p>
            <p className="body-copy">
              번호 상세에서는 최초 신고, IP, 댓글, 숨김 상태를 함께 확인하고 관리자 댓글을 직접 남길 수 있습니다.
            </p>
            <p className="body-copy">
              계좌 검색에서는 QR 이미지 업로드도 가능하며, QR 원문을 기준으로 등록된 건을 검토할 수 있습니다.
            </p>
            <p className="body-copy">
              안전번호 신고는 자동 공개되지 않으며, 관리자 검토 후 공식 번호인 경우에만 승인됩니다.
            </p>
          </aside>
        </div>
      </section>

      <section className="admin-stats-grid">
        <article className="admin-stat-card">
          <span className="admin-stat-label">전체 등록</span>
          <strong className="admin-stat-value">{stats.totalRegistered.toLocaleString()}</strong>
        </article>
        <article className="admin-stat-card">
          <span className="admin-stat-label">오늘 등록</span>
          <strong className="admin-stat-value">{stats.todayRegistered.toLocaleString()}</strong>
        </article>
        <article className="admin-stat-card">
          <span className="admin-stat-label">숨김</span>
          <strong className="admin-stat-value">{stats.hiddenTargets.toLocaleString()}</strong>
        </article>
        <article className="admin-stat-card is-danger">
          <span className="admin-stat-label">스팸</span>
          <strong className="admin-stat-value">{stats.spamTargets.toLocaleString()}</strong>
        </article>
        <article className="admin-stat-card is-safe">
          <span className="admin-stat-label">안전</span>
          <strong className="admin-stat-value">{stats.safeTargets.toLocaleString()}</strong>
        </article>
      </section>

      <section className="admin-dashboard-grid">
        <article className="board-section admin-console-panel admin-dashboard-grid__wide">
          <div className="board-header">
            <h2 className="board-title">등록된 번호</h2>
            <Link className="board-link" href="/admin/list/targets">
              더보기
            </Link>
          </div>
          <div className="admin-table">
            <div className="admin-table-head admin-table-head--targets">
              <span>No</span>
              <span>번호 유형</span>
              <span>제보 유형</span>
              <span>번호</span>
              <span>평가</span>
              <span>상태</span>
              <span>등록일</span>
            </div>
            {targets.map((item, index) => (
              <Link
                key={`${item.kind}-${item.normalized}`}
                href={`/admin/lookup/${item.kind}/${encodeURIComponent(item.normalized)}`}
                className="admin-table-row admin-table-row--targets"
              >
                <span className="admin-mono">{index + 1}</span>
                <span className="admin-chip">{getAdminTypeLabel(item.kind, item.normalized)}</span>
                <span className="admin-chip">{item.evaluationLabel}</span>
                <strong>{item.number}</strong>
                <span className={`status-text ${item.evaluationLabel === "안전" ? "safe" : "danger"}`}>
                  {item.evaluationLabel}
                </span>
                <span className={`status-text ${item.statusLabel === "표시" ? "safe" : item.statusLabel === "승인 대기" ? "warning" : "danger"}`}>
                  {item.statusLabel}
                </span>
                <span className="meta-copy">{item.latestCreatedAt.slice(0, 10)}</span>
              </Link>
            ))}
          </div>
        </article>

        <section className="board-section admin-console-panel">
          <div className="board-header">
            <h2 className="board-title">최근 의견</h2>
            <Link className="board-link" href="/admin/list/comments">
              더보기
            </Link>
          </div>
          <div className="admin-table">
            <div className="admin-table-head admin-table-head--comments">
              <span>No</span>
              <span>ID</span>
              <span>대상</span>
              <span>평가</span>
              <span>상태</span>
              <span>의견</span>
              <span>등록일</span>
            </div>
            {recentComments.map((item, index) => (
              <CommentRow item={item} index={index} key={item.id} />
            ))}
          </div>
        </section>

        <section className="board-section admin-console-panel">
          <div className="board-header">
            <h2 className="board-title">안전번호 등록 요청</h2>
            <Link className="board-link" href="/admin/list/safe-requests">
              더보기
            </Link>
          </div>
          <div className="admin-table">
            {safeRequests.length === 0 ? (
              <div className="empty-state">
                <p className="body-copy">접수된 안전번호 등록 요청이 없습니다.</p>
              </div>
            ) : (
              <>
                <div className="admin-table-head admin-table-head--safe-requests">
                  <span>No</span>
                  <span>번호 유형</span>
                  <span>대상</span>
                  <span>상태</span>
                  <span>의견</span>
                  <span>등록일</span>
                </div>
                {safeRequests.map((item, index) => (
                  <Link
                    key={item.id}
                    href={`/admin/lookup/${item.target_type === "phone" ? "phone" : "account"}/${encodeURIComponent(
                      item.target_type === "phone" ? normalizePhone(item.target_normalized) : item.target_normalized,
                    )}`}
                    className="admin-table-row admin-table-row--safe-requests"
                  >
                    <span className="admin-mono">{index + 1}</span>
                    <span className="admin-chip">
                      {item.target_type === "phone"
                        ? "전화"
                        : item.target_normalized.startsWith("qr:")
                          ? "QR"
                          : "계좌"}
                    </span>
                    <strong>{item.target_display}</strong>
                    <span className="status-text warning">승인 대기</span>
                    <span className="admin-ellipsis">{item.comment || "(의견 없음)"}</span>
                    <span className="meta-copy">{item.created_at.slice(0, 10)}</span>
                  </Link>
                ))}
              </>
            )}
          </div>
        </section>

        <section className="board-section admin-console-panel">
          <div className="board-header">
            <h2 className="board-title">삭제 요청</h2>
            <Link className="board-link" href="/admin/list/requests">
              더보기
            </Link>
          </div>
          <div className="admin-table">
            <div className="admin-table-head admin-table-head--requests">
              <span>No</span>
              <span>유형</span>
              <span>대상</span>
              <span>사유</span>
              <span>상태</span>
              <span>등록일</span>
            </div>
            {deletionRequests.map((item, index) => (
              <Link
                key={item.id}
                href={`/admin/lookup/${item.target_type === "phone" ? "phone" : "account"}/${encodeURIComponent(
                  item.target_type === "phone" ? normalizePhone(item.target_label) : normalizeAccountLookupKey(item.target_label),
                )}`}
                className="admin-table-row admin-table-row--requests"
              >
                <span className="admin-mono">{index + 1}</span>
                <span className="admin-chip">{item.target_type === "phone" ? "전화" : "계좌"}</span>
                <strong>{item.target_label}</strong>
                <span>{item.reason}</span>
                <span className="meta-copy">{requestStatusLabel(item.status)}</span>
                <span className="meta-copy">{item.created_at.slice(0, 10)}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="board-section admin-console-panel">
          <div className="board-header">
            <h2 className="board-title">번호 삭제 이의</h2>
            <Link className="board-link" href="/admin/list/objections">
              더보기
            </Link>
          </div>
          <div className="admin-table">
            {objections.length === 0 ? (
              <div className="empty-state">
                <p className="body-copy">접수된 이의가 없습니다.</p>
              </div>
            ) : (
              <>
                <div className="admin-table-head admin-table-head--objections">
                  <span>No</span>
                  <span>유형</span>
                  <span>대상</span>
                  <span>이의 내용</span>
                  <span>등록일</span>
                </div>
                {objections.map((item, index) => (
                  <Link
                    key={item.id}
                    href={`/admin/lookup/${item.target_type === "phone" ? "phone" : "account"}/${encodeURIComponent(
                      item.target_type === "phone" ? normalizePhone(item.target_label) : normalizeAccountLookupKey(item.target_label),
                    )}`}
                    className="admin-table-row admin-table-row--objections"
                  >
                    <span className="admin-mono">{index + 1}</span>
                    <span className="admin-chip">{item.target_type === "phone" ? "전화" : "계좌"}</span>
                    <strong>{item.target_label}</strong>
                    <span className="admin-ellipsis">{item.description || "(내용 없음)"}</span>
                    <span className="meta-copy">{item.created_at.slice(0, 10)}</span>
                  </Link>
                ))}
              </>
            )}
          </div>
        </section>
      </section>
    </>
  );
}

function isPendingSafeApproval(item: AdminEvaluationRow) {
  const meta = parseEvaluationMeta(item.user_agent);
  return item.status === "hidden" && item.evaluation === "safe" && meta.safeApprovalPending;
}

function CommentRow({ item, index }: { item: AdminEvaluationRow; index: number }) {
  const pendingSafe = isPendingSafeApproval(item);

  return (
    <Link
      href={`/admin/lookup/${item.target_type === "phone" ? "phone" : "account"}/${encodeURIComponent(
        item.target_type === "phone" ? normalizePhone(item.target_normalized) : item.target_normalized,
      )}`}
      className="admin-table-row admin-table-row--comments"
    >
      <span className="admin-mono">{index + 1}</span>
      <span className="admin-mono">{item.id}</span>
      <strong>{item.target_display}</strong>
      <span className={`status-text ${item.evaluation === "spam" ? "danger" : "safe"}`}>
        {item.evaluation === "spam" ? "스팸" : "안전"}
      </span>
      <span
        className={`status-text ${
          pendingSafe ? "warning" : item.status === "visible" ? "safe" : "danger"
        }`}
      >
        {pendingSafe ? "승인 대기" : item.status === "visible" ? "표시" : item.status}
      </span>
      <span className="admin-ellipsis">{item.comment || "(의견 없음)"}</span>
      <span className="meta-copy">{item.created_at.slice(0, 10)}</span>
    </Link>
  );
}

function requestStatusLabel(status: AdminDeletionRequestRow["status"]) {
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
