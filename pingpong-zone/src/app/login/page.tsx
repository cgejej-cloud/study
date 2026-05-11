"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { login } from "@/app/actions";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    // next 가 외부 URL 이 아닌지 안전하게 검증
    const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";
    const result = await login(fd);
    setLoading(false);
    if (result?.error) {
      setError(result.error);
    } else {
      router.push(safeNext);
      router.refresh();
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-8">
      <div className="text-center mb-8">
        <Link href="/" className="inline-block text-3xl font-extrabold text-green-700 tracking-tight">
          🏓 탁구존
        </Link>
        <p className="text-gray-500 text-sm mt-1">계정에 로그인하세요</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8">
        <h1 className="text-xl font-bold text-gray-900 mb-6">로그인</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">이메일</label>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="email@example.com"
              className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">비밀번호</label>
            <div className="relative">
              <input
                name="password"
                type={showPw ? "text" : "password"}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full border border-gray-300 rounded-lg pl-3.5 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? "비밀번호 숨기기" : "비밀번호 보기"}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm px-2 py-1"
              >
                {showPw ? "🙈" : "👁"}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5 text-sm text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-700 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-green-600 disabled:opacity-50 transition-colors mt-2"
          >
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-5">
          계정이 없으신가요?{" "}
          <Link href="/register" className="text-green-700 font-semibold hover:underline">
            회원가입
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="max-w-sm mx-auto mt-8 text-center text-gray-400">불러오는 중...</div>}>
      <LoginForm />
    </Suspense>
  );
}
