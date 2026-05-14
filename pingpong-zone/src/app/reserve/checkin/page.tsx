"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function CheckInPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (code.length !== 6) { setError("6자리 코드를 입력해주세요."); return; }
    setLoading(true);
    setError("");

    // 코드로 예약 찾기 — 오늘 날짜 예약 검색
    const res = await fetch("/api/reservations/checkin-by-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) { setError(data.error || "체크인에 실패했습니다."); return; }
    router.push(`/reserve/session/${data.reservationId}`);
  }

  return (
    <div className="max-w-sm mx-auto mt-10 px-4">
      <div className="text-center mb-6">
        <div className="text-5xl mb-3">🏓</div>
        <h1 className="font-extrabold text-[22px]" style={{ color: "var(--jade-950)", letterSpacing: "-0.02em" }}>경기 체크인</h1>
        <p className="text-[13px] mt-1" style={{ color: "var(--text-3)" }}>예약자에게 6자리 코드를 받아 입력하세요</p>
      </div>

      <div className="card p-7">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[12px] font-bold mb-2" style={{ color: "var(--text-2)" }}>체크인 코드 (6자리)</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              className="w-full text-center text-[28px] font-mono font-bold tracking-[0.3em] rounded-xl px-4 py-4 focus:outline-none transition-shadow"
              style={{ border: "2px solid var(--border)", background: "white", letterSpacing: "0.3em" }}
            />
          </div>

          {error && (
            <div className="rounded-xl px-3.5 py-2.5 text-[12px]" style={{ background: "#fff1f2", border: "1px solid #fecdd3", color: "#be123c" }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full py-3 rounded-xl font-bold text-[14px] transition-all"
            style={{ background: "var(--jade-950)", color: "white", opacity: loading || code.length !== 6 ? 0.5 : 1 }}
          >
            {loading ? "확인 중..." : "체크인"}
          </button>
        </form>

        <p className="text-center text-[12px] mt-4" style={{ color: "var(--text-3)" }}>
          <Link href="/mypage" className="font-bold hover:underline" style={{ color: "var(--jade-700)" }}>
            내 예약 보기 →
          </Link>
        </p>
      </div>
    </div>
  );
}
