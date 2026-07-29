import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link href="/" className="brand-mark">
        <img src="/laosafe-logo.png" alt="Lao Safe" className="brand-logo-image" />
      </Link>
      <nav className="site-nav" aria-label="주요 메뉴">
        <Link className="nav-link" href="/recent">
          최근 제보
        </Link>
      </nav>
    </header>
  );
}
