import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type PlayerLite = { id: string; name: string; nickname?: string | null; eloRating?: number };
type SinglesConfig = { player1Id: string; player2Id: string };
type DoublesConfig = { team1: PlayerLite[]; team2: PlayerLite[] };
type KingConfig = {
  players: PlayerLite[];
  currentP1Idx: number;
  currentP2Idx: number;
  waitingIdx: number;
};

// 단일 세션 상세 — 공개 (관전용)
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gs = await prisma.gameSession.findUnique({
    where: { id },
    include: {
      sets: { orderBy: { setNumber: "asc" } },
      reservation: {
        include: {
          table: { select: { name: true } },
          user: { select: { id: true, name: true, nickname: true, avatar: true, profileColor: true, eloRating: true } },
          participants: {
            include: { user: { select: { id: true, name: true, nickname: true, avatar: true, profileColor: true, eloRating: true } } },
          },
        },
      },
    },
  });
  if (!gs) return NextResponse.json({ error: "세션을 찾을 수 없습니다." }, { status: 404 });

  let team1Sets = 0, team2Sets = 0;
  for (const s of gs.sets) {
    if (s.team1Score > s.team2Score) team1Sets++;
    else if (s.team2Score > s.team1Score) team2Sets++;
  }

  // 진영 표시용 (양쪽 멤버)
  type SideUser = { id: string; name: string; nickname: string | null; avatar: string | null; profileColor: string | null; eloRating: number };
  const allUsers: SideUser[] = [
    gs.reservation.user as SideUser,
    ...gs.reservation.participants.map((p) => p.user as SideUser),
  ];
  let team1: SideUser[] = [];
  let team2: SideUser[] = [];

  if (gs.matchType === "singles") {
    const cfg = gs.config as SinglesConfig;
    const p1 = allUsers.find((u) => u.id === cfg.player1Id);
    const p2 = allUsers.find((u) => u.id === cfg.player2Id);
    if (p1) team1 = [p1];
    if (p2) team2 = [p2];
  } else if (gs.matchType === "doubles") {
    const cfg = gs.config as DoublesConfig;
    team1 = cfg.team1.map((p) => allUsers.find((u) => u.id === p.id)).filter(Boolean) as SideUser[];
    team2 = cfg.team2.map((p) => allUsers.find((u) => u.id === p.id)).filter(Boolean) as SideUser[];
  } else if (gs.matchType === "king") {
    const cfg = gs.config as KingConfig;
    const p1 = allUsers.find((u) => u.id === cfg.players[cfg.currentP1Idx]?.id);
    const p2 = allUsers.find((u) => u.id === cfg.players[cfg.currentP2Idx]?.id);
    if (p1) team1 = [p1];
    if (p2) team2 = [p2];
  }

  return NextResponse.json({
    id: gs.id,
    matchType: gs.matchType,
    status: gs.status,
    tableName: gs.reservation.table.name,
    startedAt: gs.createdAt,
    team1,
    team2,
    team1Sets,
    team2Sets,
    sets: gs.sets.map((s) => ({
      setNumber: s.setNumber,
      team1Score: s.team1Score,
      team2Score: s.team2Score,
      savedAt: s.savedAt,
    })),
  });
}
