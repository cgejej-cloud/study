"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";

type Player = {
  id: string;
  name: string;
  eloRating?: number;
};

type TournamentMatch = {
  id: string;
  round: number;
  position: number;
  player1: Player | null;
  player2: Player | null;
  winner: Player | null;
  p1Score: number | null;
  p2Score: number | null;
  status: string;
};

type TournamentPlayer = {
  id: string;
  seed: number | null;
  user: Player;
};

type Tournament = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  maxPlayers: number;
  createdAt: string;
  players: TournamentPlayer[];
  matches: TournamentMatch[];
};

const STATUS_LABEL: Record<string, string> = {
  open: "모집 중",
  active: "진행 중",
  finished: "종료",
};

const STATUS_CHIP: Record<string, string> = {
  open: "chip chip-jade",
  active: "chip chip-sun",
  finished: "chip chip-gray",
};

function groupByRound(matches: TournamentMatch[]): Map<number, TournamentMatch[]> {
  const map = new Map<number, TournamentMatch[]>();
  for (const m of matches) {
    if (!map.has(m.round)) map.set(m.round, []);
    map.get(m.round)!.push(m);
  }
  return map;
}

function getRoundLabel(round: number, totalRounds: number): string {
  const remaining = totalRounds - round + 1;
  if (remaining === 1) return "결승";
  if (remaining === 2) return "준결승";
  if (remaining === 3) return "8강";
  return `${round}라운드`;
}

function MatchCard({ match }: { match: TournamentMatch }) {
  const isBye = match.status === "bye";
  const isCompleted = match.status === "completed";

  return (
    <div
      className={`card-sm p-3 min-w-[160px] ${isBye ? "opacity-40" : ""}`}
      style={{ border: isCompleted ? "1.5px solid var(--jade-200)" : undefined }}
    >
      {isBye ? (
        <div className="text-xs text-[var(--text-3)] text-center py-2">부전승</div>
      ) : (
        <div className="space-y-1.5">
          <PlayerRow
            player={match.player1}
            score={match.p1Score}
            isWinner={match.winner?.id === match.player1?.id}
            isCompleted={isCompleted}
          />
          <div className="border-t border-[var(--border)]" />
          <PlayerRow
            player={match.player2}
            score={match.p2Score}
            isWinner={match.winner?.id === match.player2?.id}
            isCompleted={isCompleted}
          />
        </div>
      )}
    </div>
  );
}

function PlayerRow({
  player,
  score,
  isWinner,
  isCompleted,
}: {
  player: Player | null;
  score: number | null;
  isWinner: boolean;
  isCompleted: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-2 rounded px-1.5 py-0.5 ${
        isWinner && isCompleted ? "bg-[var(--jade-50)]" : ""
      }`}
    >
      <span
        className={`text-xs truncate max-w-[100px] ${
          player ? (isWinner && isCompleted ? "font-bold text-[var(--jade-700)]" : "text-[var(--text-1)]") : "text-[var(--text-3)] italic"
        }`}
      >
        {player ? player.name : "TBD"}
      </span>
      {isCompleted && score != null && (
        <span
          className={`text-xs font-bold shrink-0 ${
            isWinner ? "text-[var(--jade-700)]" : "text-[var(--text-3)]"
          }`}
        >
          {score}
        </span>
      )}
      {isWinner && isCompleted && (
        <span className="text-[10px] text-[var(--jade-600)] font-bold shrink-0">✓</span>
      )}
    </div>
  );
}

export default function TournamentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<{ id: string } | null>(null);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");

  async function loadTournament() {
    const res = await fetch(`/api/tournament/${id}`);
    if (res.ok) setTournament(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    loadTournament();
    fetch("/api/me").then((r) => r.ok ? r.json() : null).then((d) => setMe(d?.id ? d : null));
  }, [id]);

  const isJoined = me && tournament?.players.some((p) => p.user.id === me.id);

  async function handleJoin() {
    setJoining(true);
    setError("");
    const res = await fetch(`/api/tournament/${id}/join`, { method: "POST" });
    if (res.ok) {
      await loadTournament();
    } else {
      const d = await res.json();
      setError(d.error || "참가 실패");
    }
    setJoining(false);
  }

  async function handleLeave() {
    setJoining(true);
    setError("");
    const res = await fetch(`/api/tournament/${id}/join`, { method: "DELETE" });
    if (res.ok) {
      await loadTournament();
    } else {
      const d = await res.json();
      setError(d.error || "취소 실패");
    }
    setJoining(false);
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="skeleton h-8 w-48 mb-4 rounded-lg" />
        <div className="skeleton h-64 rounded-[18px]" />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 text-center text-[var(--text-3)]">
        토너먼트를 찾을 수 없습니다.
      </div>
    );
  }

  const byRound = groupByRound(tournament.matches);
  const rounds = Array.from(byRound.keys()).sort((a, b) => a - b);
  const totalRounds = rounds.length > 0 ? Math.max(...rounds) : 0;

  const winner = tournament.status === "finished"
    ? tournament.matches.find((m) => m.round === totalRounds && m.status === "completed")?.winner
    : null;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <button
        onClick={() => router.push("/tournament")}
        className="btn btn-ghost mb-4 text-xs"
      >
        ← 목록으로
      </button>

      <div className="flex items-start justify-between gap-4 mb-2">
        <h1 className="font-extrabold text-[22px]" style={{ letterSpacing: "-0.03em" }}>
          {tournament.name}
        </h1>
        <span className={STATUS_CHIP[tournament.status] ?? "chip chip-gray"}>
          {STATUS_LABEL[tournament.status] ?? tournament.status}
        </span>
      </div>
      {tournament.description && (
        <p className="text-[var(--text-3)] text-sm mb-4">{tournament.description}</p>
      )}

      {winner && (
        <div className="card p-6 mb-6 text-center animate-pop-in" style={{ background: "var(--jade-50)", border: "2px solid var(--jade-200)" }}>
          <div className="text-3xl mb-2">🏆</div>
          <div className="text-sm text-[var(--text-3)] mb-1">우승자</div>
          <div className="font-extrabold text-2xl text-[var(--jade-700)]">{winner.name}</div>
        </div>
      )}

      {tournament.status === "open" && (
        <div className="card p-5 mb-6">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <div className="font-bold text-sm mb-0.5">참가자 목록</div>
              <div className="text-xs text-[var(--text-3)]">
                {tournament.players.length} / {tournament.maxPlayers}명
              </div>
            </div>
            {me && (
              <div className="flex flex-col items-end gap-1">
                {isJoined ? (
                  <button
                    onClick={handleLeave}
                    disabled={joining}
                    className="btn btn-outline text-[var(--rose-500)]"
                    style={{ boxShadow: "0 0 0 1.5px #fecdd3" }}
                  >
                    {joining ? "처리 중..." : "참가 취소"}
                  </button>
                ) : tournament.players.length < tournament.maxPlayers ? (
                  <button
                    onClick={handleJoin}
                    disabled={joining}
                    className="btn btn-jade"
                  >
                    {joining ? "처리 중..." : "참가하기"}
                  </button>
                ) : (
                  <span className="chip chip-gray">정원 초과</span>
                )}
                {error && <p className="text-xs text-[var(--rose-500)]">{error}</p>}
              </div>
            )}
          </div>
          {tournament.players.length === 0 ? (
            <p className="text-xs text-[var(--text-3)]">아직 참가자가 없습니다.</p>
          ) : (
            <div className="space-y-1">
              {tournament.players.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm py-1.5 border-b border-[var(--border)] last:border-0">
                  <span className={p.user.id === me?.id ? "font-bold text-[var(--jade-700)]" : ""}>
                    {p.user.name}
                    {p.user.id === me?.id && " (나)"}
                  </span>
                  <span className="text-xs text-[var(--text-3)]">ELO {p.user.eloRating}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tournament.matches.length > 0 && (
        <div>
          <div className="font-bold text-sm mb-3">브라켓</div>
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-6 min-w-max">
              {rounds.map((round) => {
                const roundMatches = byRound.get(round) ?? [];
                return (
                  <div key={round} className="flex flex-col gap-3">
                    <div className="text-xs font-bold text-[var(--text-3)] text-center mb-1">
                      {getRoundLabel(round, totalRounds)}
                    </div>
                    <div className="flex flex-col gap-4 justify-around flex-1">
                      {roundMatches.map((m) => (
                        <MatchCard key={m.id} match={m} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
