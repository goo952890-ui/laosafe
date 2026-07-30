import Link from "next/link";

import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getUserDictionary } from "@/lib/i18n";
import { getUserLocale } from "@/lib/user-locale";

interface PageProps {
  searchParams: Promise<{
    type?: string;
    target?: string;
    content?: string;
  }>;
}

export default async function DeleteRequestCompletePage({ searchParams }: PageProps) {
  const locale = await getUserLocale();
  const copy = getUserDictionary(locale);
  const resolved = await searchParams;
  const target = resolved.target ? decodeURIComponent(resolved.target) : null;
  const content = resolved.content ? decodeURIComponent(resolved.content) : null;
  const typeLabel = resolved.type === "account" ? copy.reportComposer.accountInput : copy.reportComposer.phoneInput;

  return (
    <main className="page-shell">
      <SiteHeader locale={locale} />
      <section className="subpage-section">
        <div className="subpage-heading">
          <h1 className="subpage-title">{copy.deletion.completeTitle}</h1>
          <p className="section-copy">
            {target
              ? `${typeLabel} ${target}`
              : copy.deletion.completeTitle}
          </p>
        </div>
        <div className="request-panel">
          <div className="panel-block">
            <p className="body-copy">{copy.deletion.completeBody}</p>
            <div className="field-stack">
              {target ? (
                <p className="body-copy">
                  <strong>{copy.deletion.requestedNumber}:</strong> {target}
                </p>
              ) : null}
              {content ? (
                <p className="body-copy">
                  <strong>{copy.deletion.content}:</strong> {content}
                </p>
              ) : null}
            </div>
            <div className="button-row">
              <Link href="/" className="button button-secondary">
                {copy.common.backToHome}
              </Link>
            </div>
          </div>
        </div>
      </section>
      <SiteFooter locale={locale} />
    </main>
  );
}
