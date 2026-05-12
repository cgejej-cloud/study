"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import { useToast } from "@/components/Toast";

type Player = {
  id: string;
  name: string;
  eloRating: number;
  joinedAt: string;
  stats: {
    total: number;
    wins: number;
    losses: number;
    winRate: number | null;
    isPlacing: boolean;
    placementLeft: number;
    streak: { type: "W" | "L"; count: number } | null;
    recentForm: ("W" | "L")[];
    avgSetDiff: number | null;
  };
  headToHead: null | { vsId: string; vsName: string; wins: number; losses: number };
  badges: Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
    earned: boolean;
    progress?: { current: number; target: number };
  }>;
  recentMatches: Array<{
    id: string;
    opponentId: string;
    opponentName: string;
    won: boolean;
    createdAt: string;
    myChange: number | null;
    myScore: number | null;
    oppScore: number | null;
  }>;
};

type EloHistory = {
  current: number;
  startElo: number;
  history: { date: string; elo: number; change: number }[];
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
  return new Date(isoStr).toLocaleDateString("ko-KR");
}

function EloChart({ history, startElo, current }: { history: EloHistory["history"]; startElo: number; current: number }) {
  if (history.length < 2) return null;

  const allElos = [startElo, ...history.map((h) => h.elo)];
  const minElo = Math.min(...allElos) - 20;
  const maxElo = Math.max(...allElos) + 20;
  const range = maxElo - minElo || 1;

  const W = 400;
  const H = 100;
  const PAD = 8;
  const innerW = W - PAD * 2;
  const innerH = H - PAD * 2;

  const points = [{ date: "", elo: startElo }, ...history];
  const pts = points.map((p, i) => [
    PAD + (i / (points.length - 1)) * innerW,
    PAD + innerH - ((p.elo - minElo) / range) * innerH,
  ]);

  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const area = `${path} L ${pts[pts.length - 1][0]} ${H} L ${pts[0][0]} ${H} Z`;
  const delta = current - startElo;
  const isUp = delta >= 0;

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="section-title">ELO 히스토리</p>
        <span
          className="chip text-[11px] font-bold"
          style={isUp
            ? { background: "var(--jade-50)", color: "var(--jade-700)" }
            : { background: "#fff1f2", color: "#e11d48" }}
        >
          {isUp ? "+" : ""}{delta}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: "100px" }} preserveAspectRatio="none">
        <defs>
          <linearGradient id="eloGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={isUp ? "#22c55e" : "#f43f5e"} stopOpacity="0.25" />
            <stop offset="100%" stopColor={isUp ? "#22c55e" : "#f43f5e"} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#eloGrad)" />
        <path d={path} fill="none" stroke={isUp ? "#16a34a" : "#e11d48"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) => {
          if (i === 0 || i === pts.length - 1) {
            return <circle key={i} cx={p[0]} cy={p[1]} r="3.5" fill={isUp ? "#16a34a" : "#e11d48"} />;
          }
          return null;
        })}
      </svg>
      <div className="flex justify-between text-[10px] mt-1" style={{ color: "var(--text-3)" }}>
        <span>{startElo}점</span>
        <span>{history.length}경기</span>
        <span>{current}점</span>
      </div>
    </div>
  );
}

const TIER_INFO = [
  { name: "그랜드마스터", minElo: 1400, icon: "👑", color: "#d97706" },
  { name: "마스터",       minElo: 1300, icon: "💎", color: "#7c3aed" },
  { name: "다이아",       minElo: 1200, icon: "💠", color: "#2563eb" },
  { name: "플래티넘",     minElo: 1100, icon: "🔷", color: "#0d9488" },
  { name: "골드",         minElo: 1000, icon: "🥇", color: "#b45309" },
  { name: "실버",         minElo:  900, icon: "🥈", color: "#475569" },
  { name: "브론즈",       minElo:    0, icon: "🥉", color: "#c2410c" },
];
function getTier(elo: number) { return TIER_INFO.find((t) => elo >= t.minElo) ?? TIER_INFO[TIER_INFO.length - 1]; }

type FollowStatus = {
  following: boolean;
  followerCount: number;
  followingCount: number;
};

export default function PlayerProfilePage() {
  const params = useParams();
  const id = (params?.id ?? "") as string;
  const toast = useToast();
  const [player, setPlayer] = useState<Player | null>(null);
  const [eloHistory, setEloHistory] = useState<EloHistory | null>(null);
  const [error, setError] = useState(false);
  const [myId, setMyId] = useState<string | null>(null);
  const [followStatus, setFollowStatus] = useState<FollowStatus | null>(null);
  const [followLoading, setFollowLoading] = useState(false);
  const [challengeSent, setChallengeSent] = useState(false);
  const [challengeLoading, setChallengeLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/players/${id}`)
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then(setPlayer)
      .catch(() => setError(true));

    fetch(`/api/players/${id}/elo-history`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => d && setEloHistory(d))
      .catch(() => {});

    fetch("/api/me")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.id) setMyId(d.id); })
      .catch(() => {});

    fetch(`/api/follow/${id}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setFollowStatus(d); })
      .catch(() => {});
  }, [id]);

  async function handleFollow() {
    if (!myId || followLoading) return;
    setFollowLoading(true);
    try {
      if (followStatus?.following) {
        const res = await fetch(`/api/follow/${id}`, { method: "DELETE" });
        if (res.ok) {
          setFollowStatus((prev) => prev ? { ...prev, following: false, followerCount: prev.followerCount - 1 } : prev);
        }
      } else {
        const res = await fetch(`/api/follow/${id}`, { method: "POST" });
        if (res.ok) {
          setFollowStatus((prev) => prev ? { ...prev, following: true, followerCount: prev.followerCount + 1 } : prev);
        }
      }
    } finally {
      setFollowLoading(false);
    }
  }

  async function handleChallenge() {
    if (!myId || challengeLoading || challengeSent) return;
    setChallengeLoading(true);
    try {
      const res = await fetch("/api/challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengedId: id }),
      });
      if (res.ok) {
        setChallengeSent(true);
        toast.show("경기 신청을 보냈습니다!", "success");
      } else {
        const data = await res.json().catch(() => ({}));
        toast.show(data.error || "신청에 실패했습니다.", "error");
      }
    } finally {
      setChallengeLoading(false);
    }
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-3">
        <div className="text-4xl">🏓</div>
        <p className="text-[13px]" style={{ color: "var(--text-3)" }}>선수 정보를 불러올 수 없습니다.</p>
        <Link href="/ranking" className="btn btn-jade mx-auto">랭킹으로</Link>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="max-w-2xl mx-auto animate-pulse space-y-4">
        <div className="h-24 rounded-2xl" style={{ background: "var(--border)" }} />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-xl" style={{ background: "var(--border)" }} />)}
        </div>
      </div>
    );
  }

  const tier = getTier(player.eloRating);

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/ranking" className="text-[18px]" style={{ color: "var(--text-3)" }} aria-label="랭킹으로 돌아가기">←</Link>
        <h1 className="font-extrabold text-[20px]" style={{ letterSpacing: "-0.03em", color: "var(--text-1)" }}>선수 프로필</h1>
      </div>

      {/* 프로필 헤더 */}
      <div className="card p-5 flex items-center gap-4">
        <Avatar name={player.name} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-extrabold text-[18px]" style={{ color: "var(--text-1)" }}>{player.name}</h2>
            <span className="chip text-[11px] font-bold" style={{ color: tier.color }}>
              {tier.icon} {tier.name}
            </span>
            {player.stats.isPlacing && (
              <span className="chip" style={{ background: "#fff7ed", color: "#c2410c" }}>🔰 신입 보정</span>
            )}
          </div>
          <p className="text-[13px] mt-0.5" style={{ color: "var(--text-2)" }}>
            현재 포인트 <span className="font-bold" style={{ color: "var(--jade-700)" }}>{player.eloRating}점</span>
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: "var(--text-3)" }}>
            가입 · {new Date(player.joinedAt).toLocaleDateString("ko-KR")}
          </p>
          {followStatus && (
            <p className="text-[11px] mt-0.5" style={{ color: "var(--text-3)" }}>
              팔로워 <span className="font-semibold" style={{ color: "var(--text-2)" }}>{followStatus.followerCount}</span>
            </p>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {player.stats.streak && player.stats.streak.count >= 3 && (
              <span
                className="chip text-[11px] font-bold"
                style={player.stats.streak.type === "W"
                  ? { background: "#fff7ed", color: "#c2410c" }
                  : { background: "#f1f5f9", color: "#64748b" }}
              >
                {player.stats.streak.type === "W" ? "🔥" : "❄️"} {player.stats.streak.count}{player.stats.streak.type === "W" ? "연승" : "연패"}
              </span>
            )}
            {player.stats.recentForm.length > 0 && (
              <div className="flex gap-0.5" aria-label="최근 폼">
                {player.stats.recentForm.map((f, i) => (
                  <span
                    key={i}
                    className="w-5 h-5 rounded-md text-[10px] font-bold flex items-center justify-center"
                    style={f === "W"
                      ? { background: "#eff6ff", color: "#2563eb" }
                      : { background: "#fff1f2", color: "#e11d48" }}
                    title={f === "W" ? "승" : "패"}
                  >
                    {f}
                  </span>
                ))}
              </div>
            )}
          </div>
          {myId && myId !== id && (
            <div className="flex gap-2 mt-3 flex-wrap">
              <button
                onClick={handleFollow}
                disabled={followLoading}
                className={followStatus?.following ? "btn" : "btn btn-jade"}
                style={{ fontSize: "12px", opacity: followLoading ? 0.6 : 1 }}
              >
                {followStatus?.following ? "팔로잉" : "팔로우"}
              </button>
              <button
                onClick={handleChallenge}
                disabled={challengeLoading || challengeSent}
                className="btn"
                style={{ fontSize: "12px", opacity: (challengeLoading || challengeSent) ? 0.6 : 1 }}
              >
                {challengeSent ? "신청 완료!" : challengeLoading ? "신청 중..." : "⚔️ 경기 신청"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 통계 */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "총 경기", value: player.stats.total, color: "var(--text-1)" },
          { label: "승", value: player.stats.wins, color: "#2563eb" },
          { label: "패", value: player.stats.losses, color: "#e11d48" },
        ].map((s) => (
          <div key={s.label} className="card p-4 text-center">
            <div className="text-[22px] font-extrabold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-[11px] mt-0.5" style={{ color: "var(--text-3)" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ELO 히스토리 차트 */}
      {eloHistory && eloHistory.history.length >= 2 && (
        <EloChart history={eloHistory.history} startElo={eloHistory.startElo} current={eloHistory.current} />
      )}

      {/* Head-to-Head */}
      {player.headToHead && (player.headToHead.wins + player.headToHead.losses > 0) && (
        <div className="card p-4" style={{ background: "linear-gradient(135deg, #eff6ff 0%, #fff1f2 100%)" }}>
          <p className="section-title text-center mb-3">⚔️ 나와의 상대 전적</p>
          <div className="flex items-center justify-center gap-6">
            <div className="text-center">
              <p className="text-[11px] mb-1" style={{ color: "var(--text-3)" }}>{player.headToHead.vsName} (나)</p>
              <p className="text-[28px] font-extrabold" style={{ color: "#2563eb" }}>{player.headToHead.wins}</p>
              <p className="text-[11px]" style={{ color: "var(--text-3)" }}>승</p>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-[18px] font-light" style={{ color: "var(--border)" }}>vs</span>
              {(() => {
                const total = player.headToHead.wins + player.headToHead.losses;
                const myWr = Math.round((player.headToHead.wins / total) * 100);
                return (
                  <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: "#fff1f2" }}>
                    <div className="h-full rounded-full" style={{ width: `${myWr}%`, background: "#2563eb" }} />
                  </div>
                );
              })()}
              <p className="text-[10px]" style={{ color: "var(--text-3)" }}>
                {player.headToHead.wins + player.headToHead.losses}전
              </p>
            </div>
            <div className="text-center">
              <p className="text-[11px] mb-1" style={{ color: "var(--text-3)" }}>{player.name}</p>
              <p className="text-[28px] font-extrabold" style={{ color: "#e11d48" }}>{player.headToHead.losses}</p>
              <p className="text-[11px]" style={{ color: "var(--text-3)" }}>승</p>
            </div>
          </div>
          <Link
            href={`/ranking/record?opponent=${player.id}`}
            className="btn btn-jade w-full mt-4 text-center"
            style={{ display: "block", textAlign: "center" }}
          >
            🏓 {player.name}님과 경기 기록하기
          </Link>
        </div>
      )}

      {/* 승률 + 지배력 */}
      {player.stats.winRate !== null && (
        <div className="card p-4 space-y-3">
          <div>
            <div className="flex justify-between text-[13px] mb-2">
              <span className="font-semibold" style={{ color: "var(--text-2)" }}>승률</span>
              <span className="font-bold" style={{ color: "var(--jade-700)" }}>{player.stats.winRate}%</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--jade-100)" }}>
              <div className="h-full rounded-full" style={{ width: `${player.stats.winRate}%`, background: "var(--jade-500)" }} />
            </div>
          </div>
          {player.stats.avgSetDiff !== null && (
            <div className="flex items-center justify-between text-[13px] pt-2" style={{ borderTop: "1px solid var(--border)" }}>
              <span style={{ color: "var(--text-3)" }}>평균 세트 차이 (지배력)</span>
              <span className="font-bold" style={{ color: player.stats.avgSetDiff >= 0 ? "#2563eb" : "#e11d48" }}>
                {player.stats.avgSetDiff >= 0 ? "+" : ""}{player.stats.avgSetDiff}
              </span>
            </div>
          )}
        </div>
      )}

      {/* 업적 */}
      {player.badges && player.badges.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="section-title">🏅 업적</p>
            <span className="chip text-[11px]">
              {player.badges.filter((b) => b.earned).length} / {player.badges.length}
            </span>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {player.badges.map((b) => (
              <div
                key={b.id}
                title={`${b.name}\n${b.description}${b.progress ? ` (${b.progress.current}/${b.progress.target})` : ""}`}
                className="aspect-square rounded-xl flex flex-col items-center justify-center text-center p-1.5"
                style={b.earned
                  ? { background: "linear-gradient(135deg, #fffbeb, #fef3c7)", border: "1px solid #fde68a" }
                  : { background: "var(--jade-50)", border: "1px solid var(--border)", opacity: 0.4 }}
              >
                <div className="text-xl">{b.icon}</div>
                <div className="text-[9px] font-semibold mt-0.5 leading-tight" style={{ color: b.earned ? "#92400e" : "var(--text-3)" }}>
                  {b.name}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 최근 경기 */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border)", background: "var(--jade-50)" }}>
          <span className="section-title">최근 경기</span>
        </div>
        {player.recentMatches.length === 0 ? (
          <div className="p-6 text-center text-[13px]" style={{ color: "var(--text-3)" }}>아직 경기 기록이 없습니다.</div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {player.recentMatches.map((m) => (
              <div key={m.id} className="px-4 py-3 flex items-center gap-3">
                <div className="w-1.5 h-10 rounded-full shrink-0" style={{ background: m.won ? "#60a5fa" : "#fca5a5" }} />
                <Link href={`/players/${m.opponentId}`} className="flex-1 min-w-0 group">
                  <div className="flex items-center gap-1.5 text-[13px]">
                    <span className="font-semibold group-hover:underline" style={{ color: "var(--text-1)" }}>{m.opponentName}</span>
                    <span
                      className="chip text-[11px]"
                      style={m.won
                        ? { background: "#eff6ff", color: "#2563eb" }
                        : { background: "#fff1f2", color: "#e11d48" }}
                    >
                      {m.won ? "승" : "패"}
                    </span>
                    {m.myScore !== null && m.oppScore !== null && (
                      <span className="text-[11px] font-mono" style={{ color: "var(--text-3)" }}>{m.myScore}-{m.oppScore}</span>
                    )}
                  </div>
                  <div className="text-[11px] mt-0.5" style={{ color: "var(--text-3)" }}>{timeAgo(m.createdAt)}</div>
                </Link>
                {m.myChange !== null && (
                  <span className="text-[13px] font-bold" style={{ color: m.myChange >= 0 ? "var(--jade-600)" : "#e11d48" }}>
                    {m.myChange >= 0 ? "+" : ""}{m.myChange}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
