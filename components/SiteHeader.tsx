import Link from "next/link";

import { LanguageSelector } from "@/components/LanguageSelector";
import type { UserLocale } from "@/lib/i18n";

export function SiteHeader({ locale }: { locale: UserLocale }) {
  return (
    <header className="site-header">
      <Link href="/" className="brand-mark">
        <img src="/laosafe-logo.png" alt="Lao Who" className="brand-logo-image" />
      </Link>
      <LanguageSelector locale={locale} />
    </header>
  );
}
