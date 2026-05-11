"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Avatar from "@/components/Avatar";

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
  streak: { type: "W" | "L"; count: number } | null;
};

type SeasonStanding = {
  id: string;
  name: string;
  rating: number;
  rank: number;
  wins: number;
  losses: number;
  delta?: number;
  winRate?: number | null;
};
type ActiveSeason = { id: string; name: string } | null;

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

type SortKey = "elo" | "name" | "winRate" | "games";

export default function RankingPage() {
  const [ranking, setRanking] = useState<RankEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [myId, setMyId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("elo");
  const [tab, setTab] = useState<"overall" | "season">("overall");
  const [activeSeason, setActiveSeason] = useState<ActiveSeason>(null);
  const [seasonStandings, setSeasonStandings] = useState<SeasonStanding[]>([]);
  const [seasonLoading, setSeasonLoading] = useState(false);

  useEffect(() => {
    fetch("/api/me").then((r) => r.json()).then((d) => { if (d?.id) setMyId(d.id); });
    fetch("/api/ranking")
      .then((r) => r.json())
      .then((data) => { setRanking(Array.isArray(data) ? data : []); setLoading(false); });
    fetch("/api/seasons")
      .then((r) => r.ok ? r.json() : { active: null })
      .then((d) => setActiveSeason(d.active ? { id: d.active.id, name: d.active.name } : null))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (tab !== "season" || !activeSeason) return;
    setSeasonLoading(true);
    fetch(`/api/seasons/${activeSeason.id}/standings`)
      .then((r) => r.ok ? r.json() : { standings: [] })
      .then((d) => setSeasonStandings(d.standings ?? []))
      .catch(() => setSeasonStandings([]))
      .finally(() => setSeasonLoading(false));
  }, [tab, activeSeason]);

  const allPlaced = ranking.filter((e) => !e.isPlacing);
  const placing = ranking.filter((e) => e.isPlacing);

  const filtered = allPlaced.filter((e) => e.name.toLowerCase().includes(search.trim().toLowerCase()));
  const placed = [...filtered].sort((a, b) => {
    if (sortBy === "name")    return a.name.localeCompare(b.name, "ko");
    if (sortBy === "winRate") return (b.winRate ?? -1) - (a.winRate ?? -1);
    if (sortBy === "games")   return b.total - a.total;
    return b.eloRating - a.eloRating;
  });

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

      {/* 시즌 탭 */}
      {activeSeason && (
        <div className="flex items-center gap-2">
          <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-1 flex gap-1 flex-1">
            <button
              onClick={() => setTab("overall")}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                tab === "overall" ? "bg-green-700 text-white" : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              전체 랭킹
            </button>
            <button
              onClick={() => setTab("season")}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                tab === "season" ? "bg-green-700 text-white" : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              🏆 {activeSeason.name}
            </button>
          </div>
          <Link
            href="/seasons"
            className="text-xs font-medium text-gray-500 hover:text-gray-700 border border-gray-200 hover:bg-gray-50 px-3 py-2 rounded-xl shadow-sm bg-white whitespace-nowrap"
            title="시즌 아카이브"
          >
            전체 시즌
          </Link>
        </div>
      )}

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

      {tab === "season" && activeSeason ? (
        seasonLoading ? (
          <p className="text-gray-400 text-center py-12">불러오는 중...</p>
        ) : seasonStandings.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-10 text-center">
            <p className="text-4xl mb-3">🏆</p>
            <p className="font-semibold text-gray-700">{activeSeason.name} 시즌 경기 기록이 없습니다</p>
            <p className="text-gray-500 text-sm mt-1">시즌 기간 내 경기를 기록하면 자동 집계됩니다</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="px-4 py-3 bg-gradient-to-r from-amber-50 to-yellow-50 border-b">
              <span className="font-bold text-gray-700">🏆 {activeSeason.name} 시즌 랭킹</span>
              <span className="ml-2 text-xs text-gray-500">{seasonStandings.length}명 · 시즌 포인트 변동 기준</span>
            </div>
            <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[520px]">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {["순위", "선수", "시즌 포인트", "승", "패", "승률"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-semibold text-gray-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {seasonStandings.map((s) => {
                  const isMe = s.id === myId;
                  return (
                    <tr key={s.id} className={isMe ? "bg-green-50" : "hover:bg-gray-50"}>
                      <td className="px-4 py-3 font-bold text-gray-400">
                        {s.rank === 1 ? "🥇" : s.rank === 2 ? "🥈" : s.rank === 3 ? "🥉" : `#${s.rank}`}
                      </td>
                      <td className="px-4 py-3 font-semibold">
                        <div className="flex items-center gap-2">
                          <Avatar name={s.name} size="sm" />
                          <Link href={`/players/${s.id}`} className="hover:text-green-700 hover:underline">{s.name}</Link>
                          {isMe && <span className="text-xs text-green-600 font-normal">(나)</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-bold">
                        <span className={(s.delta ?? 0) >= 0 ? "text-green-600" : "text-red-500"}>
                          {(s.delta ?? 0) >= 0 ? "+" : ""}{s.delta ?? 0}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-blue-600 font-medium">{s.wins}</td>
                      <td className="px-4 py-3 text-red-400 font-medium">{s.losses}</td>
                      <td className="px-4 py-3 text-gray-600">{s.winRate !== null && s.winRate !== undefined ? `${s.winRate}%` : "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>
        )
      ) : loading ? (
        <p className="text-gray-400 text-center py-12">불러오는 중...</p>
      ) : (
        <>
          {allPlaced.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-10 text-center">
              <p className="text-4xl mb-3">🏓</p>
              <p className="font-semibold text-gray-700">아직 정식 랭킹에 입력된 선수가 없습니다</p>
              <p className="text-gray-500 text-sm mt-1">5경기를 완료하면 자동으로 등록됩니다</p>
              <Link href="/ranking/record" className="inline-block mt-4 bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-green-600">
                경기 기록하기
              </Link>
            </div>
          ) : (
          <div className="bg-white rounded-xl shadow overflow-hidden mb-6">
            <div className="px-4 py-3 bg-gray-50 border-b flex flex-wrap items-center gap-2">
              <span className="font-bold text-gray-700">랭킹</span>
              <span className="text-xs text-gray-400">{placed.length}명</span>
              <div className="ml-auto flex items-center gap-2 flex-wrap">
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="선수 검색"
                  aria-label="선수 이름 검색"
                  className="border border-gray-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-green-500 w-32"
                />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortKey)}
                  aria-label="정렬 기준"
                  className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                >
                  <option value="elo">포인트순</option>
                  <option value="name">이름순</option>
                  <option value="winRate">승률순</option>
                  <option value="games">경기수순</option>
                </select>
              </div>
            </div>
            <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {["순위", "티어", "선수", "포인트", "승", "패", "승률"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-semibold text-gray-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {placed.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-400">검색 결과가 없습니다</td></tr>
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
                        <div className="flex items-center gap-2">
                          <Avatar name={entry.name} size="sm" />
                          <Link href={`/players/${entry.id}`} className="hover:text-green-700 hover:underline">
                            {entry.name}
                          </Link>
                          {isMe && <span className="text-xs text-green-600 font-normal">(나)</span>}
                          {entry.streak && entry.streak.count >= 3 && (
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                entry.streak.type === "W"
                                  ? "bg-orange-100 text-orange-600"
                                  : "bg-gray-100 text-gray-500"
                              }`}
                              title={entry.streak.type === "W" ? `${entry.streak.count}연승` : `${entry.streak.count}연패`}
                            >
                              {entry.streak.type === "W" ? "🔥" : "❄️"} {entry.streak.count}
                            </span>
                          )}
                        </div>
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
          </div>
          )}

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
                          <div className="flex items-center gap-2">
                            <Avatar name={entry.name} size="sm" />
                            <Link href={`/players/${entry.id}`} className="hover:text-green-700 hover:underline">
                              {entry.name}
                            </Link>
                            {isMe && <span className="text-xs text-green-600 font-normal">(나)</span>}
                          </div>
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
