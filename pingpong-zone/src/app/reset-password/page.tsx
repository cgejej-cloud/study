"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function ResetPasswordForm() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";

  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [tokenMessage, setTokenMessage] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const inputCls = "w-full rounded-xl px-3.5 py-2.5 text-[13px] focus:outline-none transition-shadow";
  const inputStyle = { border: "1.5px solid var(--border)", background: "white" };

  useEffect(() => {
    if (!token) {
      setTokenValid(false);
      setTokenMessage("토큰이 없습니다.");
      return;
    }
    fetch(`/api/auth/reset-password?token=${token}`)
      .then((r) => r.json())
      .then((data) => {
        setTokenValid(data.valid);
        if (!data.valid) setTokenMessage(data.message ?? "유효하지 않은 링크입니다.");
      })
      .catch(() => {
        setTokenValid(false);
        setTokenMessage("오류가 발생했습니다.");
      });
  }, [token]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    setLoading(false);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "오류가 발생했습니다.");
    } else {
      setSuccess(true);
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-10">
      <div className="text-center mb-6">
        <Link href="/" className="inline-block font-extrabold text-[26px]" style={{ color: "var(--jade-950)", letterSpacing: "-0.03em" }}>
          🏓 탁구존
        </Link>
        <p className="text-[13px] mt-1" style={{ color: "var(--text-3)" }}>새 비밀번호를 설정하세요</p>
      </div>

      <div className="card p-7">
        <h1 className="font-extrabold text-[18px] mb-5" style={{ color: "var(--text-1)", letterSpacing: "-0.02em" }}>
          비밀번호 재설정
        </h1>

        {tokenValid === null && (
          <p className="text-[13px]" style={{ color: "var(--text-3)" }}>링크를 확인하는 중...</p>
        )}

        {tokenValid === false && (
          <div className="space-y-4">
            <div className="rounded-xl px-3.5 py-3 text-[13px]" style={{ background: "#fff1f2", border: "1px solid #fecdd3", color: "#be123c" }}>
              유효하지 않은 링크입니다. {tokenMessage}
            </div>
            <Link href="/forgot-password" className="block text-center text-[13px] font-bold hover:underline" style={{ color: "var(--jade-700)" }}>
              재설정 링크 다시 요청하기
            </Link>
          </div>
        )}

        {tokenValid === true && !success && (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-[12px] font-bold mb-1.5" style={{ color: "var(--text-2)" }}>새 비밀번호</label>
              <input
                type="password"
                required
                placeholder="8자 이상"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputCls}
                style={inputStyle}
              />
            </div>
            <div>
              <label className="block text-[12px] font-bold mb-1.5" style={{ color: "var(--text-2)" }}>비밀번호 확인</label>
              <input
                type="password"
                required
                placeholder="비밀번호를 다시 입력하세요"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className={inputCls}
                style={inputStyle}
              />
            </div>

            {error && (
              <div className="rounded-xl px-3.5 py-2.5 text-[12px]" style={{ background: "#fff1f2", border: "1px solid #fecdd3", color: "#be123c" }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl font-bold text-[13px] transition-all mt-1 btn btn-jade"
              style={{ opacity: loading ? 0.6 : 1 }}
            >
              {loading ? "변경 중..." : "비밀번호 변경"}
            </button>
          </form>
        )}

        {success && (
          <div className="space-y-4">
            <div className="rounded-xl px-3.5 py-3 text-[13px]" style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534" }}>
              비밀번호가 변경되었습니다. 로그인해주세요.
            </div>
            <Link href="/login" className="block text-center text-[13px] font-bold hover:underline" style={{ color: "var(--jade-700)" }}>
              로그인 페이지로 이동
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="max-w-sm mx-auto mt-10 text-center text-[13px]" style={{ color: "var(--text-3)" }}>불러오는 중...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
