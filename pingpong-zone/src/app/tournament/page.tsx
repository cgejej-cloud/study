"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Tournament = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  maxPlayers: number;
  createdAt: string;
  playerCount: number;
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

const TAB_STATUSES = ["all", "open", "active", "finished"] as const;
type TabStatus = (typeof TAB_STATUSES)[number];

const TAB_LABEL: Record<TabStatus, string> = {
  all: "전체",
  open: "모집 중",
  active: "진행 중",
  finished: "종료",
};

export default function TournamentPage() {
  const router = useRouter();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabStatus>("all");
  const [myIds, setMyIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await fetch("/api/tournament");
      if (res.ok) {
        const data = await res.json();
        setTournaments(data);
      }
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    async function loadMe() {
      const res = await fetch("/api/me");
      if (!res.ok) return;
      const me = await res.json();
      if (!me?.id) return;
      const res2 = await fetch("/api/tournament");
      if (!res2.ok) return;
      const all: Tournament[] = await res2.json();
      const joined = new Set<string>();
      await Promise.all(
        all.map(async (t) => {
          const r = await fetch(`/api/tournament/${t.id}`);
          if (!r.ok) return;
          const d = await r.json();
          if (d.players?.some((p: { user: { id: string } }) => p.user.id === me.id)) {
            joined.add(t.id);
          }
        })
      );
      setMyIds(joined);
    }
    loadMe();
  }, []);

  const filtered = tab === "all" ? tournaments : tournaments.filter((t) => t.status === tab);

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="font-extrabold text-[22px] mb-1" style={{ letterSpacing: "-0.03em" }}>
        🏆 토너먼트
      </h1>
      <p className="text-[var(--text-3)] text-sm mb-6">탁구 토너먼트에 참가해보세요</p>

      <div className="flex gap-2 mb-6">
        {TAB_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setTab(s)}
            className={`btn ${tab === s ? "btn-jade" : "btn-ghost"}`}
          >
            {TAB_LABEL[s]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-24 rounded-[18px]" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-10 text-center text-[var(--text-3)]">
          토너먼트가 없습니다.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((t) => (
            <button
              key={t.id}
              onClick={() => router.push(`/tournament/${t.id}`)}
              className="card w-full p-5 text-left hover:opacity-90 transition-opacity flex flex-col gap-2"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-[15px] text-[var(--text-1)] truncate">{t.name}</span>
                    {myIds.has(t.id) && (
                      <span className="chip chip-sky shrink-0">참가 중</span>
                    )}
                  </div>
                  {t.description && (
                    <p className="text-[var(--text-3)] text-xs truncate">{t.description}</p>
                  )}
                </div>
                <span className={STATUS_CHIP[t.status] ?? "chip chip-gray"}>
                  {STATUS_LABEL[t.status] ?? t.status}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-[var(--text-3)]">
                <span>참가자 {t.playerCount} / {t.maxPlayers}</span>
                <span>·</span>
                <span>{new Date(t.createdAt).toLocaleDateString("ko-KR")}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
