"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const inputCls = "w-full rounded-xl px-3.5 py-2.5 text-[13px] focus:outline-none transition-shadow";
  const inputStyle = { border: "1.5px solid var(--border)", background: "white" };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
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
        <p className="text-[13px] mt-1" style={{ color: "var(--text-3)" }}>비밀번호를 잊으셨나요?</p>
      </div>

      <div className="card p-7">
        <h1 className="font-extrabold text-[18px] mb-2" style={{ color: "var(--text-1)", letterSpacing: "-0.02em" }}>
          비밀번호 재설정
        </h1>
        <p className="text-[12px] mb-5" style={{ color: "var(--text-3)" }}>
          가입하신 이메일을 입력하시면 재설정 링크를 보내드립니다.
        </p>

        {success ? (
          <div className="space-y-4">
            <div className="rounded-xl px-3.5 py-3 text-[13px]" style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534" }}>
              이메일을 확인해주세요. 재설정 링크가 발송되었습니다.
            </div>
            <Link href="/login" className="block text-center text-[13px] font-bold hover:underline" style={{ color: "var(--jade-700)" }}>
              로그인 페이지로 돌아가기
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-[12px] font-bold mb-1.5" style={{ color: "var(--text-2)" }}>이메일</label>
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
              {loading ? "전송 중..." : "재설정 링크 전송"}
            </button>

            <p className="text-center text-[12px] mt-2" style={{ color: "var(--text-3)" }}>
              <Link href="/login" className="font-bold hover:underline" style={{ color: "var(--jade-700)" }}>
                로그인 페이지로 돌아가기
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
