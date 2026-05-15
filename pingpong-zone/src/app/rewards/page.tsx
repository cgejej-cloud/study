"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Avatar from "@/components/Avatar";

type Entry = {
  id: string;
  name: string;
  nickname: string | null;
  avatar: string | null;
  profileColor: string | null;
  rewardPoints: number;
  totalMatches: number;
  dailyStreak: number;
};

const MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

export default function RewardsLeaderboardPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/rewards/leaderboard")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => { setEntries(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/" className="text-gray-400 hover:text-gray-600 text-lg" aria-label="홈으로">←</Link>
        <h1 className="text-2xl font-bold text-gray-900">🎁 리워드 랭킹</h1>
      </div>

      <div className="card p-4 text-[12px]" style={{ background: "#f0fdf4", color: "var(--jade-700)" }}>
        💡 경기 참여 · 승리 · 연속 출석 · 마일스톤 달성으로 적립한 누적 포인트 기준 랭킹입니다.
        ELO 랭킹과는 별도이며 가장 많이 활동한 사람이 상위에 노출됩니다.
      </div>

      {loading ? (
        <div className="animate-pulse space-y-2">
          {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-14 rounded-xl" style={{ background: "var(--border)" }} />)}
        </div>
      ) : entries.length === 0 ? (
        <div className="card p-6 text-center text-[13px]" style={{ color: "var(--text-3)" }}>
          아직 리워드 적립자가 없습니다. 경기를 기록해 첫 적립자가 되어보세요!
        </div>
      ) : (
        <div className="card overflow-hidden">
          <ul className="divide-y">
            {entries.map((e, i) => {
              const rank = i + 1;
              return (
                <li key={e.id} className="px-4 py-3 flex items-center gap-3">
                  <span className="w-7 text-center font-extrabold text-[14px]" style={{ color: rank <= 3 ? "#c2410c" : "var(--text-3)" }}>
                    {MEDAL[rank] ?? rank}
                  </span>
                  <Avatar
                    name={e.nickname ?? e.name}
                    size="sm"
                    avatar={e.avatar ?? undefined}
                    profileColor={e.profileColor ?? undefined}
                  />
                  <Link href={`/players/${e.id}`} className="flex-1 min-w-0 hover:underline">
                    <p className="font-semibold text-[13px] text-gray-800 truncate">{e.nickname ?? e.name}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {e.totalMatches}경기 · 🔥 연속 {e.dailyStreak}일
                    </p>
                  </Link>
                  <p className="text-[15px] font-extrabold" style={{ color: "var(--jade-700)" }}>
                    {e.rewardPoints.toLocaleString()}<span className="text-[11px] font-bold ml-0.5">pt</span>
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
