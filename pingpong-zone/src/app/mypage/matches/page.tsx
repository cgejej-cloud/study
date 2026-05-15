"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type ResultFilter = "all" | "win" | "loss" | "pending" | "disputed";
type PeriodFilter = "all" | "7d" | "30d" | "90d";

const PERIOD_LABEL: Record<PeriodFilter, string> = {
  all: "전체",
  "7d": "1주",
  "30d": "1개월",
  "90d": "3개월",
};

const RESULT_LABEL: Record<ResultFilter, string> = {
  all: "전체",
  win: "승리",
  loss: "패배",
  pending: "대기중",
  disputed: "이의",
};

function periodCutoff(period: PeriodFilter): number {
  if (period === "all") return 0;
  const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
  return Date.now() - days * 24 * 60 * 60 * 1000;
}

type Match = {
  id: string;
  createdAt: string;
  confirmedAt: string | null;
  status: string;
  winnerId: string;
  p1Score: number | null;
  p2Score: number | null;
  p1EloChange: number | null;
  p2EloChange: number | null;
  player1: { id: string; name: string };
  player2: { id: string; name: string };
  winner:  { id: string; name: string };
  season:  { name: string } | null;
};

function timeAgo(isoStr: string) {
  const diff = Date.now() - new Date(isoStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "방금 전";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}일 전`;
  if (d < 30) return `${Math.floor(d / 7)}주 전`;
  return new Date(isoStr).toLocaleDateString("ko-KR");
}

function SparkLine({ data, height = 60 }: { data: number[]; height?: number }) {
  if (data.length < 2) return null;
  const pad = 4;
  const w = 320;
  const min = Math.min(...data) - 30;
  const max = Math.max(...data) + 30;
  const range = max - min || 1;
  const pts = data.map((v, i) => [
    pad + (i / (data.length - 1)) * (w - pad * 2),
    pad + height - pad - ((v - min) / range) * (height - pad * 2),
  ]);
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const area = `${path} L ${pts[pts.length - 1][0]} ${height} L ${pts[0][0]} ${height} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#15803d" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#15803d" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#g)" />
      <path d={path} fill="none" stroke="#15803d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r="3" fill="#15803d" />
      ))}
    </svg>
  );
}

function buildOgUrl(m: Match, myId: string): string {
  const iAmP1 = m.player1.id === myId;
  const iWon = m.winnerId === myId;
  const myChange = iAmP1 ? m.p1EloChange : m.p2EloChange;
  const opponent = iAmP1 ? m.player2 : m.player1;
  const winner = iWon ? (iAmP1 ? m.player1.name : m.player2.name) : opponent.name;
  const loser = iWon ? opponent.name : (iAmP1 ? m.player1.name : m.player2.name);
  const change = myChange !== null ? (myChange >= 0 ? `+${myChange}` : `${myChange}`) : "+0";
  const date = new Date(m.confirmedAt ?? m.createdAt).toISOString().slice(0, 10);
  const params = new URLSearchParams({ winner, loser, change, elo: "1000", date });
  return `/api/og/match/${m.id}?${params.toString()}`;
}

async function shareMatch(url: string, title: string) {
  const fullUrl = `${window.location.origin}${url}`;
  if (typeof navigator.share === "function") {
    try {
      await navigator.share({ title, url: fullUrl });
      return;
    } catch {
    }
  }
  await navigator.clipboard.writeText(fullUrl);
  alert("공유 링크가 클립보드에 복사되었습니다.");
}

export default function MatchHistoryPage() {
  const router = useRouter();
  const [myId, setMyId] = useState("");
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    (async () => {
      const [meRes, matchRes] = await Promise.all([
        fetch("/api/me"),
        fetch("/api/matches?limit=20"),
      ]);
      if (matchRes.status === 401) { router.push("/login"); return; }
      const [me, matchData] = await Promise.all([meRes.json(), matchRes.json()]);
      if (me?.id) setMyId(me.id);
      const items = matchData?.items ?? (Array.isArray(matchData) ? matchData : []);
      setMatches(items);
      setNextCursor(matchData?.nextCursor ?? null);
      setHasMore(matchData?.hasMore ?? false);
      setLoading(false);
    })();
  }, [router]);

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    const res = await fetch(`/api/matches?limit=20&cursor=${nextCursor}`);
    const data = await res.json();
    const items = data?.items ?? [];
    setMatches((prev) => [...prev, ...items]);
    setNextCursor(data?.nextCursor ?? null);
    setHasMore(data?.hasMore ?? false);
    setLoadingMore(false);
  }

  // 필터 상태
  const [resultFilter, setResultFilter] = useState<ResultFilter>("all");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all");
  const [opponentQ, setOpponentQ] = useState("");

  const confirmed = matches.filter((m) => m.status === "confirmed");
  const wins   = confirmed.filter((m) => m.winnerId === myId).length;
  const losses = confirmed.filter((m) => m.winnerId !== myId).length;
  const winRate = confirmed.length > 0 ? Math.round((wins / confirmed.length) * 100) : null;

  // 필터링된 매치
  const filteredMatches = useMemo(() => {
    const cutoff = periodCutoff(periodFilter);
    const q = opponentQ.trim().toLowerCase();
    return matches.filter((m) => {
      // 기간
      if (cutoff > 0 && new Date(m.createdAt).getTime() < cutoff) return false;
      // 결과
      if (resultFilter !== "all") {
        if (resultFilter === "win") {
          if (m.status !== "confirmed" || m.winnerId !== myId) return false;
        } else if (resultFilter === "loss") {
          if (m.status !== "confirmed" || m.winnerId === myId) return false;
        } else if (m.status !== resultFilter) return false;
      }
      // 상대 이름
      if (q) {
        const opName = (m.player1.id === myId ? m.player2.name : m.player1.name).toLowerCase();
        if (!opName.includes(q)) return false;
      }
      return true;
    });
  }, [matches, myId, resultFilter, periodFilter, opponentQ]);

  const filterActive = resultFilter !== "all" || periodFilter !== "all" || opponentQ.trim() !== "";

  // 포인트 히스토리 재구성 (순서: 오래된 것부터)
  const chartData: number[] = [];
  let running = 1000;
  const ordered = [...confirmed].reverse();
  for (const m of ordered) {
    const change = m.player1.id === myId ? m.p1EloChange : m.p2EloChange;
    if (change !== null) {
      running += change;
      chartData.push(running);
    }
  }

  // 상대별 전적
  const rivalMap = new Map<string, { name: string; wins: number; losses: number }>();
  for (const m of confirmed) {
    const opId   = m.player1.id === myId ? m.player2.id : m.player1.id;
    const opName = m.player1.id === myId ? m.player2.name : m.player1.name;
    if (!rivalMap.has(opId)) rivalMap.set(opId, { name: opName, wins: 0, losses: 0 });
    const rec = rivalMap.get(opId)!;
    if (m.winnerId === myId) rec.wins++; else rec.losses++;
  }
  const rivals = [...rivalMap.values()].sort((a, b) => (b.wins + b.losses) - (a.wins + a.losses)).slice(0, 5);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/mypage" className="text-gray-400 hover:text-gray-600 text-lg" aria-label="마이페이지로 돌아가기">←</Link>
        <h1 className="text-2xl font-bold text-gray-900">경기 전적</h1>
        <a
          href="/api/me/matches/export"
          className="ml-auto text-xs font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 px-3 py-1.5 rounded-lg transition-colors"
          download
        >
          CSV 다운로드
        </a>
      </div>

      {/* 요약 */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "총 경기", value: confirmed.length, color: "text-gray-800" },
          { label: "승", value: wins, color: "text-blue-600" },
          { label: "패", value: losses, color: "text-red-500" },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-gray-100 rounded-xl p-4 text-center shadow-sm">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {winRate !== null && (
        <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-semibold text-gray-700">승률</span>
            <span className="font-bold text-green-700">{winRate}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${winRate}%` }} />
          </div>
        </div>
      )}

      {/* 포인트 변화 차트 */}
      {chartData.length >= 2 && (
        <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">포인트 변화</h2>
          <SparkLine data={chartData} height={80} />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>첫 경기</span>
            <span>최근</span>
          </div>
        </div>
      )}

      {/* 라이벌 상대 전적 */}
      {rivals.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">상대별 전적 (Top 5)</h2>
          <div className="space-y-2">
            {rivals.map((r) => {
              const total = r.wins + r.losses;
              const wr = Math.round((r.wins / total) * 100);
              return (
                <div key={r.name} className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-700 w-20 truncate">{r.name}</span>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: `${wr}%` }} />
                  </div>
                  <span className="text-xs text-gray-500 w-16 text-right">{r.wins}승 {r.losses}패</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 필터 */}
      <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm space-y-3">
        <div>
          <p className="text-[11px] font-semibold mb-1.5 text-gray-500">결과</p>
          <div className="flex gap-1.5 flex-wrap" role="group" aria-label="결과 필터">
            {(Object.keys(RESULT_LABEL) as ResultFilter[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setResultFilter(k)}
                aria-pressed={resultFilter === k}
                className={`text-[12px] px-3 py-1 rounded-full font-semibold transition-colors ${
                  resultFilter === k
                    ? "bg-green-700 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {RESULT_LABEL[k]}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[11px] font-semibold mb-1.5 text-gray-500">기간</p>
          <div className="flex gap-1.5 flex-wrap" role="group" aria-label="기간 필터">
            {(Object.keys(PERIOD_LABEL) as PeriodFilter[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setPeriodFilter(k)}
                aria-pressed={periodFilter === k}
                className={`text-[12px] px-3 py-1 rounded-full font-semibold transition-colors ${
                  periodFilter === k
                    ? "bg-green-700 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {PERIOD_LABEL[k]}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label htmlFor="opp-search" className="text-[11px] font-semibold mb-1.5 text-gray-500 block">상대 이름</label>
          <div className="flex gap-2">
            <input
              id="opp-search"
              type="search"
              value={opponentQ}
              onChange={(e) => setOpponentQ(e.target.value)}
              placeholder="이름 일부로 검색"
              className="flex-1 rounded-lg px-3 py-1.5 text-[13px] focus:outline-none"
              style={{ border: "1px solid var(--border)" }}
            />
            {filterActive && (
              <button
                type="button"
                onClick={() => { setResultFilter("all"); setPeriodFilter("all"); setOpponentQ(""); }}
                className="text-[12px] px-3 py-1.5 rounded-lg font-semibold text-gray-600 hover:bg-gray-100"
              >
                초기화
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 경기 목록 */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
          <span className="font-semibold text-gray-700 text-sm">최근 경기 기록</span>
          <span className="text-[11px] text-gray-500">
            {filterActive ? `필터 결과 ${filteredMatches.length} / ` : ""}전체 {matches.length}건
          </span>
        </div>
        {loading ? (
          <div className="p-6 text-center text-gray-400 text-sm">불러오는 중...</div>
        ) : matches.length === 0 ? (
          <div className="p-6 text-center text-gray-400 text-sm">경기 기록이 없습니다.</div>
        ) : filteredMatches.length === 0 ? (
          <div className="p-6 text-center text-gray-400 text-sm">조건에 맞는 경기가 없습니다.</div>
        ) : (
          <>
          <div className="divide-y">
            {filteredMatches.map((m) => {
              const iWon = m.winnerId === myId;
              const iAmP1 = m.player1.id === myId;
              const opponent = iAmP1 ? m.player2 : m.player1;
              const myChange = iAmP1 ? m.p1EloChange : m.p2EloChange;
              const myScore  = iAmP1 ? m.p1Score : m.p2Score;
              const oppScore = iAmP1 ? m.p2Score : m.p1Score;
              return (
                <div key={m.id} className="px-4 py-3 flex items-center gap-3">
                  <div className={`w-1.5 h-10 rounded-full shrink-0 ${
                    m.status === "confirmed" ? (iWon ? "bg-blue-400" : "bg-red-300") :
                    m.status === "pending"   ? "bg-yellow-400" :
                    m.status === "disputed"  ? "bg-orange-400" : "bg-gray-300"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 text-sm">
                      <Link href={`/players/${opponent.id}`} className="font-semibold text-gray-800 hover:text-green-700 hover:underline">
                        {opponent.name}
                      </Link>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                        m.status === "confirmed" ? (iWon ? "bg-blue-50 text-blue-600" : "bg-red-50 text-red-500") :
                        m.status === "pending"   ? "bg-yellow-50 text-yellow-600" :
                        m.status === "disputed"  ? "bg-orange-50 text-orange-600" : "bg-gray-100 text-gray-500"
                      }`}>
                        {m.status === "confirmed" ? (iWon ? "승" : "패") :
                         m.status === "pending"   ? "대기" :
                         m.status === "disputed"  ? "이의" : m.status}
                      </span>
                      {myScore !== null && oppScore !== null && (
                        <span className="text-xs text-gray-500 font-mono">
                          {myScore}-{oppScore}
                        </span>
                      )}
                      {m.season && <span className="text-xs text-gray-400">{m.season.name}</span>}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {timeAgo(m.createdAt)}
                    </div>
                  </div>
                  {myChange !== null && m.status === "confirmed" && (
                    <span className={`text-sm font-bold ${myChange >= 0 ? "text-green-600" : "text-red-500"}`}>
                      {myChange >= 0 ? "+" : ""}{myChange}
                    </span>
                  )}
                  {m.status === "confirmed" && (
                    <button
                      onClick={() => shareMatch(buildOgUrl(m, myId), `탁구존 경기 결과`)}
                      className="text-xs text-gray-400 hover:text-green-600 transition-colors px-1"
                      title="공유"
                    >
                      공유
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          {hasMore && (
            <div className="px-4 py-3 border-t text-center">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="text-sm font-semibold text-green-700 hover:underline disabled:opacity-50"
              >
                {loadingMore ? "불러오는 중..." : "더 보기"}
              </button>
            </div>
          )}
          </>
        )}
      </div>
    </div>
  );
}
