"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { SessionPayload } from "@/lib/session";

export default function Header() {
  const [session, setSession] = useState<SessionPayload | null | undefined>(undefined);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then(setSession)
      .catch(() => setSession(null));
  }, []);

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    setSession(null);
    window.location.href = "/";
  }

  return (
    <header className="bg-green-700 text-white shadow">
      <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="text-2xl font-bold tracking-tight">
          🏓 탁구존
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/reserve" className="hover:underline">
            예약하기
          </Link>
          <Link href="/ranking" className="hover:underline">
            랭킹
          </Link>
          {session === undefined ? (
            <span className="text-green-300 text-xs">...</span>
          ) : session ? (
            <>
              <Link href="/mypage" className="hover:underline">
                마이페이지
              </Link>
              {session.role === "admin" && (
                <Link href="/admin" className="hover:underline">
                  관리자
                </Link>
              )}
              <span className="text-green-200">{session.name}</span>
              <button
                onClick={handleLogout}
                className="bg-green-600 hover:bg-green-500 px-3 py-1 rounded"
              >
                로그아웃
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="hover:underline">
                로그인
              </Link>
              <Link
                href="/register"
                className="bg-white text-green-700 font-semibold px-3 py-1 rounded hover:bg-green-50"
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
