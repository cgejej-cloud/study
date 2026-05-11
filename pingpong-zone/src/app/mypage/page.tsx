"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Reservation = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  table: { name: string };
};

type PendingMatch = {
  id: string;
  createdAt: string;
  winnerId: string;
  p1EloChange: number | null;
  p2EloChange: number | null;
  player1: { id: string; name: string };
  player2: { id: string; name: string };
  winner:  { id: string; name: string };
};

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return `${dateStr} (${WEEKDAYS[d.getDay()]})`;
}

function timeAgo(isoStr: string) {
  const diff = Date.now() - new Date(isoStr).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return "방금 전";
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

export default function MyPage() {
  const router = useRouter();
  const [myId, setMyId] = useState("");
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [pendingMatches, setPendingMatches] = useState<PendingMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [meRes, resRes, pendRes] = await Promise.all([
        fetch("/api/me"),
        fetch("/api/reservations"),
        fetch("/api/matches?pending=true"),
      ]);

      if (resRes.status === 401) { router.push("/login"); return; }

      const [me, resData, pendData] = await Promise.all([
        meRes.json(),
        resRes.json(),
        pendRes.json(),
      ]);

      if (cancelled) return;
      if (me?.id) setMyId(me.id);
      setReservations(Array.isArray(resData) ? resData : []);
      setPendingMatches(Array.isArray(pendData) ? pendData : []);
      setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [tick, router]);

  async function handleCancel(id: string) {
    if (!confirm("예약을 취소하시겠습니까?")) return;
    await fetch(`/api/reservations/${id}`, { method: "PATCH" });
    setTick((t) => t + 1);
  }

  async function handleMatchAction(matchId: string, action: "confirm" | "dispute") {
    const label = action === "confirm" ? "확인" : "이의제기";
    if (!confirm(`이 경기를 ${label}하시겠습니까?`)) return;
    const res = await fetch(`/api/matches/${matchId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (res.ok) setTick((t) => t + 1);
  }

  const today = new Date().toISOString().split("T")[0];
  const upcoming = reservations.filter((r) => r.status === "confirmed" && r.date >= today);
  const past     = reservations.filter((r) => r.status !== "confirmed" || r.date < today);

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">마이페이지</h1>
        <div className="flex gap-2">
          <Link
            href="/mypage/matches"
            className="text-sm font-medium text-blue-700 border border-blue-200 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
          >
            경기 전적
          </Link>
          <Link
            href="/mypage/edit"
            className="text-sm font-medium text-green-700 border border-green-200 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg transition-colors"
          >
            내 정보 수정
          </Link>
        </div>
      </div>

      {/* ── 확인 대기 중인 경기 ─────────────────────────────── */}
      {!loading && pendingMatches.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-base font-semibold text-gray-800">경기 확인 요청</h2>
            <span className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {pendingMatches.length}
            </span>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-xl divide-y divide-orange-100">
            {pendingMatches.map((m) => {
              const iWonInMatch = m.winnerId === myId;
              const myEloChange = m.p2EloChange; // 나는 player2
              return (
                <div key={m.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800">
                        <span className="text-orange-600">{m.player1.name}</span>
                        <span className="text-gray-500 font-normal mx-1.5">님이 기록한 경기</span>
                      </p>
                      <p className="text-sm text-gray-600 mt-0.5">
                        결과:{" "}
                        <span className={`font-semibold ${iWonInMatch ? "text-blue-600" : "text-red-500"}`}>
                          {iWonInMatch ? "내가 승리" : "내가 패배"}
                        </span>
                        {myEloChange !== null && (
                          <span className={`ml-2 text-xs font-medium ${myEloChange >= 0 ? "text-green-600" : "text-red-500"}`}>
                            (예상 포인트 {myEloChange >= 0 ? "+" : ""}{myEloChange})
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{timeAgo(m.createdAt)} 기록 · 24시간 내 미확인 시 자동 승인</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleMatchAction(m.id, "confirm")}
                        className="text-xs font-semibold bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-500 transition-colors"
                      >
                        확인
                      </button>
                      <button
                        onClick={() => handleMatchAction(m.id, "dispute")}
                        className="text-xs font-semibold border border-red-300 text-red-500 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        이의제기
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-gray-400 mt-2 px-1">
            ※ 이의제기 시 관리자가 해당 경기를 검토합니다. 포인트는 적용되지 않습니다.
          </p>
        </section>
      )}

      {/* ── 예정 예약 ────────────────────────────────────────── */}
      <section>
        <h2 className="text-base font-semibold text-gray-800 mb-3">예정된 예약</h2>
        {loading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : upcoming.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-xl p-6 text-center">
            <p className="text-gray-400 text-sm">예정된 예약이 없습니다.</p>
            <Link href="/reserve" className="inline-block mt-3 text-sm text-green-700 font-semibold hover:underline">
              예약하러 가기 →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {upcoming.map((r) => (
              <div key={r.id} className="bg-white border border-gray-100 rounded-xl px-4 py-3 flex items-center justify-between shadow-sm">
                <div>
                  <span className="font-semibold text-green-700 text-sm">{r.table.name}</span>
                  <span className="text-gray-400 mx-2">·</span>
                  <span className="text-sm text-gray-700">{formatDate(r.date)}</span>
                  <span className="text-gray-400 mx-2">·</span>
                  <span className="text-sm text-gray-700">{r.startTime} ~ {r.endTime}</span>
                </div>
                <button
                  onClick={() => handleCancel(r.id)}
                  className="text-xs text-red-400 hover:text-red-600 font-medium transition-colors"
                >
                  취소
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── 지난 예약 ────────────────────────────────────────── */}
      {past.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-gray-800 mb-3">지난 예약</h2>
          <div className="space-y-2">
            {past.map((r) => (
              <div key={r.id} className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 flex items-center justify-between opacity-60">
                <div>
                  <span className="font-semibold text-sm">{r.table.name}</span>
                  <span className="text-gray-400 mx-2">·</span>
                  <span className="text-sm text-gray-500">{formatDate(r.date)}</span>
                  <span className="text-gray-400 mx-2">·</span>
                  <span className="text-sm text-gray-500">{r.startTime} ~ {r.endTime}</span>
                </div>
                <span className={`text-xs font-medium ${r.status === "cancelled" ? "text-red-400" : "text-gray-400"}`}>
                  {r.status === "cancelled" ? "취소됨" : "완료"}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
