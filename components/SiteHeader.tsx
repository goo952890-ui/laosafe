import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link href="/" className="brand-mark">
        <span className="brand-badge" aria-hidden="true" />
        <span>
          <span className="brand-title">Lao Scam Number</span>
          <span className="brand-caption">라오스 전화번호·계좌번호 조회</span>
        </span>
      </Link>
      <nav className="site-nav" aria-label="주요 메뉴">
        <Link className="nav-link" href="/recent">
          최근 신고
        </Link>
        <Link className="nav-link" href="/report-guide">
          신고 안내
        </Link>
        <Link className="nav-link" href="/guide">
          이용 안내
        </Link>
      </nav>
    </header>
  );
}
