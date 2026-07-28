import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link href="/" className="brand-mark">
        <span className="brand-badge" aria-hidden="true" />
        <span>
          <span className="brand-title">Lao Safe</span>
          <span className="brand-caption">
            라오스 전화번호·계좌번호 공개 조회 서비스
          </span>
        </span>
      </Link>
      <nav className="site-nav" aria-label="주요 메뉴">
        <Link className="nav-link" href="/">
          검색
        </Link>
        <Link className="nav-link" href="/recent">
          최근 등록
        </Link>
        <Link className="nav-link" href="/guide">
          이용안내
        </Link>
        <Link className="nav-link" href="/admin">
          관리자 미리보기
        </Link>
      </nav>
    </header>
  );
}
