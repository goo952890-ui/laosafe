"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

import {
  LOCALE_LABELS,
  USER_LOCALE_COOKIE,
  USER_LOCALES,
  type UserLocale,
} from "@/lib/i18n";

export function LanguageSelector({ locale }: { locale: UserLocale }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <div className="language-selector" aria-label="Language selector">
      {USER_LOCALES.map((item) => (
        <button
          key={item}
          type="button"
          className={`language-selector-button ${locale === item ? "is-active" : ""}`}
          onClick={() => {
            const href = buildLocaleHref(pathname, searchParams, item);
            document.cookie = `${USER_LOCALE_COOKIE}=${item}; path=/; max-age=31536000; samesite=lax`;
            router.push(href, { scroll: false });
            router.refresh();
          }}
        >
          {LOCALE_LABELS[item]}
        </button>
      ))}
    </div>
  );
}

function buildLocaleHref(
  pathname: string,
  searchParams: ReturnType<typeof useSearchParams>,
  locale: UserLocale,
) {
  const params = new URLSearchParams(searchParams?.toString() ?? "");
  params.set("lang", locale);
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}
