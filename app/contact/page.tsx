import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { ContactForm } from "@/components/ContactForm";
import { getUserDictionary } from "@/lib/i18n";
import { getUserLocale } from "@/lib/user-locale";

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
