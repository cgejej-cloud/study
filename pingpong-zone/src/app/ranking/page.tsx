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
  isPlacing: boolean;
  placementLeft: number;
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

  const placed = ranking.filter((e) => !e.isPlacing);
  const placing = ranking.filter((e) => e.isPlacing);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">🏆 랭킹</h1>
        <Link
          href="/ranking/record"
          className="bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-600 transition-colors"
        >
          경기 결과 기록
        </Link>
      </div>

      {/* 티어 */}
      <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
        {TIER_INFO.map((t) => (
          <div key={t.name} className={`${t.bg} rounded-xl p-2.5 text-center`}>
            <div className="text-xl">{t.icon}</div>
            <div className={`text-xs font-bold mt-0.5 ${t.color} leading-tight`}>{t.name}</div>
            <div className="text-[10px] text-gray-400 mt-0.5">{t.minElo}점+</div>
          </div>
        ))}
      </div>

      {/* 시스템 안내 */}
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-sm">
          <p className="font-semibold text-amber-800 mb-0.5">🔰 신입 보정</p>
          <p className="text-amber-600 text-xs">처음 5경기는 포인트 변동이 2배 — 빠르게 내 실력대로 배치됩니다</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 text-sm">
          <p className="font-semibold text-blue-800 mb-0.5">🛡️ 공정성 보장</p>
          <p className="text-blue-600 text-xs">경기 기록 시 상대방 확인 후 포인트 반영 · 이의제기 가능</p>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-400 text-center py-12">불러오는 중...</p>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow overflow-hidden mb-6">
            <div className="px-4 py-3 bg-gray-50 border-b">
              <span className="font-bold text-gray-700">랭킹</span>
              <span className="ml-2 text-xs text-gray-400">{placed.length}명</span>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {["순위", "티어", "선수", "포인트", "승", "패", "승률"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-semibold text-gray-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {placed.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-400">정식 랭킹에 등록된 선수가 없습니다</td></tr>
                ) : placed.map((entry, i) => {
                  const tier = getTier(entry.eloRating);
                  const isMe = entry.id === myId;
                  return (
                    <tr key={entry.id} className={isMe ? "bg-green-50" : "hover:bg-gray-50"}>
                      <td className="px-4 py-3 font-bold text-gray-400">
                        {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-lg">{tier.icon}</span>
                        <span className={`ml-1 text-xs font-semibold ${tier.color}`}>{tier.name}</span>
                      </td>
                      <td className="px-4 py-3 font-semibold">
                        {entry.name}
                        {isMe && <span className="ml-2 text-xs text-green-600 font-normal">(나)</span>}
                      </td>
                      <td className="px-4 py-3 font-bold text-gray-800">{entry.eloRating}점</td>
                      <td className="px-4 py-3 text-blue-600 font-medium">{entry.wins}</td>
                      <td className="px-4 py-3 text-red-400 font-medium">{entry.losses}</td>
                      <td className="px-4 py-3">
                        {entry.winRate !== null ? (
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div className="h-full bg-green-500 rounded-full" style={{ width: `${entry.winRate}%` }} />
                            </div>
                            <span className="text-gray-600">{entry.winRate}%</span>
                          </div>
                        ) : <span className="text-gray-400">-</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {placing.length > 0 && (
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b flex items-center gap-2">
                <span className="font-bold text-gray-700">🔰 신입 보정 기간</span>
                <span className="px-2 py-0.5 bg-orange-100 text-orange-600 text-xs font-semibold rounded-full">보정 중</span>
                <span className="text-xs text-gray-400">{placing.length}명 · 5경기 완료 후 정식 랭킹 반영</span>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {["선수", "진행", "승", "패", "현재 포인트"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left font-semibold text-gray-600">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {placing.map((entry) => {
                    const isMe = entry.id === myId;
                    return (
                      <tr key={entry.id} className={isMe ? "bg-green-50" : "hover:bg-gray-50"}>
                        <td className="px-4 py-3 font-semibold">
                          {entry.name}
                          {isMe && <span className="ml-2 text-xs text-green-600 font-normal">(나)</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex gap-1">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className={`w-4 h-4 rounded-full ${i < entry.total ? "bg-green-500" : "bg-gray-200"}`} />
                              ))}
                            </div>
                            <span className="text-xs text-gray-500">{entry.total}/5</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-blue-600">{entry.wins}</td>
                        <td className="px-4 py-3 text-red-400">{entry.losses}</td>
                        <td className="px-4 py-3 font-medium text-gray-500">{entry.eloRating}점</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
