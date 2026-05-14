"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Player = { id: string; name: string; nickname?: string | null; avatar?: string | null; eloRating?: number };

type SetData = {
  id: string;
  setNumber: number;
  team1Score: number;
  team2Score: number;
  players?: { p1Id: string; p2Id: string; winnerId: string } | null;
  savedAt: string;
};

type GameSession = {
  id: string;
  matchType: string;
  config: Record<string, unknown>;
  status: string;
  sets: SetData[];
};

type ReservationData = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  checkInCode: string | null;
  isOwner: boolean;
  owner: Player;
  participants: Player[];
  gameSession: GameSession | null;
};

type KingConfig = {
  players: Array<{ id: string; name: string; elo: number }>;
  currentP1Idx: number;
  currentP2Idx: number;
  waitingIdx: number;
};

type SinglesConfig = { player1Id: string; player2Id: string };
type DoublesConfig = { team1: Array<{ id: string; name: string }>; team2: Array<{ id: string; name: string }> };

function displayName(p: Player) { return p.nickname || p.name; }

export default function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: reservationId } = use(params);
  const router = useRouter();
  const [data, setData] = useState<ReservationData | null>(null);
  const [session, setSession] = useState<GameSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [score1, setScore1] = useState("");
  const [score2, setScore2] = useState("");
  const [saving, setSaving] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [startingType, setStartingType] = useState<"singles" | "doubles" | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/reservations/${reservationId}/checkin`);
    if (res.status === 401) { router.push("/login"); return; }
    if (!res.ok) return;
    const d: ReservationData = await res.json();
    setData(d);
    setSession(d.gameSession);
    setLoading(false);
  }, [reservationId, router]);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  async function startSession(matchType: "singles" | "doubles") {
    setStarting(true);
    setError("");
    const res = await fetch("/api/game-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reservationId, matchType }),
    });
    const d = await res.json().catch(() => ({}));
    setStarting(false);
    if (!res.ok) { setError(d.error || "경기 시작에 실패했습니다."); return; }
    setSession(d);
    setStartingType(null);
  }

  async function saveSet() {
    if (!session) return;
    const s1 = parseInt(score1);
    const s2 = parseInt(score2);
    if (isNaN(s1) || isNaN(s2)) { setError("점수를 입력해주세요."); return; }
    setSaving(true);
    setError("");
    const res = await fetch(`/api/game-sessions/${session.id}/sets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ team1Score: s1, team2Score: s2 }),
    });
    const d = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) { setError(d.error || "점수 저장에 실패했습니다."); return; }
    setSession(d.session);
    setScore1(""); setScore2("");
  }

  async function finishGame() {
    if (!session || !confirm("경기를 종료하시겠습니까? Elo 점수가 반영됩니다.")) return;
    setFinishing(true);
    const res = await fetch(`/api/game-sessions/${session.id}/finish`, { method: "POST" });
    const d = await res.json().catch(() => ({}));
    setFinishing(false);
    if (!res.ok) { setError(d.error || "경기 종료에 실패했습니다."); return; }
    load();
  }

  if (loading) {
    return <div className="max-w-lg mx-auto mt-10 p-4 text-center text-[13px]" style={{ color: "var(--text-3)" }}>불러오는 중...</div>;
  }
  if (!data) {
    return <div className="max-w-lg mx-auto mt-10 p-4 text-center text-[13px]" style={{ color: "var(--text-3)" }}>예약을 찾을 수 없습니다.</div>;
  }

  const allPlayers = data.participants.length > 0
    ? data.participants
    : [data.owner];
  const isOwner = data.isOwner;
  const playerCount = allPlayers.length + (data.participants.some((p) => p.id === data.owner.id) ? 0 : 1);
  const mergedPlayers = data.participants.some((p) => p.id === data.owner.id)
    ? data.participants
    : [data.owner, ...data.participants];

  // 킹오브더힐 현재 점수 계산
  function kingStandings(gs: GameSession) {
    const cfg = gs.config as KingConfig;
    const wins: Record<string, number> = {};
    cfg.players.forEach((p) => { wins[p.id] = 0; });
    gs.sets.forEach((s) => {
      const sp = s.players;
      if (sp?.winnerId) wins[sp.winnerId] = (wins[sp.winnerId] || 0) + 1;
    });
    return cfg.players
      .map((p) => ({ ...p, wins: wins[p.id] || 0 }))
      .sort((a, b) => b.wins - a.wins);
  }

  function renderCurrentMatchup(gs: GameSession) {
    if (gs.matchType === "singles") {
      const cfg = gs.config as SinglesConfig;
      const p1 = mergedPlayers.find((p) => p.id === cfg.player1Id);
      const p2 = mergedPlayers.find((p) => p.id === cfg.player2Id);
      const t1Wins = gs.sets.filter((s) => s.team1Score > s.team2Score).length;
      const t2Wins = gs.sets.filter((s) => s.team2Score > s.team1Score).length;
      return (
        <div className="text-center">
          <div className="flex items-center justify-center gap-4 mb-2">
            <div>
              <div className="text-[15px] font-bold" style={{ color: "var(--jade-950)" }}>{p1 ? displayName(p1) : "팀1"}</div>
              <div className="text-[36px] font-extrabold mt-1" style={{ color: "var(--jade-700)" }}>{t1Wins}</div>
            </div>
            <div className="text-[18px] font-bold" style={{ color: "var(--text-3)" }}>:</div>
            <div>
              <div className="text-[15px] font-bold" style={{ color: "var(--jade-950)" }}>{p2 ? displayName(p2) : "팀2"}</div>
              <div className="text-[36px] font-extrabold mt-1" style={{ color: "var(--jade-700)" }}>{t2Wins}</div>
            </div>
          </div>
          <p className="text-[12px]" style={{ color: "var(--text-3)" }}>세트 승 기준</p>
        </div>
      );
    }

    if (gs.matchType === "doubles") {
      const cfg = gs.config as DoublesConfig;
      const t1Wins = gs.sets.filter((s) => s.team1Score > s.team2Score).length;
      const t2Wins = gs.sets.filter((s) => s.team2Score > s.team1Score).length;
      return (
        <div className="text-center">
          <div className="flex items-center justify-center gap-4 mb-2">
            <div>
              <div className="text-[13px] font-bold" style={{ color: "var(--jade-950)" }}>{cfg.team1.map((p) => p.name).join(" & ")}</div>
              <div className="text-[36px] font-extrabold mt-1" style={{ color: "var(--jade-700)" }}>{t1Wins}</div>
            </div>
            <div className="text-[18px] font-bold" style={{ color: "var(--text-3)" }}>:</div>
            <div>
              <div className="text-[13px] font-bold" style={{ color: "var(--jade-950)" }}>{cfg.team2.map((p) => p.name).join(" & ")}</div>
              <div className="text-[36px] font-extrabold mt-1" style={{ color: "var(--jade-700)" }}>{t2Wins}</div>
            </div>
          </div>
        </div>
      );
    }

    if (gs.matchType === "king") {
      const cfg = gs.config as KingConfig;
      const p1 = cfg.players[cfg.currentP1Idx];
      const p2 = cfg.players[cfg.currentP2Idx];
      const waiting = cfg.players[cfg.waitingIdx];
      const standings = kingStandings(gs);
      return (
        <div>
          <div className="text-center mb-3">
            <p className="text-[11px] font-bold mb-2" style={{ color: "var(--text-3)" }}>현재 세트</p>
            <div className="flex items-center justify-center gap-4">
              <span className="text-[15px] font-bold" style={{ color: "var(--jade-950)" }}>{p1.name}</span>
              <span className="text-[13px]" style={{ color: "var(--text-3)" }}>vs</span>
              <span className="text-[15px] font-bold" style={{ color: "var(--jade-950)" }}>{p2.name}</span>
            </div>
            <p className="text-[11px] mt-1" style={{ color: "var(--text-3)" }}>대기: {waiting.name}</p>
          </div>
          <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
            <p className="text-[11px] font-bold mb-2" style={{ color: "var(--text-3)" }}>순위</p>
            {standings.map((p, i) => (
              <div key={p.id} className="flex items-center justify-between text-[13px] py-0.5">
                <span>{i + 1}위 {p.name}</span>
                <span className="font-bold" style={{ color: "var(--jade-700)" }}>{p.wins}승</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  }

  const cardStyle = { border: "1px solid var(--border)", background: "white" };

  return (
    <div className="max-w-lg mx-auto px-4 pb-20 space-y-4">
      {/* 헤더 */}
      <div className="pt-6 pb-2">
        <Link href="/mypage" className="text-[12px] font-bold" style={{ color: "var(--jade-700)" }}>← 마이페이지</Link>
        <h1 className="font-extrabold text-[20px] mt-2" style={{ color: "var(--jade-950)", letterSpacing: "-0.02em" }}>
          경기 세션
        </h1>
        <p className="text-[12px] mt-0.5" style={{ color: "var(--text-3)" }}>
          {data.date} · {data.startTime}~{data.endTime}
        </p>
      </div>

      {error && (
        <div className="rounded-xl px-4 py-3 text-[12px]" style={{ background: "#fff1f2", border: "1px solid #fecdd3", color: "#be123c" }}>{error}</div>
      )}

      {/* 체크인 코드 (예약자만) */}
      {isOwner && data.checkInCode && (
        <div className="rounded-2xl p-4" style={{ background: "linear-gradient(135deg, #f0fdf4, #dcfce7)", border: "1px solid #86efac" }}>
          <p className="text-[11px] font-bold mb-1" style={{ color: "#166534" }}>체크인 코드 (참가자에게 공유)</p>
          <p className="text-[32px] font-mono font-extrabold tracking-[0.25em]" style={{ color: "#166534" }}>{data.checkInCode}</p>
        </div>
      )}

      {/* 참가자 목록 */}
      <div className="rounded-2xl p-4" style={cardStyle}>
        <p className="text-[12px] font-bold mb-3" style={{ color: "var(--text-2)" }}>참가자 ({mergedPlayers.length}명)</p>
        <div className="flex flex-wrap gap-2">
          {mergedPlayers.map((p) => (
            <div key={p.id} className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: "var(--jade-50)", border: "1px solid var(--jade-200)" }}>
              <span className="text-[13px] font-semibold" style={{ color: "var(--jade-900)" }}>{displayName(p)}</span>
              {p.id === data.owner.id && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "var(--jade-700)", color: "white" }}>예약자</span>}
            </div>
          ))}
        </div>

        {isOwner && !session && mergedPlayers.length < 2 && (
          <p className="text-[12px] mt-3" style={{ color: "var(--text-3)" }}>경기 시작을 위해 최소 1명이 더 체크인해야 합니다.</p>
        )}
      </div>

      {/* 세션 없음 → 경기 시작 버튼 (예약자만) */}
      {isOwner && !session && mergedPlayers.length >= 2 && (
        <div className="rounded-2xl p-4 space-y-3" style={cardStyle}>
          <p className="text-[13px] font-bold" style={{ color: "var(--text-1)" }}>경기 시작</p>

          {mergedPlayers.length === 2 && (
            <button onClick={() => startSession("singles")} disabled={starting}
              className="w-full py-3 rounded-xl font-bold text-[14px]" style={{ background: "var(--jade-950)", color: "white", opacity: starting ? 0.6 : 1 }}>
              {starting ? "시작 중..." : "단식 경기 시작"}
            </button>
          )}

          {mergedPlayers.length === 3 && (
            <button onClick={() => startSession("singles")} disabled={starting}
              className="w-full py-3 rounded-xl font-bold text-[14px]" style={{ background: "var(--jade-950)", color: "white", opacity: starting ? 0.6 : 1 }}>
              {starting ? "시작 중..." : "킹오브더힐 시작 (3명)"}
            </button>
          )}

          {mergedPlayers.length === 4 && (
            <div className="space-y-2">
              {startingType === null && (
                <>
                  <button onClick={() => setStartingType("singles")} className="w-full py-3 rounded-xl font-bold text-[14px]" style={{ background: "white", color: "var(--jade-950)", border: "2px solid var(--jade-950)" }}>
                    단식 (1:1 경기)
                  </button>
                  <button onClick={() => startSession("doubles")} disabled={starting} className="w-full py-3 rounded-xl font-bold text-[14px]" style={{ background: "var(--jade-950)", color: "white", opacity: starting ? 0.6 : 1 }}>
                    {starting ? "시작 중..." : "복식 (2:2 경기)"}
                  </button>
                </>
              )}
              {startingType === "singles" && (
                <>
                  <p className="text-[12px]" style={{ color: "var(--text-3)" }}>4명 단식: {mergedPlayers[0] ? displayName(mergedPlayers[0]) : "P1"} vs {mergedPlayers[1] ? displayName(mergedPlayers[1]) : "P2"}로 시작합니다.</p>
                  <button onClick={() => startSession("singles")} disabled={starting} className="w-full py-3 rounded-xl font-bold text-[14px]" style={{ background: "var(--jade-950)", color: "white", opacity: starting ? 0.6 : 1 }}>
                    {starting ? "시작 중..." : "단식 시작"}
                  </button>
                  <button onClick={() => setStartingType(null)} className="w-full py-2 rounded-xl text-[13px]" style={{ color: "var(--text-3)" }}>취소</button>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* 진행 중 세션 */}
      {session && (
        <>
          {/* 현재 스코어 */}
          <div className="rounded-2xl p-5" style={{ background: "linear-gradient(135deg, #0f172a, #1e3a5f)", border: "2px solid #38bdf8" }}>
            <p className="text-[11px] font-bold text-center mb-3" style={{ color: "#7dd3fc" }}>
              {session.status === "completed" ? "경기 종료" : "경기 진행 중"} · {session.matchType === "singles" ? "단식" : session.matchType === "doubles" ? "복식" : "킹오브더힐"}
            </p>
            <div style={{ color: "white" }}>{renderCurrentMatchup(session)}</div>
          </div>

          {/* 세트 기록 */}
          {session.sets.length > 0 && (
            <div className="rounded-2xl p-4" style={cardStyle}>
              <p className="text-[12px] font-bold mb-3" style={{ color: "var(--text-2)" }}>세트 기록</p>
              <div className="space-y-2">
                {session.sets.map((s) => {
                  const cfg = session.config;
                  let label1 = "팀1", label2 = "팀2";
                  if (session.matchType === "singles") {
                    const sc = cfg as SinglesConfig;
                    const p1 = mergedPlayers.find((p) => p.id === sc.player1Id);
                    const p2 = mergedPlayers.find((p) => p.id === sc.player2Id);
                    label1 = p1 ? displayName(p1) : "팀1";
                    label2 = p2 ? displayName(p2) : "팀2";
                  } else if (session.matchType === "doubles") {
                    const dc = cfg as DoublesConfig;
                    label1 = dc.team1.map((p) => p.name).join("/");
                    label2 = dc.team2.map((p) => p.name).join("/");
                  } else if (session.matchType === "king" && s.players) {
                    const kc = cfg as KingConfig;
                    const findName = (id: string) => kc.players.find((p) => p.id === id)?.name ?? id;
                    label1 = findName(s.players.p1Id);
                    label2 = findName(s.players.p2Id);
                  }
                  const w1 = s.team1Score > s.team2Score;
                  return (
                    <div key={s.id} className="flex items-center justify-between px-3 py-2 rounded-xl" style={{ background: "var(--surface-2)" }}>
                      <span className="text-[11px]" style={{ color: "var(--text-3)" }}>세트 {s.setNumber}</span>
                      <div className="flex items-center gap-3 text-[14px] font-bold">
                        <span style={{ color: w1 ? "var(--jade-700)" : "var(--text-2)" }}>{label1} {s.team1Score}</span>
                        <span style={{ color: "var(--text-3)" }}>:</span>
                        <span style={{ color: !w1 ? "var(--jade-700)" : "var(--text-2)" }}>{s.team2Score} {label2}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 점수 입력 (예약자 + 진행 중) */}
          {isOwner && session.status === "active" && (
            <div className="rounded-2xl p-4" style={cardStyle}>
              <p className="text-[13px] font-bold mb-3" style={{ color: "var(--text-1)" }}>세트 {session.sets.length + 1} 점수 입력</p>
              <div className="flex items-center gap-3">
                <input
                  type="number" min="0" max="99" value={score1}
                  onChange={(e) => setScore1(e.target.value)}
                  placeholder="0"
                  className="flex-1 text-center text-[24px] font-bold rounded-xl py-3 focus:outline-none"
                  style={{ border: "2px solid var(--border)", background: "white" }}
                />
                <span className="text-[18px] font-bold" style={{ color: "var(--text-3)" }}>:</span>
                <input
                  type="number" min="0" max="99" value={score2}
                  onChange={(e) => setScore2(e.target.value)}
                  placeholder="0"
                  className="flex-1 text-center text-[24px] font-bold rounded-xl py-3 focus:outline-none"
                  style={{ border: "2px solid var(--border)", background: "white" }}
                />
              </div>
              <button
                onClick={saveSet}
                disabled={saving || !score1 || !score2}
                className="w-full mt-3 py-3 rounded-xl font-bold text-[14px]"
                style={{ background: "var(--jade-700)", color: "white", opacity: saving || !score1 || !score2 ? 0.5 : 1 }}
              >
                {saving ? "저장 중..." : "세트 저장"}
              </button>
            </div>
          )}

          {/* 경기 종료 버튼 */}
          {isOwner && session.status === "active" && session.sets.length > 0 && (
            <button
              onClick={finishGame}
              disabled={finishing}
              className="w-full py-3 rounded-xl font-bold text-[14px]"
              style={{ background: "#dc2626", color: "white", opacity: finishing ? 0.6 : 1 }}
            >
              {finishing ? "종료 중..." : "경기 종료 (Elo 반영)"}
            </button>
          )}

          {session.status === "completed" && (
            <div className="rounded-2xl p-4 text-center" style={{ background: "#f0fdf4", border: "1px solid #86efac" }}>
              <p className="font-bold text-[15px]" style={{ color: "#166534" }}>🎉 경기 종료! Elo가 반영되었습니다.</p>
              <Link href="/scoreboard" className="inline-block mt-2 text-[13px] font-bold" style={{ color: "var(--jade-700)" }}>랭킹 확인 →</Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
