"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import Avatar from "@/components/Avatar";

type SideUser = {
  id: string;
  name: string;
  nickname: string | null;
  avatar: string | null;
  profileColor: string | null;
  eloRating: number;
};

type SetRow = { setNumber: number; team1Score: number; team2Score: number; savedAt?: string };

type SessionData = {
  id: string;
  matchType: string;
  status: string;
  tableName: string;
  startedAt: string;
  team1: SideUser[];
  team2: SideUser[];
  team1Sets: number;
  team2Sets: number;
  sets: SetRow[];
};

const TYPE_LABEL: Record<string, string> = {
  singles: "단식",
  doubles: "복식",
  king: "킹오브더힐",
};

function PlayerStack({ users, side }: { users: SideUser[]; side: "left" | "right" }) {
  const color = side === "left" ? "#60a5fa" : "#f87171";
  return (
    <div className={`flex flex-col gap-3 ${side === "right" ? "items-end" : "items-start"}`}>
      {users.map((u) => (
        <div key={u.id} className={`flex items-center gap-3 ${side === "right" ? "flex-row-reverse" : ""}`}>
          <Avatar
            name={u.nickname ?? u.name}
            size="md"
            avatar={u.avatar ?? undefined}
            profileColor={u.profileColor ?? undefined}
          />
          <div className={side === "right" ? "text-right" : ""}>
            <p className="font-extrabold text-[20px] sm:text-[26px]" style={{ color, letterSpacing: "-0.02em" }}>
              {u.nickname ?? u.name}
            </p>
            <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.5)" }}>
              {u.eloRating}점
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function SpectatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<SessionData | null>(null);
  const [live, setLive] = useState({ team1Sets: 0, team2Sets: 0, sets: [] as SetRow[], status: "active" });
  const [error, setError] = useState("");

  // 초기 로드
  useEffect(() => {
    fetch(`/api/spectate/${id}`)
      .then((r) => {
        if (!r.ok) { setError("세션을 찾을 수 없습니다."); return null; }
        return r.json();
      })
      .then((d: SessionData | null) => {
        if (!d) return;
        setData(d);
        setLive({ team1Sets: d.team1Sets, team2Sets: d.team2Sets, sets: d.sets, status: d.status });
      })
      .catch(() => setError("데이터를 불러올 수 없습니다."));
  }, [id]);

  // SSE 라이브 업데이트 — 끊기면 5초 후 재연결
  useEffect(() => {
    let es: EventSource | null = null;
    let retryT: ReturnType<typeof setTimeout> | null = null;
    let stopped = false;

    function connect() {
      es = new EventSource(`/api/spectate/${id}/stream`);
      es.addEventListener("update", (e: MessageEvent) => {
        try {
          const d = JSON.parse(e.data) as {
            team1Sets: number; team2Sets: number;
            sets: SetRow[]; status: string;
          };
          setLive({ team1Sets: d.team1Sets, team2Sets: d.team2Sets, sets: d.sets, status: d.status });
        } catch {}
      });
      es.addEventListener("end", () => { es?.close(); });
      es.onerror = () => {
        es?.close();
        if (!stopped) retryT = setTimeout(connect, 5000);
      };
    }
    connect();
    return () => { stopped = true; es?.close(); if (retryT) clearTimeout(retryT); };
  }, [id]);

  if (error) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-3 text-center px-6" style={{ background: "#0f172a", color: "white" }}>
        <p className="text-[16px] font-bold">{error}</p>
        <Link href="/spectate" className="px-5 py-2 rounded-xl text-[13px]" style={{ background: "#334155" }}>
          ← 라이브 목록으로
        </Link>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: "#0f172a" }}>
        <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin" />
      </div>
    );
  }

  const lastSet = live.sets[live.sets.length - 1];

  return (
    <div className="fixed inset-0 flex flex-col select-none" style={{ background: "#0f172a", color: "white", zIndex: 50 }}>
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ background: "#1e293b", borderBottom: "1px solid #334155" }}>
        <div className="flex items-center gap-2">
          <Link href="/spectate" className="text-[12px] px-2 py-1 rounded" style={{ background: "#334155", color: "#94a3b8" }}>
            ← 목록
          </Link>
          <span className="chip text-[10.5px] font-bold" style={{ background: "rgba(239,68,68,0.15)", color: "#f87171" }}>
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 mr-1 animate-pulse" />
            LIVE
          </span>
          <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.5)" }}>
            {TYPE_LABEL[data.matchType] ?? data.matchType} · {data.tableName}
          </span>
        </div>
        {live.status === "completed" && (
          <span className="chip text-[10.5px] font-bold" style={{ background: "#16a34a", color: "white" }}>
            ✅ 종료
          </span>
        )}
      </div>

      {/* 메인 보드 */}
      <div className="flex-1 grid grid-cols-[1fr_auto_1fr] items-center px-6 py-8 gap-4 overflow-auto">
        <PlayerStack users={data.team1} side="left" />

        <div className="flex flex-col items-center gap-3 px-4">
          <div className="flex items-center gap-3">
            <span className="font-extrabold text-[clamp(60px,12vw,140px)] tabular-nums" style={{ color: "#60a5fa", lineHeight: 1 }}>
              {live.team1Sets}
            </span>
            <span className="text-[40px] font-light" style={{ color: "rgba(255,255,255,0.3)" }}>:</span>
            <span className="font-extrabold text-[clamp(60px,12vw,140px)] tabular-nums" style={{ color: "#f87171", lineHeight: 1 }}>
              {live.team2Sets}
            </span>
          </div>
          <p className="text-[11px] uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.4)" }}>
            세트 SCORE
          </p>
          {lastSet && (
            <p className="text-[14px] font-mono" style={{ color: "rgba(255,255,255,0.7)" }}>
              {live.sets.length}세트 진행 · {lastSet.team1Score} - {lastSet.team2Score}
            </p>
          )}
        </div>

        <PlayerStack users={data.team2} side="right" />
      </div>

      {/* 세트 이력 */}
      {live.sets.length > 0 && (
        <div className="shrink-0 px-4 py-3 flex flex-wrap gap-2 justify-center" style={{ background: "#1e293b", borderTop: "1px solid #334155" }}>
          {live.sets.map((s) => (
            <span
              key={s.setNumber}
              className="text-[12px] font-mono px-3 py-1 rounded-full"
              style={{ background: "#0f172a", color: s.team1Score > s.team2Score ? "#93c5fd" : "#fca5a5" }}
            >
              {s.setNumber}세트 {s.team1Score}-{s.team2Score}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
