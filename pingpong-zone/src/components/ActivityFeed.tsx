"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Avatar from "@/components/Avatar";

type Item = {
  id: string;
  winner: { id: string; name: string };
  loser:  { id: string; name: string };
  winnerScore: number | null;
  loserScore:  number | null;
  confirmedAt: string;
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "방금";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

export default function ActivityFeed() {
  const [items, setItems] = useState<Item[] | null>(null);

  useEffect(() => {
    fetch("/api/activity")
      .then((r) => r.ok ? r.json() : [])
      .then((d) => setItems(Array.isArray(d) ? d : []))
      .catch(() => setItems([]));
  }, []);

  if (items === null) {
    return (
      <div className="card p-4 space-y-2">
        <div className="skeleton h-4 w-24 mb-3" />
        {[1, 2, 3].map((i) => <div key={i} className="skeleton h-10 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="section-title">⚡ 최근 경기</p>
        <Link href="/ranking" className="text-[12px] font-semibold" style={{ color: "var(--jade-600)" }}>
          전체 랭킹 →
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-3xl mb-2">🏓</p>
          <p className="text-[13px]" style={{ color: "var(--text-3)" }}>아직 기록된 경기가 없습니다.</p>
          <Link href="/ranking/record" className="inline-block mt-2 text-[13px] font-semibold" style={{ color: "var(--jade-600)" }}>
            첫 경기 기록하기 →
          </Link>
        </div>
      ) : (
        <div className="space-y-1.5">
          {items.slice(0, 6).map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
              style={{ background: "var(--jade-50)" }}
            >
              {/* 승자 */}
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <Avatar name={m.winner.name} size="xs" />
                <Link href={`/players/${m.winner.id}`} className="font-bold text-[13px] truncate hover:underline" style={{ color: "var(--text-1)" }}>
                  {m.winner.name}
                </Link>
              </div>

              {/* 스코어 */}
              <div
                className="shrink-0 px-2.5 py-0.5 rounded-full text-[11px] font-bold"
                style={{ background: "var(--jade-100)", color: "var(--jade-800)" }}
              >
                {m.winnerScore !== null && m.loserScore !== null
                  ? `${m.winnerScore} : ${m.loserScore}`
                  : "승"}
              </div>

              {/* 패자 */}
              <div className="flex items-center gap-1.5 min-w-0 flex-1 justify-end">
                <Link href={`/players/${m.loser.id}`} className="text-[13px] truncate text-right hover:underline" style={{ color: "var(--text-3)" }}>
                  {m.loser.name}
                </Link>
                <Avatar name={m.loser.name} size="xs" className="opacity-50" />
              </div>

              {/* 시간 */}
              <span className="text-[11px] shrink-0 w-10 text-right" style={{ color: "var(--muted)" }}>
                {timeAgo(m.confirmedAt)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
