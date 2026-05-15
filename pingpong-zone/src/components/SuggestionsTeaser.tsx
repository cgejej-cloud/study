"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import OpponentSuggestionCard, { type SuggestionPlayer } from "@/components/OpponentSuggestionCard";

type Response = {
  me: { eloRating: number };
  similar: SuggestionPlayer[];
  todayPlayers: SuggestionPlayer[];
};

// 홈 페이지 로그인 사용자에게 "오늘 함께 칠 사람" 또는 "비슷한 실력" 상위 3명 표시
export default function SuggestionsTeaser() {
  const [data, setData] = useState<Response | null>(null);
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(true);

  useEffect(() => {
    fetch("/api/players/suggestions")
      .then((r) => {
        if (r.status === 401) { setAuthed(false); return null; }
        return r.ok ? r.json() : null;
      })
      .then((d: Response | null) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (!authed || loading) return null;
  if (!data) return null;

  // 우선순위: 오늘 활동 → 비슷한 실력
  const list = data.todayPlayers.length > 0 ? data.todayPlayers : data.similar;
  const isToday = data.todayPlayers.length > 0;
  if (list.length === 0) return null;

  return (
    <section className="card p-4">
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <h2 className="font-extrabold text-[15px]" style={{ color: "var(--text-1)" }}>
            {isToday ? "📅 오늘 함께 칠 사람" : "⚖️ 비슷한 실력 추천"}
          </h2>
          <p className="text-[11px] mt-0.5" style={{ color: "var(--text-3)" }}>
            {isToday ? "오늘/내일 예약이 있는 비슷한 실력 회원" : `ELO ${data.me.eloRating}점 기준 추천`}
          </p>
        </div>
        <Link href="/match/find" className="text-[11px] font-bold" style={{ color: "var(--jade-700)" }}>
          전체 보기 →
        </Link>
      </div>
      <div className="space-y-2">
        {list.slice(0, 3).map((p) => (
          <OpponentSuggestionCard
            key={p.id}
            player={p}
            myElo={data.me.eloRating}
            badge={isToday ? "오늘 활동" : "박빙"}
            metaText={isToday ? (p._meta?.reservation as string | undefined) : undefined}
          />
        ))}
      </div>
    </section>
  );
}
