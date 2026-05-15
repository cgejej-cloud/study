"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import OpponentSuggestionCard, { type SuggestionPlayer } from "@/components/OpponentSuggestionCard";

type SuggestionsResponse = {
  me: { eloRating: number };
  similar:        SuggestionPlayer[];
  newOpponents:   SuggestionPlayer[];
  rivals:         SuggestionPlayer[];
  todayPlayers:   SuggestionPlayer[];
};

const SECTIONS: Array<{
  key: keyof Omit<SuggestionsResponse, "me">;
  title: string;
  emoji: string;
  badge: string;
  description: string;
  emptyHint: string;
  metaFor?: (p: SuggestionPlayer) => string | undefined;
}> = [
  {
    key: "todayPlayers",
    title: "오늘 함께 칠 사람",
    emoji: "📅",
    badge: "오늘 활동",
    description: "오늘/내일 예약이 있고 비슷한 실력대의 회원",
    emptyHint: "오늘 예약된 비슷한 실력의 회원이 없습니다.",
    metaFor: (p) => p._meta?.reservation as string | undefined,
  },
  {
    key: "similar",
    title: "비슷한 실력",
    emoji: "⚖️",
    badge: "박빙",
    description: "내 ELO 기준 ±100점 범위의 회원",
    emptyHint: "비슷한 실력대의 회원을 찾지 못했습니다.",
  },
  {
    key: "newOpponents",
    title: "새로운 도전",
    emoji: "✨",
    badge: "신규",
    description: "한 번도 경기한 적 없는 활발한 회원",
    emptyHint: "모든 회원과 한 번 이상 경기하셨습니다!",
  },
  {
    key: "rivals",
    title: "다시 만나기",
    emoji: "🔥",
    badge: "라이벌",
    description: "가장 자주 만난 상대 (재경기 추천)",
    emptyHint: "아직 자주 만난 상대가 없습니다.",
    metaFor: (p) => p._meta?.matches !== undefined ? `${p._meta.matches}경기` : undefined,
  },
];

export default function FindOpponentPage() {
  const router = useRouter();
  const [data, setData] = useState<SuggestionsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/players/suggestions")
      .then((r) => {
        if (r.status === 401) { router.push("/login?next=/match/find"); return null; }
        return r.ok ? r.json() : null;
      })
      .then((d: SuggestionsResponse | null) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4 animate-pulse">
        {[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-2xl" style={{ background: "var(--border)" }} />)}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-md mx-auto py-16 text-center text-[13px]" style={{ color: "var(--text-3)" }}>
        추천 정보를 불러올 수 없습니다.
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/mypage" className="text-gray-400 hover:text-gray-600 text-lg" aria-label="마이페이지로">←</Link>
        <h1 className="text-2xl font-bold text-gray-900">🎯 상대 찾기</h1>
      </div>

      <div className="card p-4 text-[12px]" style={{ background: "var(--jade-50)", color: "var(--jade-700)" }}>
        💡 내 ELO <b>{data.me.eloRating}점</b> 기준으로 추천된 상대입니다. 각 카드의 <b>⚔️ 경기</b> 버튼으로 예약을 시작할 수 있습니다.
      </div>

      {SECTIONS.map((section) => {
        const list = data[section.key];
        return (
          <section key={section.key} className="space-y-2">
            <div className="flex items-baseline gap-2">
              <h2 className="text-[15px] font-extrabold" style={{ color: "var(--text-1)" }}>
                {section.emoji} {section.title}
              </h2>
              <p className="text-[11px]" style={{ color: "var(--text-3)" }}>{section.description}</p>
            </div>
            {list.length === 0 ? (
              <div className="card p-4 text-center text-[12px]" style={{ color: "var(--text-3)" }}>
                {section.emptyHint}
              </div>
            ) : (
              <div className="space-y-2">
                {list.map((p) => (
                  <OpponentSuggestionCard
                    key={`${section.key}-${p.id}`}
                    player={p}
                    myElo={data.me.eloRating}
                    badge={section.badge}
                    metaText={section.metaFor?.(p)}
                  />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
