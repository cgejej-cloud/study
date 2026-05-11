"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { SessionPayload } from "@/lib/session";

export default function Header() {
  const pathname = usePathname();
  const [session, setSession] = useState<SessionPayload | null | undefined>(undefined);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => setSession(d?.id ? d : null))
      .catch(() => setSession(null));
  }, []);

  useEffect(() => {
    if (!session?.id) return;
    fetch("/api/matches?pending=true")
      .then((r) => r.json())
      .then((d) => setPendingCount(Array.isArray(d) ? d.length : 0))
      .catch(() => {});
  }, [session]);

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    setSession(null);
    window.location.href = "/";
  }

  const navLink = (href: string, label: string) => {
    const active = pathname === href || (href !== "/" && pathname.startsWith(href));
    return (
      <Link
        href={href}
        className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
          active
            ? "bg-white/20 text-white"
            : "text-green-100 hover:text-white hover:bg-white/10"
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-50 bg-green-700 shadow-md">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* 로고 */}
        <Link href="/" className="flex items-center gap-2 text-white font-bold text-lg tracking-tight hover:opacity-90 transition-opacity">
          🏓 <span>탁구존</span>
        </Link>

        {/* 네비게이션 */}
        <nav className="flex items-center gap-1">
          {navLink("/reserve", "예약")}
          {navLink("/ranking", "랭킹")}

          {session === undefined ? (
            <span className="w-6 h-6 rounded-full bg-green-600 animate-pulse ml-2" />
          ) : session ? (
            <>
              <Link
                href="/mypage"
                className={`relative text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
                  pathname.startsWith("/mypage")
                    ? "bg-white/20 text-white"
                    : "text-green-100 hover:text-white hover:bg-white/10"
                }`}
              >
                마이페이지
                {pendingCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {pendingCount}
                  </span>
                )}
              </Link>
              {session.role === "admin" && navLink("/admin", "관리")}
              <span className="hidden sm:inline text-green-300 text-sm px-2">{session.name}</span>
              <button
                onClick={handleLogout}
                className="text-sm font-medium text-green-100 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors ml-1"
              >
                로그아웃
              </button>
            </>
          ) : (
            <>
              {navLink("/login", "로그인")}
              <Link
                href="/register"
                className="text-sm font-semibold bg-white text-green-700 hover:bg-green-50 px-3 py-1.5 rounded-lg transition-colors ml-1"
              >
                회원가입
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
