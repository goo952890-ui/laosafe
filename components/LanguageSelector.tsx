"use client";

import { useRouter } from "next/navigation";

import {
  LOCALE_LABELS,
  USER_LOCALE_COOKIE,
  USER_LOCALES,
  type UserLocale,
} from "@/lib/i18n";

export function LanguageSelector({ locale }: { locale: UserLocale }) {
  const router = useRouter();

  function changeLocale(nextLocale: UserLocale) {
    document.cookie = `${USER_LOCALE_COOKIE}=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }

  return (
    <div className="language-selector" aria-label="Language selector">
      {USER_LOCALES.map((item) => (
        <button
          key={item}
          type="button"
          className={`language-selector-button ${locale === item ? "is-active" : ""}`}
          onClick={() => changeLocale(item)}
        >
          {LOCALE_LABELS[item]}
        </button>
      ))}
    </div>
  );
}
