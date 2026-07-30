import type { Metadata } from "next";

import { USER_LOCALES, type UserLocale } from "@/lib/i18n";

const DEFAULT_SITE_URL = "https://laowho.com";

export function getSiteUrl() {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim() || DEFAULT_SITE_URL;
  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

export function buildLocalizedUrl(path: string, locale: UserLocale) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(normalizedPath, getSiteUrl());
  url.searchParams.set("lang", locale);
  return url.toString();
}

export function buildAlternates(path: string, locale: UserLocale) {
  const languages = Object.fromEntries(
    USER_LOCALES.map((item) => [item, buildLocalizedUrl(path, item)]),
  ) as Record<UserLocale, string>;

  return {
    canonical: buildLocalizedUrl(path, locale),
    languages: {
      ...languages,
      "x-default": buildLocalizedUrl(path, "lo"),
    },
  };
}

export function buildPageMetadata({
  locale,
  path,
  title,
  description,
  noindex = false,
}: {
  locale: UserLocale;
  path: string;
  title: string;
  description: string;
  noindex?: boolean;
}): Metadata {
  return {
    title,
    description,
    alternates: buildAlternates(path, locale),
    openGraph: {
      title,
      description,
      url: buildLocalizedUrl(path, locale),
      siteName: "Lao Who",
      type: "website",
      locale: mapOgLocale(locale),
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
    robots: noindex
      ? {
          index: false,
          follow: false,
          googleBot: {
            index: false,
            follow: false,
          },
        }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
          },
        },
  };
}

export function truncateSeoText(value: string, maxLength = 150) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

function mapOgLocale(locale: UserLocale) {
  switch (locale) {
    case "ko":
      return "ko_KR";
    case "en":
      return "en_US";
    default:
      return "lo_LA";
  }
}
