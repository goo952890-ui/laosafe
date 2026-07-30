import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { ContactForm } from "@/components/ContactForm";
import { getUserDictionary } from "@/lib/i18n";
import { buildPageMetadata } from "@/lib/seo";
import { getUserLocale } from "@/lib/user-locale";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getUserLocale();
  const copy = getUserDictionary(locale);

  return buildPageMetadata({
    locale,
    path: "/contact",
    title: `${copy.contact.title} | Lao Safe`,
    description: copy.contact.subtitle,
  });
}

export default async function ContactPage() {
  const locale = await getUserLocale();
  const copy = getUserDictionary(locale);

  return (
    <main className="page-shell">
      <SiteHeader locale={locale} />
      <section className="subpage-section">
        <div className="subpage-heading">
          <h1 className="subpage-title">{copy.contact.title}</h1>
          <p className="section-copy">{copy.contact.subtitle}</p>
        </div>
        <ContactForm locale={locale} />
      </section>
      <SiteFooter locale={locale} />
    </main>
  );
}
