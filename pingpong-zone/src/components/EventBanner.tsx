"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Event = {
  id: string;
  name: string;
  type: string;
  config: Record<string, unknown>;
};

const TYPE_ICON: Record<string, string> = {
  elo_multiplier: "⚡",
  bonus_elo_win: "🎁",
  bonus_elo_streak: "🔥",
  double_placement: "🚀",
  elo_floor_boost: "🛡️",
};

function effectSummary(type: string, config: Record<string, unknown>): string {
  if (type === "elo_multiplier") return `경기 기록하면 ELO ${config.multiplier}배!`;
  if (type === "bonus_elo_win") return `승리 시 +${config.bonus} 보너스 ELO!`;
  if (type === "bonus_elo_streak") return `${config.streak}연승 달성 시 +${config.bonus} 보너스 ELO!`;
  if (type === "double_placement") return "배치 게임 K값 2배로 빠른 랭킹 정착!";
  if (type === "elo_floor_boost") return `ELO 하한선이 ${config.floor}으로 상승!`;
  return "특별 이벤트 진행 중!";
}

export default function EventBanner() {
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    fetch("/api/events")
      .then((r) => r.json())
      .then((d) => setEvents(Array.isArray(d.active) ? d.active : []))
      .catch(() => {});
  }, []);

  if (events.length === 0) return null;

  const event = events[0];
  const icon = TYPE_ICON[event.type] ?? "🎉";

  return (
    <Link
      href="/events"
      className="block rounded-2xl px-5 py-3 text-white transition-opacity hover:opacity-90"
      style={{ background: "linear-gradient(90deg, var(--jade-800) 0%, var(--jade-600) 100%)" }}
    >
      <div className="flex items-center gap-2.5">
        <span className="text-xl leading-none animate-pulse">{icon}</span>
        <div className="flex-1 min-w-0">
          <span className="font-bold text-[13px]">{event.name} 진행 중! </span>
          <span className="text-[12px] opacity-80">{effectSummary(event.type, event.config)}</span>
        </div>
        <span className="text-[11px] opacity-60 shrink-0">자세히 →</span>
      </div>
    </Link>
  );
}
