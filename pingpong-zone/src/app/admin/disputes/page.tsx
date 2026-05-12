"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/Toast";

type Match = {
  id: string;
  createdAt: string;
  status: string;
  p1EloChange: number | null;
  p2EloChange: number | null;
  player1: { id: string; name: string; eloRating: number };
  player2: { id: string; name: string; eloRating: number };
  winner:  { id: string; name: string };
};

export default function DisputesPage() {
  const router = useRouter();
  const toast = useToast();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [autoVoiding, setAutoVoiding] = useState(false);
  const [expiredCount, setExpiredCount] = useState(0);

  useEffect(() => {
    (async () => {
      const [disputeRes, expiredRes] = await Promise.all([
        fetch("/api/admin/disputes"),
        fetch("/api/admin/auto-void-disputes"),
      ]);
      if (disputeRes.status === 401 || disputeRes.status === 403) { router.push("/"); return; }
      if (disputeRes.ok) setMatches(await disputeRes.json());
      if (expiredRes.ok) {
        const d = await expiredRes.json();
        setExpiredCount(d.expiredCount ?? 0);
      }
      setLoading(false);
    })();
  }, [router]);

  async function autoVoid() {
    if (!confirm(`7일 이상 경과된 분쟁 경기 ${expiredCount}건을 모두 무효 처리할까요?`)) return;
    setAutoVoiding(true);
    const res = await fetch("/api/admin/auto-void-disputes", { method: "POST" });
    const d = await res.json();
    if (res.ok) {
      setMatches((prev) => prev.filter((m) => {
        const age = Date.now() - new Date(m.createdAt).getTime();
        return age < 7 * 24 * 60 * 60 * 1000;
      }));
      setExpiredCount(0);
      toast.show(d.message, "success");
    } else {
      toast.show(d.error || "자동 무효 처리에 실패했습니다.", "error");
    }
    setAutoVoiding(false);
  }

  async function handle(matchId: string, action: "admin-confirm" | "void") {
    setProcessing(matchId);
    const res = await fetch(`/api/matches/${matchId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (res.ok) {
      setMatches((prev) => prev.filter((m) => m.id !== matchId));
      toast.show(action === "admin-confirm" ? "경기를 인정했습니다." : "경기를 무효 처리했습니다.", "success");
    } else {
      const d = await res.json().catch(() => ({}));
      toast.show(d.error || "처리에 실패했습니다.", "error");
    }
    setProcessing(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin" className="text-gray-400 hover:text-gray-600">←</Link>
        <h1 className="text-2xl font-bold text-gray-900">이의제기 경기 처리</h1>
        {expiredCount > 0 && (
          <button
            onClick={autoVoid}
            disabled={autoVoiding}
            className="ml-auto text-xs font-semibold bg-gray-700 text-white px-3 py-1.5 rounded-lg hover:bg-gray-600 disabled:opacity-50 transition-colors"
          >
            {autoVoiding ? "처리 중..." : `7일+ 경과 ${expiredCount}건 자동 무효`}
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">불러오는 중...</p>
      ) : matches.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl p-10 text-center shadow-sm">
          <div className="text-3xl mb-2">✅</div>
          <p className="text-gray-500 text-sm">처리 대기 중인 이의제기가 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {matches.map((m) => (
            <div key={m.id} className="bg-white border border-orange-100 rounded-xl p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-orange-100 text-orange-600 text-xs font-semibold px-2 py-0.5 rounded-full">이의제기</span>
                    <span className="text-xs text-gray-400">{new Date(m.createdAt).toLocaleDateString("ko-KR")}</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-800">
                    {m.player1.name} <span className="text-gray-400 font-normal">vs</span> {m.player2.name}
                  </p>
                  <p className="text-sm text-gray-600 mt-0.5">
                    기록된 승자: <span className="font-semibold text-blue-600">{m.winner.name}</span>
                  </p>
                  {m.p1EloChange !== null && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      포인트 변동: {m.player1.name} {m.p1EloChange! >= 0 ? "+" : ""}{m.p1EloChange} ·{" "}
                      {m.player2.name} {m.p2EloChange! >= 0 ? "+" : ""}{m.p2EloChange}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <button
                    onClick={() => handle(m.id, "admin-confirm")}
                    disabled={processing === m.id}
                    className="text-xs font-semibold bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-500 transition-colors disabled:opacity-50"
                  >
                    경기 인정
                  </button>
                  <button
                    onClick={() => handle(m.id, "void")}
                    disabled={processing === m.id}
                    className="text-xs font-semibold border border-red-300 text-red-500 px-4 py-2 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    경기 무효
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
