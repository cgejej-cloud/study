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
  if (m < 1) return "방금 전";
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
      <section className="bg-white border border-gray-100 rounded-xl shadow-sm p-6">
        <div className="h-5 w-32 bg-gray-100 rounded mb-3 animate-pulse" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-gray-50 rounded animate-pulse" />)}
        </div>
      </section>
    );
  }
  if (items.length === 0) return null;

  return (
    <section className="bg-white border border-gray-100 rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900">⚡ 최근 경기</h2>
        <Link href="/ranking" className="text-xs text-green-700 font-semibold hover:underline">
          전체 랭킹 →
        </Link>
      </div>
      <div className="space-y-2">
        {items.slice(0, 6).map((m) => (
          <div key={m.id} className="flex items-center gap-2 py-1.5 border-b last:border-b-0 border-gray-50">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <Avatar name={m.winner.name} size="xs" />
              <Link href={`/players/${m.winner.id}`} className="font-semibold text-sm text-gray-800 hover:text-green-700 truncate">
                {m.winner.name}
              </Link>
            </div>
            <span className="text-xs text-gray-400 shrink-0">
              {m.winnerScore !== null && m.loserScore !== null
                ? `${m.winnerScore}-${m.loserScore}`
                : "승"}
            </span>
            <div className="flex items-center gap-1.5 min-w-0 flex-1 justify-end">
              <Link href={`/players/${m.loser.id}`} className="text-sm text-gray-500 hover:text-green-700 truncate text-right">
                {m.loser.name}
              </Link>
              <Avatar name={m.loser.name} size="xs" className="opacity-60" />
            </div>
            <span className="text-[10px] text-gray-400 shrink-0 w-12 text-right">{timeAgo(m.confirmedAt)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
