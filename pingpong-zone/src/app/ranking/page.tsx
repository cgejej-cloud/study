"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Avatar from "@/components/Avatar";

type RankEntry = {
  id: string; name: string; eloRating: number;
  wins: number; losses: number; total: number;
  isPlacing: boolean; placementLeft: number;
  winRate: number | null;
  streak: { type: "W" | "L"; count: number } | null;
  rankChange: number | null;
};
type SeasonStanding = {
  id: string; name: string; rating: number; rank: number;
  wins: number; losses: number; delta?: number; winRate?: number | null;
};
type ActiveSeason = { id: string; name: string } | null;

const TIER_INFO = [
  { name: "그랜드마스터", minElo: 1400, icon: "👑", bg: "#fffbeb", color: "#d97706" },
  { name: "마스터",       minElo: 1300, icon: "💎", bg: "#f5f3ff", color: "#7c3aed" },
  { name: "다이아",       minElo: 1200, icon: "💠", bg: "#eff6ff", color: "#2563eb" },
  { name: "플래티넘",     minElo: 1100, icon: "🔷", bg: "#f0fdfa", color: "#0d9488" },
  { name: "골드",         minElo: 1000, icon: "🥇", bg: "#fffbeb", color: "#b45309" },
  { name: "실버",         minElo:  900, icon: "🥈", bg: "#f8fafc", color: "#475569" },
  { name: "브론즈",       minElo:    0, icon: "🥉", bg: "#fff7ed", color: "#c2410c" },
];
function getTier(elo: number) { return TIER_INFO.find(t => elo >= t.minElo) ?? TIER_INFO[TIER_INFO.length - 1]; }
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
    fetch("/api/me").then(r => r.json()).then(d => { if (d?.id) setMyId(d.id); });
    fetch("/api/ranking").then(r => r.json()).then(d => { setRanking(Array.isArray(d) ? d : []); setLoading(false); });
    fetch("/api/seasons").then(r => r.ok ? r.json() : { active: null })
      .then(d => setActiveSeason(d.active ? { id: d.active.id, name: d.active.name } : null)).catch(() => {});
  }, []);

  useEffect(() => {
    if (tab !== "season" || !activeSeason) return;
    setSeasonLoading(true);
    fetch(`/api/seasons/${activeSeason.id}/standings`)
      .then(r => r.ok ? r.json() : { standings: [] })
      .then(d => setSeasonStandings(d.standings ?? []))
      .catch(() => setSeasonStandings([]))
      .finally(() => setSeasonLoading(false));
  }, [tab, activeSeason]);

  const allPlaced = ranking.filter(e => !e.isPlacing);
  const placing   = ranking.filter(e => e.isPlacing);
  const filtered  = allPlaced.filter(e => e.name.toLowerCase().includes(search.trim().toLowerCase()));
  const placed    = [...filtered].sort((a, b) => {
    if (sortBy === "name")    return a.name.localeCompare(b.name, "ko");
    if (sortBy === "winRate") return (b.winRate ?? -1) - (a.winRate ?? -1);
    if (sortBy === "games")   return b.total - a.total;
    return b.eloRating - a.eloRating;
  });

  return (
    <div className="max-w-3xl mx-auto space-y-5">

      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h1 className="font-extrabold text-[22px]" style={{ letterSpacing: "-0.03em", color: "var(--text-1)" }}>
          🏆 랭킹
        </h1>
        <Link href="/ranking/record" className="btn btn-jade">
          경기 기록
        </Link>
      </div>

      {/* 티어 그리드 */}
      <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
        {TIER_INFO.map(t => (
          <div key={t.name} className="card-sm p-2.5 text-center" style={{ background: t.bg }}>
            <div className="text-xl leading-tight">{t.icon}</div>
            <div className="font-bold mt-0.5 leading-tight" style={{ color: t.color, fontSize: "10px" }}>{t.name}</div>
            <div className="text-[9px] mt-0.5" style={{ color: "var(--text-3)" }}>{t.minElo}+</div>
          </div>
        ))}
      </div>

      {/* 시즌 탭 */}
      {activeSeason && (
        <div className="flex items-center gap-2">
          <div className="card-sm p-1 flex gap-1 flex-1">
            {(["overall", "season"] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="flex-1 py-2 rounded-xl text-[13px] font-bold transition-all"
                style={tab === t
                  ? { background: "var(--jade-950)", color: "white" }
                  : { background: "transparent", color: "var(--text-3)" }}
              >
                {t === "overall" ? "전체 랭킹" : `🏆 ${activeSeason.name}`}
              </button>
            ))}
          </div>
          <Link
            href="/seasons"
            className="card-sm px-3 py-2 text-[12px] font-semibold whitespace-nowrap hover:opacity-80 transition-opacity"
            style={{ color: "var(--text-2)" }}
          >
            시즌 아카이브
          </Link>
        </div>
      )}

      {/* 안내 칩 */}
      <div className="grid sm:grid-cols-2 gap-2">
        <div className="rounded-2xl px-4 py-3" style={{ background: "#fffbeb", border: "1px solid #fde68a" }}>
          <p className="font-bold text-[12px]" style={{ color: "#92400e" }}>🔰 신입 보정</p>
          <p className="text-[11px] mt-0.5" style={{ color: "#78350f" }}>처음 5경기는 포인트 2배 — 빠르게 내 실력대로 배치</p>
        </div>
        <div className="rounded-2xl px-4 py-3" style={{ background: "#eff6ff", border: "1px solid #bfdbfe" }}>
          <p className="font-bold text-[12px]" style={{ color: "#1d4ed8" }}>🛡️ 공정성 보장</p>
          <p className="text-[11px] mt-0.5" style={{ color: "#1e40af" }}>상대방 확인 후 포인트 반영 · 이의제기 가능</p>
        </div>
      </div>

      {/* 시즌 랭킹 */}
      {tab === "season" && activeSeason ? (
        seasonLoading ? (
          <div className="card p-6 text-center text-[13px]" style={{ color: "var(--text-3)" }}>불러오는 중...</div>
        ) : seasonStandings.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="text-4xl mb-2">🏆</p>
            <p className="font-bold text-[14px]" style={{ color: "var(--text-1)" }}>{activeSeason.name} 시즌 기록 없음</p>
            <p className="text-[12px] mt-1" style={{ color: "var(--text-3)" }}>시즌 기간 내 경기를 기록하면 자동 집계됩니다</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="px-4 py-2.5 flex items-center gap-2" style={{ background: "#fffbeb", borderBottom: "1px solid var(--border)" }}>
              <span className="font-bold text-[13px]">🏆 {activeSeason.name}</span>
              <span className="chip chip-sun">{seasonStandings.length}명</span>
            </div>
            <div className="overflow-x-auto">
              <table className="pp-table">
                <thead><tr>
                  {["순위","선수","시즌 포인트","승","패","승률"].map(h => <th key={h}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {seasonStandings.map(s => {
                    const isMe = s.id === myId;
                    return (
                      <tr key={s.id} className={isMe ? "my-row" : ""}>
                        <td className="font-bold" style={{ color: "var(--text-3)" }}>
                          {s.rank === 1 ? "🥇" : s.rank === 2 ? "🥈" : s.rank === 3 ? "🥉" : `#${s.rank}`}
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <Avatar name={s.name} size="sm" />
                            <Link href={`/players/${s.id}`} className="font-semibold hover:underline" style={{ color: "var(--text-1)" }}>{s.name}</Link>
                            {isMe && <span className="chip chip-jade">나</span>}
                          </div>
                        </td>
                        <td className="font-bold" style={{ color: (s.delta ?? 0) >= 0 ? "var(--jade-600)" : "#e11d48" }}>
                          {(s.delta ?? 0) >= 0 ? "+" : ""}{s.delta ?? 0}
                        </td>
                        <td className="font-medium" style={{ color: "#2563eb" }}>{s.wins}</td>
                        <td className="font-medium" style={{ color: "#e11d48" }}>{s.losses}</td>
                        <td style={{ color: "var(--text-3)" }}>{s.winRate !== null && s.winRate !== undefined ? `${s.winRate}%` : "-"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : loading ? (
        <div className="card p-6 text-center text-[13px]" style={{ color: "var(--text-3)" }}>불러오는 중...</div>
      ) : (
        <>
          {allPlaced.length === 0 ? (
            <div className="card p-10 text-center">
              <p className="text-4xl mb-2">🏓</p>
              <p className="font-bold text-[14px]" style={{ color: "var(--text-1)" }}>아직 정식 랭킹에 입력된 선수가 없습니다</p>
              <p className="text-[12px] mt-1" style={{ color: "var(--text-3)" }}>5경기를 완료하면 자동으로 등록됩니다</p>
              <Link href="/ranking/record" className="btn btn-jade mt-4 mx-auto">경기 기록하기</Link>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <div className="px-4 py-2.5 flex flex-wrap items-center gap-2" style={{ borderBottom: "1px solid var(--border)", background: "#f8faf8" }}>
                <span className="font-bold text-[13px]" style={{ color: "var(--text-1)" }}>랭킹</span>
                <span className="chip chip-jade">{placed.length}명</span>
                <div className="ml-auto flex items-center gap-2">
                  <input
                    type="search" value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="선수 검색" aria-label="선수 이름 검색"
                    className="rounded-full px-3 py-1 text-[12px] focus:outline-none"
                    style={{ border: "1.5px solid var(--border)", width: "120px", background: "white" }}
                  />
                  <select
                    value={sortBy} onChange={e => setSortBy(e.target.value as SortKey)}
                    aria-label="정렬 기준"
                    className="rounded-full px-2.5 py-1 text-[12px] focus:outline-none"
                    style={{ border: "1.5px solid var(--border)", background: "white" }}
                  >
                    <option value="elo">포인트순</option>
                    <option value="name">이름순</option>
                    <option value="winRate">승률순</option>
                    <option value="games">경기수순</option>
                  </select>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="pp-table" style={{ minWidth: "520px" }}>
                  <thead><tr>
                    {["순위","티어","선수","변동","포인트","승","패","승률"].map(h => <th key={h}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {placed.length === 0 ? (
                      <tr><td colSpan={8} className="text-center py-6 text-[13px]" style={{ color: "var(--text-3)" }}>검색 결과가 없습니다</td></tr>
                    ) : placed.map((entry, i) => {
                      const tier = getTier(entry.eloRating);
                      const isMe = entry.id === myId;
                      const rc = entry.rankChange;
                      return (
                        <tr key={entry.id} className={isMe ? "my-row" : ""}>
                          <td className="font-bold" style={{ color: "var(--text-3)" }}>
                            {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i+1}`}
                          </td>
                          <td>
                            <span className="chip" style={{ background: tier.bg, color: tier.color }}>
                              {tier.icon} {tier.name}
                            </span>
                          </td>
                          <td>
                            <div className="flex items-center gap-2">
                              <Avatar name={entry.name} size="sm" />
                              <Link href={`/players/${entry.id}`} className="font-semibold hover:underline" style={{ color: "var(--text-1)" }}>
                                {entry.name}
                              </Link>
                              {isMe && <span className="chip chip-jade">나</span>}
                              {entry.streak && entry.streak.count >= 3 && (
                                <span
                                  className="chip"
                                  style={entry.streak.type === "W"
                                    ? { background: "#fff7ed", color: "#c2410c" }
                                    : { background: "#f1f5f9", color: "#64748b" }}
                                >
                                  {entry.streak.type === "W" ? "🔥" : "❄️"} {entry.streak.count}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="font-semibold text-[12px]">
                            {rc === null ? (
                              <span style={{ color: "var(--text-3)" }}>NEW</span>
                            ) : rc > 0 ? (
                              <span style={{ color: "#16a34a" }}>+{rc}</span>
                            ) : rc < 0 ? (
                              <span style={{ color: "#e11d48" }}>{rc}</span>
                            ) : (
                              <span style={{ color: "var(--text-3)" }}>-</span>
                            )}
                          </td>
                          <td className="font-extrabold" style={{ color: "var(--jade-700)" }}>{entry.eloRating}</td>
                          <td className="font-medium" style={{ color: "#2563eb" }}>{entry.wins}</td>
                          <td className="font-medium" style={{ color: "#e11d48" }}>{entry.losses}</td>
                          <td>
                            {entry.winRate !== null ? (
                              <div className="flex items-center gap-2">
                                <div className="w-14 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--jade-100)" }}>
                                  <div className="h-full rounded-full" style={{ width: `${entry.winRate}%`, background: "var(--jade-500)" }} />
                                </div>
                                <span style={{ color: "var(--text-2)", fontSize: "12px" }}>{entry.winRate}%</span>
                              </div>
                            ) : <span style={{ color: "var(--text-3)" }}>-</span>}
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
            <div className="card overflow-hidden">
              <div className="px-4 py-2.5 flex items-center gap-2" style={{ borderBottom: "1px solid var(--border)", background: "#fff7ed" }}>
                <span className="font-bold text-[13px]">🔰 신입 보정 기간</span>
                <span className="chip" style={{ background: "#fed7aa", color: "#c2410c" }}>보정 중</span>
                <span className="text-[11px]" style={{ color: "var(--text-3)" }}>{placing.length}명 · 5경기 후 정식 반영</span>
              </div>
              <div className="overflow-x-auto">
                <table className="pp-table">
                  <thead><tr>{["선수","진행","승","패","현재 포인트"].map(h => <th key={h}>{h}</th>)}</tr></thead>
                  <tbody>
                    {placing.map(entry => {
                      const isMe = entry.id === myId;
                      return (
                        <tr key={entry.id} className={isMe ? "my-row" : ""}>
                          <td>
                            <div className="flex items-center gap-2">
                              <Avatar name={entry.name} size="sm" />
                              <Link href={`/players/${entry.id}`} className="font-semibold hover:underline" style={{ color: "var(--text-1)" }}>{entry.name}</Link>
                              {isMe && <span className="chip chip-jade">나</span>}
                            </div>
                          </td>
                          <td>
                            <div className="flex items-center gap-1.5">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="w-3.5 h-3.5 rounded-full" style={{ background: i < entry.total ? "var(--jade-500)" : "var(--jade-100)" }} />
                              ))}
                              <span className="text-[11px] ml-1" style={{ color: "var(--text-3)" }}>{entry.total}/5</span>
                            </div>
                          </td>
                          <td style={{ color: "#2563eb" }}>{entry.wins}</td>
                          <td style={{ color: "#e11d48" }}>{entry.losses}</td>
                          <td className="font-medium" style={{ color: "var(--text-3)" }}>{entry.eloRating}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
