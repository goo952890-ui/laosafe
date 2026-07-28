import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lao Safe | 라오스 전화번호·계좌번호 조회",
  description:
    "라오스 전화번호와 계좌번호를 검색하고, 익명 평가와 의견을 확인할 수 있는 조회 서비스입니다.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  openGraph: {
    title: "Lao Safe",
    description:
      "라오스 전화번호와 계좌번호를 검색하고 익명 평가를 확인하는 조회 서비스",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
