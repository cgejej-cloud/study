"use client";

import Link from "next/link";
import Avatar from "@/components/Avatar";

export type SuggestionPlayer = {
  id: string;
  name: string;
  nickname: string | null;
  avatar: string | null;
  profileColor: string | null;
  eloRating: number;
  _meta?: Record<string, string | number>;
};

type Props = {
  player: SuggestionPlayer;
  myElo?: number;
  /** "비슷한 실력" | "새 상대" | "라이벌" | "오늘 활동" 등 */
  badge?: string;
  /** _meta.matches / _meta.reservation 등 표시 텍스트 */
  metaText?: string;
};

export default function OpponentSuggestionCard({ player, myElo, badge, metaText }: Props) {
  const eloDiff = myElo !== undefined ? player.eloRating - myElo : null;
  const eloDiffText =
    eloDiff === null ? null
    : eloDiff === 0 ? "동일 실력"
    : eloDiff > 0 ? `+${eloDiff}점`
    : `${eloDiff}점`;

  return (
    <div className="card p-3 flex items-center gap-3">
      <Avatar
        name={player.nickname ?? player.name}
        size="sm"
        avatar={player.avatar ?? undefined}
        profileColor={player.profileColor ?? undefined}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Link
            href={`/players/${player.id}`}
            className="font-semibold text-[13px] truncate hover:underline"
            style={{ color: "var(--text-1)" }}
          >
            {player.nickname ?? player.name}
          </Link>
          {badge && (
            <span
              className="chip text-[10px] font-bold"
              style={{ background: "var(--jade-50)", color: "var(--jade-700)" }}
            >
              {badge}
            </span>
          )}
        </div>
        <p className="text-[11px] mt-0.5" style={{ color: "var(--text-3)" }}>
          {player.eloRating}점
          {eloDiffText && (
            <span className="ml-1.5" style={{ color: eloDiff && eloDiff > 0 ? "#2563eb" : eloDiff && eloDiff < 0 ? "#e11d48" : "var(--text-3)" }}>
              ({eloDiffText})
            </span>
          )}
          {metaText && (
            <span className="ml-1.5" style={{ color: "var(--text-3)" }}>· {metaText}</span>
          )}
        </p>
      </div>
      <Link
        href={`/match/new?opponent=${player.id}`}
        className="btn btn-jade text-[11px] shrink-0"
        aria-label={`${player.name}과 경기 예약`}
      >
        ⚔️ 경기
      </Link>
    </div>
  );
}
