import Link from "next/link";

import type { UserLocale } from "@/lib/i18n";
import { getUserDictionary } from "@/lib/i18n";

export function SiteFooter({ locale }: { locale: UserLocale }) {
  const copy = getUserDictionary(locale);

  return (
    <footer className="site-footer">
      <div className="site-footer-brand">Lao Safe</div>
      <div className="site-footer-links">
        <Link href="/terms">{copy.common.terms}</Link>
        <Link href="/contact">{copy.common.contact}</Link>
      </div>
      <div className="site-footer-copy">© 2026 Lao Safe. All rights reserved.</div>
    </footer>
  );
}
