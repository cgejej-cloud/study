import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type PlayerLite = { id: string; name: string; nickname?: string | null; eloRating?: number };
type KingConfig = {
  players: PlayerLite[];
  currentP1Idx: number;
  currentP2Idx: number;
  waitingIdx: number;
};
type SinglesConfig = { player1Id: string; player2Id: string };
type DoublesConfig = { team1: PlayerLite[]; team2: PlayerLite[] };

// 진행 중인 경기 세션 목록 (공개)
export async function GET() {
  const sessions = await prisma.gameSession.findMany({
    where: { status: "active" },
    include: {
      sets: { orderBy: { setNumber: "asc" } },
      reservation: {
        include: {
          table: { select: { name: true } },
          user: { select: { id: true, name: true, nickname: true, eloRating: true } },
          participants: {
            include: { user: { select: { id: true, name: true, nickname: true, eloRating: true } } },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const list = sessions.map((gs) => {
    let team1Sets = 0, team2Sets = 0;
    for (const s of gs.sets) {
      if (s.team1Score > s.team2Score) team1Sets++;
      else if (s.team2Score > s.team1Score) team2Sets++;
    }

    let displayP1 = "", displayP2 = "";
    if (gs.matchType === "singles") {
      const cfg = gs.config as SinglesConfig;
      const allUsers = [gs.reservation.user, ...gs.reservation.participants.map((p) => p.user)];
      const p1 = allUsers.find((u) => u.id === cfg.player1Id);
      const p2 = allUsers.find((u) => u.id === cfg.player2Id);
      displayP1 = (p1?.nickname || p1?.name) ?? "—";
      displayP2 = (p2?.nickname || p2?.name) ?? "—";
    } else if (gs.matchType === "doubles") {
      const cfg = gs.config as DoublesConfig;
      displayP1 = cfg.team1.map((p) => p.name).join(" · ");
      displayP2 = cfg.team2.map((p) => p.name).join(" · ");
    } else if (gs.matchType === "king") {
      const cfg = gs.config as KingConfig;
      displayP1 = cfg.players[cfg.currentP1Idx]?.name ?? "—";
      displayP2 = cfg.players[cfg.currentP2Idx]?.name ?? "—";
    }

    return {
      id: gs.id,
      matchType: gs.matchType,
      tableName: gs.reservation.table.name,
      startedAt: gs.createdAt,
      displayP1,
      displayP2,
      team1Sets,
      team2Sets,
      setsPlayed: gs.sets.length,
    };
  });

  return NextResponse.json(list);
}
