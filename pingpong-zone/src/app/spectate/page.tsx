"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Active = {
  id: string;
  matchType: string;
  tableName: string;
  startedAt: string;
  displayP1: string;
  displayP2: string;
  team1Sets: number;
  team2Sets: number;
  setsPlayed: number;
};

const TYPE_LABEL: Record<string, string> = {
  singles: "단식",
  doubles: "복식",
  king: "킹오브더힐",
};

function elapsedSince(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "방금";
  if (m < 60) return `${m}분 전`;
  return `${Math.floor(m / 60)}시간 ${m % 60}분 전`;
}

export default function SpectateListPage() {
  const [list, setList] = useState<Active[] | null>(null);

  useEffect(() => {
    function load() {
      fetch("/api/spectate")
        .then((r) => r.ok ? r.json() : [])
        .then((d) => setList(Array.isArray(d) ? d : []))
        .catch(() => setList([]));
    }
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/" className="text-gray-400 hover:text-gray-600 text-lg" aria-label="홈으로">←</Link>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" aria-hidden />
          라이브 경기
        </h1>
        <span className="ml-auto text-[12px]" style={{ color: "var(--text-3)" }}>
          5초 자동 갱신
        </span>
      </div>

      {list === null ? (
        <div className="animate-pulse space-y-2">
          {[1, 2].map((i) => <div key={i} className="h-20 rounded-2xl" style={{ background: "var(--border)" }} />)}
        </div>
      ) : list.length === 0 ? (
        <div className="card p-10 text-center text-[13px] space-y-2" style={{ color: "var(--text-3)" }}>
          <div className="text-3xl">🏓</div>
          <p>지금 진행 중인 라이브 경기가 없습니다.</p>
          <p className="text-[11px]">예약 후 체크인 → 경기 시작하면 여기에 표시됩니다.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {list.map((m) => (
            <li key={m.id}>
              <Link href={`/spectate/${m.id}`} className="card p-4 block hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="chip text-[10.5px] font-bold" style={{ background: "#fee2e2", color: "#b91c1c" }}>
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 mr-1 animate-pulse" />
                      LIVE
                    </span>
                    <span className="chip text-[10.5px]" style={{ background: "var(--jade-50)", color: "var(--jade-700)" }}>
                      {TYPE_LABEL[m.matchType] ?? m.matchType}
                    </span>
                    <span className="text-[11px]" style={{ color: "var(--text-3)" }}>
                      {m.tableName}
                    </span>
                  </div>
                  <span className="text-[10.5px]" style={{ color: "var(--text-3)" }}>
                    {elapsedSince(m.startedAt)}
                  </span>
                </div>
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                  <span className="font-bold text-[14px] truncate text-right" style={{ color: "#1e40af" }}>{m.displayP1}</span>
                  <div className="flex items-center gap-2 px-2 py-1 rounded-lg" style={{ background: "var(--jade-50)" }}>
                    <span className="font-extrabold text-[18px] tabular-nums" style={{ color: "#1e40af" }}>{m.team1Sets}</span>
                    <span className="text-[11px]" style={{ color: "var(--text-3)" }}>:</span>
                    <span className="font-extrabold text-[18px] tabular-nums" style={{ color: "#b91c1c" }}>{m.team2Sets}</span>
                  </div>
                  <span className="font-bold text-[14px] truncate" style={{ color: "#b91c1c" }}>{m.displayP2}</span>
                </div>
                {m.setsPlayed > 0 && (
                  <p className="text-[10.5px] mt-2 text-center" style={{ color: "var(--text-3)" }}>
                    {m.setsPlayed}세트 완료
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
