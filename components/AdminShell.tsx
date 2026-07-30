"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function AdminShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <main className="admin-app-shell">
      <header className="admin-app-topbar">
        <div className="admin-app-brand">
          <Link href="/admin" className="admin-app-brand-link">
            <span className="admin-app-brand-text">Lao Who</span>
          </Link>
          <span className="admin-app-brand-sub">Admin</span>
        </div>
        <div className="admin-app-search">
          <input className="admin-app-search-input" placeholder="번호, 계좌번호, 의견 검색" readOnly />
        </div>
        <div className="admin-app-topbar-actions">
          <Link className="admin-app-topbar-button" href="/">
            사용자 화면
          </Link>
        </div>
      </header>

      <div className="admin-app-body">
        <aside className="admin-app-sidebar">
          <div className="admin-sidebar-group">
            <div className="admin-sidebar-group-title">대시보드</div>
            <NavItem href="/admin" active={pathname === "/admin"}>
              관리자 메인
            </NavItem>
          </div>

          <div className="admin-sidebar-group">
            <div className="admin-sidebar-group-title">관리 항목</div>
            <NavItem href="/admin/list/targets" active={pathname.startsWith("/admin/list/targets")}>
              등록된 번호
            </NavItem>
            <NavItem href="/admin/list/comments" active={pathname.startsWith("/admin/list/comments")}>
              최근 의견
            </NavItem>
            <NavItem
              href="/admin/list/safe-requests"
              active={pathname.startsWith("/admin/list/safe-requests")}
            >
              안전번호 등록 요청
            </NavItem>
            <NavItem href="/admin/list/requests" active={pathname.startsWith("/admin/list/requests")}>
              삭제 요청
            </NavItem>
            <NavItem href="/admin/list/objections" active={pathname.startsWith("/admin/list/objections")}>
              번호 삭제 이의
            </NavItem>
            <NavItem href="/admin/list/inquiries" active={pathname.startsWith("/admin/list/inquiries")}>
              문의하기
            </NavItem>
          </div>

          <div className="admin-sidebar-group">
            <div className="admin-sidebar-group-title">보안 로그</div>
            <NavItem
              href="/admin/list/input-failures"
              active={pathname.startsWith("/admin/list/input-failures")}
            >
              입력 실패 로그
            </NavItem>
            <NavItem
              href="/admin/list/abnormal-ips"
              active={pathname.startsWith("/admin/list/abnormal-ips")}
            >
              비정상 패턴 IP
            </NavItem>
          </div>

          <div className="admin-sidebar-group">
            <div className="admin-sidebar-group-title">사이트 관리</div>
            <NavItem href="/admin/terms" active={pathname.startsWith("/admin/terms")}>
              이용약관
            </NavItem>
          </div>

          <div className="admin-sidebar-group">
          <div className="admin-sidebar-guide">
              등록된 번호, 안전번호 요청, 의견, 삭제 요청, 문의 내용을 이 화면에서 검토하고 숨김 여부를 관리합니다.
          </div>
          </div>
        </aside>

        <section className="admin-app-content">
          <div className="admin-app-content-head">
            <div>
              <h1 className="admin-app-title">{title}</h1>
              {subtitle ? <p className="admin-app-subtitle">{subtitle}</p> : null}
            </div>
            {actions ? <div className="admin-app-head-actions">{actions}</div> : null}
          </div>
          {children}
        </section>
      </div>
    </main>
  );
}

function NavItem({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={`admin-sidebar-link ${active ? "is-active" : ""}`}>
      {children}
    </Link>
  );
}
