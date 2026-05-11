import type { Metadata, Viewport } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Providers from "@/components/Providers";

export const metadata: Metadata = {
  title: {
    default: "탁구존 — 스마트 탁구장 예약·랭킹",
    template: "%s | 탁구존",
  },
  description: "온라인 예약, 실시간 현황, ELO 랭킹 시스템 - 탁구존에서 더 즐거운 탁구를 즐기세요.",
  keywords: ["탁구", "탁구장 예약", "탁구 랭킹", "ELO", "강남 탁구장"],
  openGraph: {
    title: "탁구존",
    description: "스마트 탁구장 예약과 랭킹 시스템",
    type: "website",
    locale: "ko_KR",
  },
  twitter: {
    card: "summary",
    title: "탁구존",
    description: "스마트 탁구장 예약과 랭킹 시스템",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#15803d",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:bg-green-700 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg"
        >
          본문으로 건너뛰기
        </a>
        <Providers>
          <Header />
          <main id="main-content" className="flex-1 max-w-5xl mx-auto w-full px-4 py-8 animate-fade-in">
            {children}
          </main>
        </Providers>
        <footer className="border-t border-gray-200 bg-white mt-12">
          <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-400">
            <span className="font-semibold text-gray-500">🏓 탁구존</span>
            <span className="text-center">서울특별시 강남구 테헤란로 123 · 02-1234-5678 · 매일 09:00~22:00</span>
            <div className="flex items-center gap-3">
              <a href="/privacy" className="hover:text-gray-600">개인정보</a>
              <a href="/terms" className="hover:text-gray-600">이용약관</a>
              <span>© 2025</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
