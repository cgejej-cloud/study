"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { SessionPayload } from "@/lib/session";
import NotificationBell from "@/components/NotificationBell";
import GlobalSearch from "@/components/GlobalSearch";
import ThemeToggle from "@/components/ThemeToggle";

function NavLink({ href, label, pathname }: { href: string; label: string; pathname: string }) {
  const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`relative text-[13px] font-semibold px-3 py-1.5 rounded-full transition-all ${
        active ? "bg-white/15 text-white" : "text-white/70 hover:text-white hover:bg-white/10"
      }`}
    >
      {label}
    </Link>
  );
}

export default function Header() {
  const pathname = usePathname();
  const [session, setSession] = useState<SessionPayload | null | undefined>(undefined);
  const [pendingCount, setPendingCount] = useState(0);
  const [disputeCount, setDisputeCount] = useState(0);

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
    if (session.role === "admin") {
      fetch("/api/admin/disputes")
        .then((r) => r.ok ? r.json() : [])
        .then((d) => setDisputeCount(Array.isArray(d) ? d.length : 0))
        .catch(() => {});
    }
  }, [session]);

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    setSession(null);
    setPendingCount(0);
    setDisputeCount(0);
    window.location.href = "/";
  }

  return (
    <header className="sticky top-0 z-50" style={{ background: "var(--jade-950)" }}>
      {/* 메인 바 */}
      <div className="max-w-5xl mx-auto px-4 h-12 flex items-center justify-between gap-2">
        {/* 로고 */}
        <Link
          href="/"
          className="flex items-center gap-1.5 shrink-0 group"
        >
          <span className="text-xl leading-none group-hover:animate-pop-in">🏓</span>
          <span
            className="font-extrabold text-[15px] tracking-tight"
            style={{ color: "white", letterSpacing: "-0.03em" }}
          >
            탁구존
          </span>
        </Link>

        {/* 네비게이션 */}
        <nav className="flex items-center gap-0.5 min-w-0">
          <ThemeToggle />
          <NavLink href="/reserve" label="예약" pathname={pathname} />
          <NavLink href="/ranking" label="랭킹" pathname={pathname} />
          <NavLink href="/events" label="이벤트" pathname={pathname} />

          {session === undefined ? (
            <span className="w-5 h-5 rounded-full bg-white/10 animate-pulse ml-2" />
          ) : session ? (
            <>
              <GlobalSearch />
              <NotificationBell />

              {/* 마이페이지 */}
              <Link
                href="/mypage"
                aria-current={pathname.startsWith("/mypage") ? "page" : undefined}
                className={`relative text-[13px] font-semibold px-3 py-1.5 rounded-full transition-all ${
                  pathname.startsWith("/mypage")
                    ? "bg-white/15 text-white"
                    : "text-white/70 hover:text-white hover:bg-white/10"
                }`}
              >
                마이페이지
                {pendingCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-rose-500 text-white text-[9px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center">
                    {pendingCount}
                  </span>
                )}
              </Link>

              {/* 관리자 */}
              {session.role === "admin" && (
                <Link
                  href="/admin"
                  aria-current={pathname.startsWith("/admin") ? "page" : undefined}
                  className={`relative text-[13px] font-semibold px-3 py-1.5 rounded-full transition-all ${
                    pathname.startsWith("/admin")
                      ? "bg-white/15 text-white"
                      : "text-white/70 hover:text-white hover:bg-white/10"
                  }`}
                >
                  관리자
                  {disputeCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-orange-400 text-white text-[9px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center">
                      {disputeCount}
                    </span>
                  )}
                </Link>
              )}

              {/* 유저명 */}
              <span className="hidden lg:inline text-white/50 text-[12px] px-2">
                {session.name}
              </span>

              {/* 로그아웃 */}
              <button
                onClick={handleLogout}
                aria-label="로그아웃"
                className="text-[13px] font-semibold text-white/60 hover:text-white px-2 py-1.5 rounded-full hover:bg-white/10 transition-all ml-0.5"
              >
                <span className="hidden sm:inline">로그아웃</span>
                <span className="sm:hidden">↪</span>
              </button>
            </>
          ) : (
            <>
              <NavLink href="/login" label="로그인" pathname={pathname} />
              <Link
                href="/register"
                className="ml-1 text-[13px] font-bold px-3.5 py-1.5 rounded-full transition-all"
                style={{ background: "var(--jade-500)", color: "white" }}
              >
                회원가입
              </Link>
            </>
          )}
        </nav>
      </div>

      {/* 하단 포인트 라인 */}
      <div className="h-px" style={{ background: "linear-gradient(90deg, var(--jade-800) 0%, var(--jade-500) 50%, var(--jade-800) 100%)" }} />
    </header>
  );
}
