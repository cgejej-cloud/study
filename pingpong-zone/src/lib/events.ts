import { prisma } from "@/lib/prisma";

export type EventType =
  | "elo_multiplier"
  | "bonus_elo_win"
  | "bonus_elo_streak"
  | "double_placement"
  | "elo_floor_boost";

export const EVENT_TYPES: EventType[] = [
  "elo_multiplier",
  "bonus_elo_win",
  "bonus_elo_streak",
  "double_placement",
  "elo_floor_boost",
];

export type EventConfig = {
  multiplier?: number;
  bonus?: number;
  streak?: number;
  floor?: number;
};

export type Event = {
  id: string;
  name: string;
  description: string | null;
  type: string;
  config: EventConfig;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  createdAt: Date;
};

export async function getActiveEvents(): Promise<Event[]> {
  const now = new Date();
  const rows = await prisma.event.findMany({
    where: {
      isActive: true,
      startDate: { lte: now },
      endDate: { gte: now },
    },
    orderBy: { startDate: "asc" },
  });
  return rows.map((r) => ({ ...r, config: r.config as EventConfig }));
}

export function applyEventEffects(opts: {
  baseP1Change: number;
  baseP2Change: number;
  iWon: boolean;
  events: Event[];
  p1CurrentStreak: number;
}): { p1Change: number; p2Change: number; multiplier: number; eventId: string | null } {
  const { baseP1Change, baseP2Change, iWon, events, p1CurrentStreak } = opts;

  let p1Change = baseP1Change;
  let p2Change = baseP2Change;
  let multiplier = 1;
  const eventId: string | null = events.length > 0 ? events[0].id : null;

  for (const event of events) {
    const config = event.config;
    const type = event.type as EventType;

    if (type === "elo_multiplier" && config.multiplier != null) {
      const m = config.multiplier;
      p1Change = Math.round(p1Change * m);
      p2Change = Math.round(p2Change * m);
      multiplier = multiplier * m;
    } else if (type === "bonus_elo_win" && config.bonus != null) {
      if (iWon) {
        p1Change = p1Change + config.bonus;
      } else {
        p2Change = p2Change + config.bonus;
      }
    } else if (type === "bonus_elo_streak" && config.streak != null && config.bonus != null) {
      if (iWon && p1CurrentStreak >= config.streak) {
        p1Change = p1Change + config.bonus;
      }
    }
  }

  return { p1Change, p2Change, multiplier, eventId };
}
