"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { login } from "@/app/actions";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params?.get("next") || "/";
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    // next 가 외부 URL 이 아닌지 안전하게 검증 (protocol-relative, backslash, scheme 차단)
    const safeNext =
      next.startsWith("/") &&
      !next.startsWith("//") &&
      !next.startsWith("/\\") &&
      !/^\/[a-z]+:/i.test(next)
        ? next
        : "/";
    const result = await login(fd);
    setLoading(false);
    if (result?.error) {
      setError(result.error);
    } else {
      window.location.href = safeNext;
    }
  }

  const inputCls = "w-full rounded-xl px-3.5 py-2.5 text-[13px] focus:outline-none transition-shadow";
  const inputStyle = { border: "1.5px solid var(--border)", background: "white" };

  return (
    <div className="max-w-sm mx-auto mt-10">
      <div className="text-center mb-6">
        <Link href="/" className="inline-block font-extrabold text-[26px]" style={{ color: "var(--jade-950)", letterSpacing: "-0.03em" }}>
          🏓 탁구존
        </Link>
        <p className="text-[13px] mt-1" style={{ color: "var(--text-3)" }}>계정에 로그인하세요</p>
      </div>

      <div className="card p-7">
        <h1 className="font-extrabold text-[18px] mb-5" style={{ color: "var(--text-1)", letterSpacing: "-0.02em" }}>로그인</h1>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-[12px] font-bold mb-1.5" style={{ color: "var(--text-2)" }}>이메일</label>
            <input name="email" type="email" required autoComplete="username email" placeholder="email@example.com"
              className={inputCls} style={inputStyle} />
          </div>

          <div>
            <label className="block text-[12px] font-bold mb-1.5" style={{ color: "var(--text-2)" }}>비밀번호</label>
            <div className="relative">
              <input name="password" type={showPw ? "text" : "password"} required autoComplete="current-password" placeholder="••••••••"
                className={inputCls} style={{ ...inputStyle, paddingRight: "44px" }} />
              <button type="button" onClick={() => setShowPw(v => !v)} aria-label={showPw ? "숨기기" : "보기"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: "var(--muted)" }}>
                {showPw ? "🙈" : "👁"}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-xl px-3.5 py-2.5 text-[12px]" style={{ background: "#fff1f2", border: "1px solid #fecdd3", color: "#be123c" }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full py-2.5 rounded-xl font-bold text-[13px] transition-all mt-1"
            style={{ background: "var(--jade-950)", color: "white", opacity: loading ? 0.6 : 1 }}>
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </form>

        <p className="text-center text-[12px] mt-4" style={{ color: "var(--text-3)" }}>
          <Link href="/forgot-password" className="font-bold hover:underline" style={{ color: "var(--jade-700)" }}>
            비밀번호를 잊으셨나요?
          </Link>
        </p>

        <p className="text-center text-[12px] mt-2" style={{ color: "var(--text-3)" }}>
          계정이 없으신가요?{" "}
          <Link href="/register" className="font-bold hover:underline" style={{ color: "var(--jade-700)" }}>
            회원가입
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="max-w-sm mx-auto mt-10 text-center text-[13px]" style={{ color: "var(--text-3)" }}>불러오는 중...</div>}>
      <LoginForm />
    </Suspense>
  );
}
