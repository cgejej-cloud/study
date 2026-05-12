"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Player = {
  id: string;
  name: string;
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
  playerCount?: number;
  players?: TournamentPlayer[];
  matches?: TournamentMatch[];
};

type MatchResultForm = {
  winnerId: string;
  p1Score: string;
  p2Score: string;
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

function TournamentCard({
  tournament,
  onRefresh,
}: {
  tournament: Tournament;
  onRefresh: () => void;
}) {
  const router = useRouter();
  const [detail, setDetail] = useState<Tournament | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [matchForms, setMatchForms] = useState<Record<string, MatchResultForm>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function loadDetail() {
    const res = await fetch(`/api/tournament/${tournament.id}`);
    if (res.ok) setDetail(await res.json());
  }

  useEffect(() => {
    if (expanded) loadDetail();
  }, [expanded, tournament.id]);

  async function handleStart() {
    if (!confirm("토너먼트를 시작하시겠습니까?")) return;
    setError("");
    const res = await fetch(`/api/tournament/${tournament.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "start" }),
    });
    if (res.ok) {
      onRefresh();
      await loadDetail();
    } else {
      const d = await res.json();
      setError(d.error || "시작 실패");
    }
  }

  async function handleFinish() {
    if (!confirm("토너먼트를 강제 종료하시겠습니까?")) return;
    setError("");
    const res = await fetch(`/api/tournament/${tournament.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "finish" }),
    });
    if (res.ok) {
      onRefresh();
      await loadDetail();
    } else {
      const d = await res.json();
      setError(d.error || "종료 실패");
    }
  }

  async function handleMatchResult(matchId: string) {
    const form = matchForms[matchId];
    if (!form?.winnerId) {
      setError("승자를 선택해주세요.");
      return;
    }
    setSubmitting(matchId);
    setError("");
    const res = await fetch(`/api/tournament/${tournament.id}/matches/${matchId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        winnerId: form.winnerId,
        p1Score: form.p1Score !== "" ? Number(form.p1Score) : null,
        p2Score: form.p2Score !== "" ? Number(form.p2Score) : null,
      }),
    });
    if (res.ok) {
      onRefresh();
      await loadDetail();
    } else {
      const d = await res.json();
      setError(d.error || "결과 저장 실패");
    }
    setSubmitting(null);
  }

  function setForm(matchId: string, patch: Partial<MatchResultForm>) {
    setMatchForms((prev) => ({
      ...prev,
      [matchId]: { ...(prev[matchId] ?? { winnerId: "", p1Score: "", p2Score: "" }), ...patch },
    }));
  }

  const rounds = detail?.matches ? Array.from(groupByRound(detail.matches).keys()).sort((a, b) => a - b) : [];
  const totalRounds = rounds.length > 0 ? Math.max(...rounds) : 0;
  const byRound = detail?.matches ? groupByRound(detail.matches) : new Map<number, TournamentMatch[]>();

  const winner = tournament.status === "finished" && detail?.matches
    ? detail.matches.find((m) => m.round === totalRounds && m.status === "completed")?.winner
    : null;

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-[15px] truncate">{tournament.name}</span>
            <span className={STATUS_CHIP[tournament.status] ?? "chip chip-gray"}>
              {STATUS_LABEL[tournament.status] ?? tournament.status}
            </span>
          </div>
          {tournament.description && (
            <p className="text-xs text-[var(--text-3)] truncate">{tournament.description}</p>
          )}
          <p className="text-xs text-[var(--text-3)] mt-1">
            참가자 {tournament.playerCount ?? 0} / {tournament.maxPlayers}명
          </p>
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          <Link
            href={`/tournament/${tournament.id}`}
            className="btn btn-ghost text-xs"
          >
            공개 보기
          </Link>
          {tournament.status === "open" && (
            <button
              onClick={handleStart}
              disabled={(tournament.playerCount ?? 0) < 2}
              className="btn btn-jade text-xs disabled:opacity-40"
            >
              토너먼트 시작
            </button>
          )}
          {tournament.status === "active" && (
            <button
              onClick={handleFinish}
              className="btn btn-outline text-xs"
            >
              강제 종료
            </button>
          )}
        </div>
      </div>

      {error && <p className="text-xs text-[var(--rose-500)] mb-2">{error}</p>}

      {tournament.status === "finished" && winner && (
        <div className="rounded-xl p-3 mb-3 text-center" style={{ background: "var(--jade-50)", border: "1.5px solid var(--jade-200)" }}>
          <span className="text-xs text-[var(--text-3)]">우승자 </span>
          <span className="font-extrabold text-[var(--jade-700)]">🏆 {winner.name}</span>
        </div>
      )}

      {(tournament.status === "active" || tournament.status === "finished") && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="btn btn-ghost text-xs w-full"
        >
          {expanded ? "브라켓 닫기 ▲" : "브라켓 / 결과 입력 ▼"}
        </button>
      )}

      {expanded && detail && (
        <div className="mt-4 overflow-x-auto">
          <div className="flex gap-6 min-w-max">
            {rounds.map((round) => {
              const rMatches = byRound.get(round) ?? [];
              return (
                <div key={round} className="flex flex-col gap-3 min-w-[200px]">
                  <div className="text-xs font-bold text-[var(--text-3)] text-center">
                    {totalRounds - round + 1 === 1 ? "결승" : totalRounds - round + 1 === 2 ? "준결승" : `${round}라운드`}
                  </div>
                  {rMatches.map((m) => {
                    const form = matchForms[m.id] ?? { winnerId: "", p1Score: "", p2Score: "" };
                    const isPending = m.status === "pending";
                    const isCompleted = m.status === "completed";
                    const isBye = m.status === "bye";

                    return (
                      <div
                        key={m.id}
                        className={`card-sm p-3 ${isBye ? "opacity-40" : ""}`}
                        style={isCompleted ? { border: "1.5px solid var(--jade-200)" } : undefined}
                      >
                        {isBye ? (
                          <div className="text-xs text-[var(--text-3)] text-center py-1">부전승 — {m.winner?.name ?? "TBD"}</div>
                        ) : (
                          <div>
                            <div className="text-xs font-semibold mb-1">
                              {m.player1?.name ?? "TBD"} vs {m.player2?.name ?? "TBD"}
                            </div>
                            {isCompleted ? (
                              <div className="text-xs text-[var(--jade-700)] font-bold">
                                승자: {m.winner?.name}
                                {m.p1Score != null && m.p2Score != null && ` (${m.p1Score} : ${m.p2Score})`}
                              </div>
                            ) : isPending && m.player1 && m.player2 ? (
                              <div className="space-y-2 mt-2">
                                <select
                                  value={form.winnerId}
                                  onChange={(e) => setForm(m.id, { winnerId: e.target.value })}
                                  className="w-full text-xs border border-[var(--border)] rounded-lg px-2 py-1.5 bg-white"
                                >
                                  <option value="">승자 선택</option>
                                  {m.player1 && <option value={m.player1.id}>{m.player1.name}</option>}
                                  {m.player2 && <option value={m.player2.id}>{m.player2.name}</option>}
                                </select>
                                <div className="flex gap-1">
                                  <input
                                    type="number"
                                    placeholder={`${m.player1?.name?.slice(0, 3) ?? "P1"} 점수`}
                                    value={form.p1Score}
                                    onChange={(e) => setForm(m.id, { p1Score: e.target.value })}
                                    className="w-full text-xs border border-[var(--border)] rounded-lg px-2 py-1.5"
                                    min={0}
                                  />
                                  <input
                                    type="number"
                                    placeholder={`${m.player2?.name?.slice(0, 3) ?? "P2"} 점수`}
                                    value={form.p2Score}
                                    onChange={(e) => setForm(m.id, { p2Score: e.target.value })}
                                    className="w-full text-xs border border-[var(--border)] rounded-lg px-2 py-1.5"
                                    min={0}
                                  />
                                </div>
                                <button
                                  onClick={() => handleMatchResult(m.id)}
                                  disabled={submitting === m.id}
                                  className="btn btn-jade w-full text-xs"
                                >
                                  {submitting === m.id ? "저장 중..." : "결과 저장"}
                                </button>
                              </div>
                            ) : (
                              <div className="text-xs text-[var(--text-3)] mt-1">대기 중</div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminTournamentPage() {
  const router = useRouter();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [maxPlayers, setMaxPlayers] = useState("8");
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState("");

  async function loadAll() {
    setLoading(true);
    const res = await fetch("/api/tournament");
    if (res.status === 401 || res.status === 403) {
      router.push("/");
      return;
    }
    if (res.ok) setTournaments(await res.json());
    setLoading(false);
  }

  useEffect(() => { loadAll(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setFormError("이름을 입력해주세요."); return; }
    setCreating(true);
    setFormError("");
    const res = await fetch("/api/tournament", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined, maxPlayers: Number(maxPlayers) }),
    });
    if (res.ok) {
      setName("");
      setDescription("");
      setMaxPlayers("8");
      await loadAll();
    } else {
      const d = await res.json();
      setFormError(d.error || "생성 실패");
    }
    setCreating(false);
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <h1 className="font-extrabold text-[22px] mb-6" style={{ letterSpacing: "-0.03em" }}>🏆 토너먼트 관리</h1>

      <div className="card p-5 mb-8">
        <div className="font-bold text-sm mb-3">새 토너먼트 생성</div>
        <form onSubmit={handleCreate} className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-[var(--text-2)] block mb-1">이름 *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="토너먼트 이름"
              className="w-full border border-[var(--border)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[var(--jade-400)]"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--text-2)] block mb-1">설명</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="선택 사항"
              className="w-full border border-[var(--border)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[var(--jade-400)]"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--text-2)] block mb-1">최대 인원</label>
            <select
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(e.target.value)}
              className="border border-[var(--border)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[var(--jade-400)]"
            >
              {[2, 4, 8, 16, 32].map((n) => (
                <option key={n} value={n}>{n}명</option>
              ))}
            </select>
          </div>
          {formError && <p className="text-xs text-[var(--rose-500)]">{formError}</p>}
          <button type="submit" disabled={creating} className="btn btn-jade">
            {creating ? "생성 중..." : "토너먼트 생성"}
          </button>
        </form>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <div key={i} className="skeleton h-24 rounded-[18px]" />)}
        </div>
      ) : tournaments.length === 0 ? (
        <div className="card p-10 text-center text-[var(--text-3)]">토너먼트가 없습니다.</div>
      ) : (
        <div className="space-y-4">
          {tournaments.map((t) => (
            <TournamentCard key={t.id} tournament={t} onRefresh={loadAll} />
          ))}
        </div>
      )}
    </div>
  );
}
