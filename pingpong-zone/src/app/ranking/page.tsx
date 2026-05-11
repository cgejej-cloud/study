"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type RankEntry = {
  id: string;
  name: string;
  eloRating: number;
  wins: number;
  losses: number;
  total: number;
  winRate: number | null;
};

const TIER_INFO = [
  { name: "그랜드마스터", minElo: 1400, color: "text-yellow-500", bg: "bg-yellow-50", icon: "👑" },
  { name: "마스터",       minElo: 1300, color: "text-purple-600", bg: "bg-purple-50", icon: "💎" },
  { name: "다이아",       minElo: 1200, color: "text-blue-500",   bg: "bg-blue-50",   icon: "💠" },
  { name: "플래티넘",     minElo: 1100, color: "text-teal-600",   bg: "bg-teal-50",   icon: "🔷" },
  { name: "골드",         minElo: 1000, color: "text-amber-500",  bg: "bg-amber-50",  icon: "🥇" },
  { name: "실버",         minElo:  900, color: "text-gray-500",   bg: "bg-gray-50",   icon: "🥈" },
  { name: "브론즈",       minElo:    0, color: "text-orange-400", bg: "bg-orange-50", icon: "🥉" },
];

function getTier(elo: number) {
  return TIER_INFO.find((t) => elo >= t.minElo) ?? TIER_INFO[TIER_INFO.length - 1];
}

export default function RankingPage() {
  const [ranking, setRanking] = useState<RankEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [myId, setMyId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/me").then((r) => r.json()).then((d) => { if (d?.id) setMyId(d.id); });
    fetch("/api/ranking")
      .then((r) => r.json())
      .then((data) => { setRanking(Array.isArray(data) ? data : []); setLoading(false); });
  }, []);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">🏆 랭킹</h1>
        <Link
          href="/ranking/record"
          className="bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-600"
        >
          경기 결과 기록
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {TIER_INFO.map((t) => (
          <div key={t.name} className={`${t.bg} rounded-xl p-3 text-center`}>
            <div className="text-2xl">{t.icon}</div>
            <div className={`text-xs font-bold mt-1 ${t.color}`}>{t.name}</div>
            <div className="text-xs text-gray-400">{t.minElo}+ ELO</div>
          </div>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-400 text-center py-12">불러오는 중...</p>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {["순위", "티어", "선수", "ELO", "승", "패", "승률"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-semibold text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {ranking.map((entry, i) => {
                const tier = getTier(entry.eloRating);
                const isMe = entry.id === myId;
                return (
                  <tr key={entry.id} className={isMe ? "bg-green-50" : "hover:bg-gray-50"}>
                    <td className="px-4 py-3 font-bold text-gray-400">
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-lg`}>{tier.icon}</span>
                      <span className={`ml-1 text-xs font-semibold ${tier.color}`}>{tier.name}</span>
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      {entry.name}
                      {isMe && <span className="ml-2 text-xs text-green-600 font-normal">(나)</span>}
                    </td>
                    <td className="px-4 py-3 font-bold text-gray-800">{entry.eloRating}</td>
                    <td className="px-4 py-3 text-blue-600 font-medium">{entry.wins}</td>
                    <td className="px-4 py-3 text-red-400 font-medium">{entry.losses}</td>
                    <td className="px-4 py-3">
                      {entry.winRate !== null ? (
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-500 rounded-full"
                              style={{ width: `${entry.winRate}%` }}
                            />
                          </div>
                          <span className="text-gray-600">{entry.winRate}%</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
