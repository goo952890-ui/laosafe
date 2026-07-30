import type { Metadata } from "next";
import { Noto_Sans_Lao } from "next/font/google";
import { getSiteUrl } from "@/lib/seo";
import { getUserLocale } from "@/lib/user-locale";
import "./globals.css";

const notoSansLao = Noto_Sans_Lao({
  subsets: ["lao"],
  weight: ["400", "500", "700"],
  variable: "--font-lao",
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: "Lao Safe",
  description: "Phone number, account number, and QR lookup service for Laos.",
  icons: {
    icon: [
      { url: "/favicon.svg?v=2", type: "image/svg+xml" },
      { url: "/favicon.png?v=2", type: "image/png", sizes: "112x116" },
    ],
    shortcut: "/favicon.svg?v=2",
    apple: "/favicon.png?v=2",
  },
  openGraph: {
    title: "Lao Safe",
    description: "Phone number, account number, and QR lookup service for Laos.",
    siteName: "Lao Safe",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Lao Safe",
    description: "Phone number, account number, and QR lookup service for Laos.",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getUserLocale();

  return (
    <html lang={locale}>
      <body className={notoSansLao.variable}>{children}</body>
    </html>
  );
}
