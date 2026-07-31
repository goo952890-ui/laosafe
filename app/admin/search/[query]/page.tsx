import Link from "next/link";
import { redirect } from "next/navigation";

import { requireAdminSession } from "@/lib/admin-auth";
import { AdminShell } from "@/components/AdminShell";
import { resolveUnifiedLookup } from "@/lib/site-repository";

export const dynamic = "force-dynamic";

export default async function AdminUnifiedSearchPage({
  params,
}: {
  params: Promise<{ query: string }>;
}) {
  await requireAdminSession();
  const resolved = await params;
  const rawQuery = decodeURIComponent(resolved.query);
  const result = await resolveUnifiedLookup(rawQuery);

  if (result.exactMatches.length === 1) {
    const exact = result.exactMatches[0];
    redirect(`/admin/lookup/${exact.kind}/${encodeURIComponent(exact.normalized)}`);
  }

  const rows = result.exactMatches.length > 1 ? result.exactMatches : result.suggestions;

  return (
    <AdminShell title={rawQuery} subtitle="관리자 검색 결과입니다.">
      <section className="subpage-section admin-console-section">
        <div className="admin-table admin-table--list">
          {rows.length === 0 ? (
            <div className="empty-state">
              <p className="body-copy">검색 결과가 없습니다.</p>
            </div>
          ) : (
            <>
              <div className="admin-table-head admin-table-head--targets">
                <span>번호 유형</span>
                <span>번호</span>
                <span>이동</span>
              </div>
              {rows.map((item) => (
                <div className="admin-table-row admin-table-row--admin-search" key={`${item.kind}-${item.normalized}`}>
                  <span className="admin-chip">
                    {item.kind === "phone" ? "전화" : item.normalized.startsWith("qr:") ? "QR" : "계좌"}
                  </span>
                  <strong className="admin-break">{item.display}</strong>
                  <Link
                    className="board-link"
                    href={`/admin/lookup/${item.kind}/${encodeURIComponent(item.normalized)}`}
                  >
                    상세 보기
                  </Link>
                </div>
              ))}
            </>
          )}
        </div>
      </section>
    </AdminShell>
  );
}
