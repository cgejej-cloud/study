"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/Toast";

type Reservation = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  isRecurring?: boolean;
  parentId?: string | null;
  checkInCode?: string | null;
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

type Challenge = {
  id: string;
  challengerId: string;
  message: string | null;
  expiresAt: string;
  createdAt: string;
  challenger: { id: string; name: string; eloRating: number };
};

type FollowCounts = { followerCount: number; followingCount: number };

type TeamMatchItem = {
  id: string;
  createdAt: string;
  winnerTeam: number;
  t1Score: number | null;
  t2Score: number | null;
  team1Player1: { id: string; name: string };
  team1Player2: { id: string; name: string };
  team2Player1: { id: string; name: string };
  team2Player2: { id: string; name: string };
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
  const toast = useToast();
  const [myId, setMyId] = useState("");
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [pendingMatches, setPendingMatches] = useState<PendingMatch[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [followCounts, setFollowCounts] = useState<FollowCounts | null>(null);
  const [activeMatch, setActiveMatch] = useState<{ opponent: { id: string; name: string }; reservation: { date: string; startTime: string; endTime: string; table: { name: string } } | null } | null>(null);
  const [teamMatches, setTeamMatches] = useState<TeamMatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [meRes, resRes, pendRes, chalRes, tmRes, activeRes] = await Promise.all([
        fetch("/api/me"),
        fetch("/api/reservations"),
        fetch("/api/matches?pending=true"),
        fetch("/api/challenges"),
        fetch("/api/team-matches"),
        fetch("/api/matches/active"),
      ]);

      if (resRes.status === 401) { router.push("/login"); return; }

      const [me, resData, pendData, chalData, tmData, activeData] = await Promise.all([
        meRes.json(),
        resRes.json(),
        pendRes.json(),
        chalRes.ok ? chalRes.json() : [],
        tmRes.ok ? tmRes.json() : [],
        activeRes.ok ? activeRes.json() : null,
      ]);

      if (cancelled) return;
      if (me?.id) {
        setMyId(me.id);
        fetch(`/api/follow/${me.id}`)
          .then((r) => r.ok ? r.json() : null)
          .then((d) => { if (d && !cancelled) setFollowCounts({ followerCount: d.followerCount, followingCount: d.followingCount }); })
          .catch(() => {});
      }
      setReservations(Array.isArray(resData) ? resData : []);
      setPendingMatches(Array.isArray(pendData) ? pendData : []);
      setChallenges(Array.isArray(chalData) ? chalData : []);
      if (activeData) setActiveMatch(activeData);
      setTeamMatches(Array.isArray(tmData) ? tmData.slice(0, 3) : []);
      setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [tick, router]);

  async function handleChallengeAction(challengeId: string, action: "accept" | "reject") {
    const res = await fetch(`/api/challenges/${challengeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.show(data.error || "처리에 실패했습니다.", "error");
      return;
    }

    const data = await res.json();

    if (action === "accept" && data.redirectUrl) {
      router.push(data.redirectUrl);
      return;
    }

    toast.show(action === "accept" ? "챌린지를 수락했습니다." : "챌린지를 거절했습니다.", "success");
    setTick((t) => t + 1);
  }

  async function handleCancel(r: Reservation) {
    const isSeries = r.isRecurring || !!r.parentId;
    let cancelAll = false;
    if (isSeries) {
      const choice = confirm(
        "이 예약은 반복 예약입니다.\n[확인] 누르면 앞으로의 모든 반복 예약을 일괄 취소하고,\n[취소] 누르면 이번 회차만 취소합니다."
      );
      cancelAll = choice;
    } else {
      if (!confirm("예약을 취소하시겠습니까?")) return;
    }
    const res = await fetch(`/api/reservations/${r.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cancelAll }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.show(data.error || "취소에 실패했습니다.", "error");
      return;
    }
    toast.show(cancelAll ? "반복 예약을 일괄 취소했습니다." : "예약을 취소했습니다.", "success");
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
    if (res.ok) {
      toast.show(action === "confirm" ? "경기를 승인했습니다." : "이의제기를 접수했습니다.", "success");
      setTick((t) => t + 1);
    } else {
      const data = await res.json().catch(() => ({}));
      toast.show(data.error || "처리에 실패했습니다.", "error");
    }
  }

  const today = new Date().toISOString().split("T")[0];
  const upcoming = reservations.filter((r) => r.status === "confirmed" && r.date >= today);
  const past     = reservations.filter((r) => r.status !== "confirmed" || r.date < today);

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h1 className="font-extrabold text-[20px]" style={{ letterSpacing: "-0.03em" }}>마이페이지</h1>
        <div className="flex gap-2">
          <Link
            href="/mypage/matches"
            className="btn btn-outline" style={{ fontSize: "12px" }}
          >
            경기 전적
          </Link>
          <Link
            href="/mypage/edit"
            className="btn btn-jade" style={{ fontSize: "12px" }}
          >
            내 정보 수정
          </Link>
        </div>
      </div>

      {/* ── 진행 중인 경기 배너 ── */}
      {activeMatch && (
        <Link
          href="/scoreboard"
          className="flex items-center gap-4 rounded-2xl px-5 py-4 animate-pulse-slow"
          style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)", border: "2px solid #38bdf8", display: "flex" }}
        >
          <div className="text-3xl">🏓</div>
          <div className="flex-1 min-w-0">
            <p className="font-extrabold text-[15px] text-white">경기 진행 중!</p>
            <p className="text-[12px] mt-0.5" style={{ color: "#7dd3fc" }}>
              vs {activeMatch.opponent.name}
              {activeMatch.reservation && ` · ${activeMatch.reservation.table.name} · ${activeMatch.reservation.startTime}~${activeMatch.reservation.endTime}`}
            </p>
          </div>
          <span className="font-bold text-[13px] px-3 py-1.5 rounded-full" style={{ background: "#38bdf8", color: "#0f172a" }}>
            스코어보드 →
          </span>
        </Link>
      )}

      {/* 팔로우 현황 */}
      {followCounts && (
        <Link href="/mypage/following" className="card p-4 flex items-center gap-6 hover:opacity-80 transition-opacity">
          <div className="text-center flex-1">
            <p className="text-[22px] font-extrabold" style={{ color: "var(--jade-700)" }}>{followCounts.followingCount}</p>
            <p className="text-[11px] mt-0.5" style={{ color: "var(--text-3)" }}>팔로잉</p>
          </div>
          <div className="w-px h-8" style={{ background: "var(--border)" }} />
          <div className="text-center flex-1">
            <p className="text-[22px] font-extrabold" style={{ color: "var(--jade-700)" }}>{followCounts.followerCount}</p>
            <p className="text-[11px] mt-0.5" style={{ color: "var(--text-3)" }}>팔로워</p>
          </div>
          <div className="w-px h-8" style={{ background: "var(--border)" }} />
          <div className="text-center flex-1 relative">
            <p className="text-[22px] font-extrabold" style={{ color: challenges.length > 0 ? "#7c3aed" : "var(--jade-700)" }}>
              {challenges.length}
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: "var(--text-3)" }}>경기 신청</p>
          </div>
        </Link>
      )}

      {/* ── 경기 챌린지 알림 ─────────────────────────────────── */}
      {!loading && challenges.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="font-bold text-[14px]" style={{ color: "var(--text-1)" }}>경기 신청</h2>
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {challenges.length}
            </span>
          </div>
          <div className="space-y-2">
            {challenges.map((c) => (
              <div
                key={c.id}
                className="card p-4"
                style={{ background: "linear-gradient(135deg, #fdf4ff 0%, #eff6ff 100%)", border: "1px solid #e9d5ff" }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold" style={{ color: "var(--text-1)" }}>
                      ⚔️ <span style={{ color: "#7c3aed" }}>{c.challenger.name}</span>님이 경기를 신청했습니다
                    </p>
                    <p className="text-[11px] mt-0.5" style={{ color: "var(--text-3)" }}>
                      ELO {c.challenger.eloRating}점 · {timeAgo(c.createdAt)}
                    </p>
                    {c.message && (
                      <p className="text-[12px] mt-1 italic" style={{ color: "var(--text-2)" }}>&quot;{c.message}&quot;</p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleChallengeAction(c.id, "accept")}
                      className="btn btn-jade"
                      style={{ fontSize: "12px" }}
                    >
                      수락
                    </button>
                    <button
                      onClick={() => handleChallengeAction(c.id, "reject")}
                      className="btn"
                      style={{ fontSize: "12px" }}
                    >
                      거절
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── 확인 대기 중인 경기 ─────────────────────────────── */}
      {!loading && pendingMatches.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="font-bold text-[14px]" style={{ color: "var(--text-1)" }}>경기 확인 요청</h2>
            <span className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {pendingMatches.length}
            </span>
          </div>
          <div className="rounded-2xl divide-y overflow-hidden" style={{ background: "#fff7ed", border: "1px solid #fed7aa" }}>
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
            {upcoming.map((r) => {
              const isToday = r.date === new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split("T")[0];
              return (
                <div key={r.id} className="bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-green-700 text-sm">{r.table.name}</span>
                      {(r.isRecurring || r.parentId) && (
                        <span className="ml-1.5 text-[10px] font-semibold bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full align-middle">반복</span>
                      )}
                      <span className="text-gray-400 mx-2">·</span>
                      <span className="text-sm text-gray-700">{formatDate(r.date)}</span>
                      <span className="text-gray-400 mx-2">·</span>
                      <span className="text-sm text-gray-700">{r.startTime} ~ {r.endTime}</span>
                    </div>
                    <button
                      onClick={() => handleCancel(r)}
                      className="text-xs text-red-400 hover:text-red-600 font-medium transition-colors ml-3"
                    >
                      취소
                    </button>
                  </div>
                  {isToday && r.checkInCode && (
                    <div className="mt-2 flex items-center gap-3">
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ background: "#f0fdf4", border: "1px solid #86efac" }}>
                        <span className="text-[11px] font-bold" style={{ color: "#166534" }}>체크인 코드</span>
                        <span className="text-[18px] font-mono font-extrabold tracking-widest" style={{ color: "#166534" }}>{r.checkInCode}</span>
                      </div>
                      <Link
                        href={`/reserve/session/${r.id}`}
                        className="px-3 py-1.5 rounded-xl text-[12px] font-bold"
                        style={{ background: "var(--jade-950)", color: "white" }}
                      >
                        경기 시작 →
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
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

      {/* ── 더블스 최근 기록 ─────────────────────────────────── */}
      {!loading && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="section-title">팀 더블스 최근 기록</h2>
            <Link href="/mypage/team-matches" className="text-xs text-green-700 font-semibold hover:underline">
              더 보기 →
            </Link>
          </div>
          {teamMatches.length === 0 ? (
            <div className="card p-5 text-center">
              <p className="text-sm text-gray-400">더블스 기록이 없습니다.</p>
              <Link href="/ranking/doubles" className="inline-block mt-2 text-sm text-green-700 font-semibold hover:underline">
                더블스 기록 입력 →
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {teamMatches.map((m) => {
                const myTeam = [m.team1Player1.id, m.team1Player2.id].includes(myId) ? 1 : 2;
                const iWon = m.winnerTeam === myTeam;
                const partner = myTeam === 1
                  ? (m.team1Player1.id === myId ? m.team1Player2 : m.team1Player1)
                  : (m.team2Player1.id === myId ? m.team2Player2 : m.team2Player1);
                const opp1 = myTeam === 1 ? m.team2Player1 : m.team1Player1;
                const opp2 = myTeam === 1 ? m.team2Player2 : m.team1Player2;
                return (
                  <div key={m.id} className="card px-4 py-3 flex items-center gap-3">
                    <div className={`w-1.5 h-10 rounded-full shrink-0 ${iWon ? "bg-blue-400" : "bg-red-300"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-800">
                        <span className="text-green-700">나</span>
                        <span className="text-gray-400"> &amp; </span>
                        <span>{partner.name}</span>
                        <span className="text-gray-400 mx-1.5">vs</span>
                        <span>{opp1.name}</span>
                        <span className="text-gray-400"> &amp; </span>
                        <span>{opp2.name}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`chip ${iWon ? "bg-blue-50 text-blue-600" : "bg-red-50 text-red-500"}`}>
                          {iWon ? "승" : "패"}
                        </span>
                        {m.t1Score !== null && m.t2Score !== null && (
                          <span className="text-xs text-gray-500 font-mono">
                            {myTeam === 1 ? m.t1Score : m.t2Score}-{myTeam === 1 ? m.t2Score : m.t1Score}
                          </span>
                        )}
                        <span className="text-xs text-gray-400">{timeAgo(m.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
