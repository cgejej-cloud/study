import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "탁구존 — 스마트 탁구장 예약",
  description: "탁구존 온라인 예약 및 랭킹 서비스",
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
        <Header />
        <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8 animate-fade-in">
          {children}
        </main>
        <footer className="border-t border-gray-200 bg-white mt-12">
          <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-400">
            <span className="font-semibold text-gray-500">🏓 탁구존</span>
            <span>서울특별시 강남구 테헤란로 123 · 02-1234-5678 · 매일 09:00~22:00</span>
            <span>© 2025 탁구존</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
