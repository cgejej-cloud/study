"use client";

import { useEffect, useState } from "react";

type Event = {
  id: string;
  name: string;
  description: string | null;
  type: string;
  config: Record<string, unknown>;
  startDate: string;
  endDate: string;
  isActive: boolean;
};

const TYPE_ICON: Record<string, string> = {
  elo_multiplier: "⚡",
  bonus_elo_win: "🎁",
  bonus_elo_streak: "🔥",
  double_placement: "🚀",
  elo_floor_boost: "🛡️",
};

const TYPE_LABEL: Record<string, string> = {
  elo_multiplier: "ELO 배율",
  bonus_elo_win: "승리 보너스",
  bonus_elo_streak: "연승 보너스",
  double_placement: "배치 K값 2배",
  elo_floor_boost: "하한선 상승",
};

function effectDescription(type: string, config: Record<string, unknown>): string {
  if (type === "elo_multiplier") return `ELO 획득량 ${config.multiplier}배 적용`;
  if (type === "bonus_elo_win") return `승리 시 +${config.bonus} 보너스 ELO`;
  if (type === "bonus_elo_streak") return `${config.streak}연승 달성 시 +${config.bonus} 보너스 ELO`;
  if (type === "double_placement") return "배치 게임 K값 2배 (더 빠른 랭킹 정착)";
  if (type === "elo_floor_boost") return `ELO 하한선 ${config.floor}로 일시 상승`;
  return "";
}

function dDay(endDate: string): string {
  const now = new Date();
  const end = new Date(endDate);
  const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diff <= 0) return "종료됨";
  return `D-${diff}`;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("ko-KR", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function EventCard({ event, isActive }: { event: Event; isActive: boolean }) {
  const icon = TYPE_ICON[event.type] ?? "🎉";
  return (
    <div className={`card p-5 flex flex-col gap-3 ${isActive ? "ring-2 ring-green-500/40 bg-green-50/30" : ""}`}>
      <div className="flex items-start gap-3">
        <span className="text-3xl leading-none">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-extrabold text-[15px]" style={{ color: "var(--text-1)" }}>{event.name}</span>
            {isActive && (
              <span className="chip-jade text-[10px] font-bold px-2 py-0.5 rounded-full">진행 중</span>
            )}
            <span className="text-[11px] font-semibold text-gray-400 ml-auto">{dDay(event.endDate)}</span>
          </div>
          <div className="text-[12px] mt-0.5" style={{ color: "var(--text-3)" }}>
            {TYPE_LABEL[event.type]}
          </div>
        </div>
      </div>

      {event.description && (
        <p className="text-[13px]" style={{ color: "var(--text-2)" }}>{event.description}</p>
      )}

      <div className="rounded-xl px-3 py-2 text-[12px] font-semibold" style={{ background: "var(--jade-50)", color: "var(--jade-800)" }}>
        {effectDescription(event.type, event.config)}
      </div>

      <div className="flex items-center gap-1 text-[11px]" style={{ color: "var(--text-3)" }}>
        <span>{formatDate(event.startDate)}</span>
        <span>~</span>
        <span>{formatDate(event.endDate)}</span>
      </div>
    </div>
  );
}

export default function EventsPage() {
  const [active, setActive] = useState<Event[]>([]);
  const [upcoming, setUpcoming] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/events")
      .then((r) => r.json())
      .then((d) => {
        setActive(Array.isArray(d.active) ? d.active : []);
        setUpcoming(Array.isArray(d.upcoming) ? d.upcoming : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-extrabold text-[22px]" style={{ letterSpacing: "-0.03em" }}>⚡ 이벤트</h1>
        <p className="text-[13px] mt-1" style={{ color: "var(--text-3)" }}>진행 중이거나 예정된 특별 이벤트를 확인하세요.</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <div key={i} className="card p-5 h-28 animate-pulse bg-gray-100" />)}
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <section>
              <h2 className="font-bold text-[14px] mb-3" style={{ color: "var(--jade-700)" }}>진행 중인 이벤트</h2>
              <div className="space-y-3">
                {active.map((e) => <EventCard key={e.id} event={e} isActive />)}
              </div>
            </section>
          )}

          {upcoming.length > 0 && (
            <section>
              <h2 className="font-bold text-[14px] mb-3" style={{ color: "var(--text-2)" }}>예정 이벤트</h2>
              <div className="space-y-3">
                {upcoming.map((e) => <EventCard key={e.id} event={e} isActive={false} />)}
              </div>
            </section>
          )}

          {active.length === 0 && upcoming.length === 0 && (
            <div className="card p-10 text-center text-gray-400">
              <p className="text-4xl mb-3">🏓</p>
              <p className="font-semibold">현재 진행 중인 이벤트가 없습니다.</p>
              <p className="text-[13px] mt-1">곧 새로운 이벤트가 시작됩니다!</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
