import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { reservationId, matchType, team2Config } = await req.json().catch(() => ({}));
  if (!reservationId) return NextResponse.json({ error: "reservationId가 필요합니다." }, { status: 400 });

  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: {
      participants: {
        include: { user: { select: { id: true, name: true, nickname: true, eloRating: true } } },
        orderBy: { joinedAt: "asc" },
      },
      user: { select: { id: true, name: true, nickname: true, eloRating: true } },
      gameSession: true,
    },
  });

  if (!reservation) return NextResponse.json({ error: "예약을 찾을 수 없습니다." }, { status: 404 });
  if (reservation.userId !== session.id) return NextResponse.json({ error: "예약자만 경기를 시작할 수 있습니다." }, { status: 403 });
  if (reservation.gameSession) return NextResponse.json({ error: "이미 진행 중인 세션이 있습니다." }, { status: 409 });

  // 예약자를 첫 번째 참가자로 포함
  const ownerParticipant = reservation.participants.find((p) => p.userId === reservation.userId);
  const allPlayers = ownerParticipant
    ? reservation.participants.map((p) => p.user)
    : [reservation.user, ...reservation.participants.map((p) => p.user)];

  const count = allPlayers.length;
  if (count < 2) return NextResponse.json({ error: "경기를 시작하려면 최소 2명이 체크인해야 합니다." }, { status: 400 });

  let type = matchType;
  let config: Record<string, unknown>;

  if (count === 2) {
    type = "singles";
    config = { player1Id: allPlayers[0].id, player2Id: allPlayers[1].id };
  } else if (count === 3) {
    type = "king";
    // 킹오브더힐: players[0] vs players[1], players[2] 대기
    config = {
      players: allPlayers.map((p) => ({ id: p.id, name: p.nickname || p.name, elo: p.eloRating })),
      currentP1Idx: 0,
      currentP2Idx: 1,
      waitingIdx: 2,
    };
  } else if (count === 4) {
    if (!type || (type !== "singles" && type !== "doubles")) {
      return NextResponse.json({ error: "4명일 때는 matchType(singles/doubles)을 지정해주세요." }, { status: 400 });
    }
    if (type === "doubles") {
      // team2Config: [idx2, idx3] 팀2에 넣을 인덱스 (나머지는 팀1)
      const t2 = team2Config as [number, number] | null;
      const t2Indices = t2 ?? [2, 3];
      const t1Indices = [0, 1, 2, 3].filter((i) => !t2Indices.includes(i));
      config = {
        team1: t1Indices.map((i) => ({ id: allPlayers[i].id, name: allPlayers[i].nickname || allPlayers[i].name })),
        team2: t2Indices.map((i) => ({ id: allPlayers[i].id, name: allPlayers[i].nickname || allPlayers[i].name })),
      };
    } else {
      // singles with 4 players: 첫 두 명이 먼저
      config = { player1Id: allPlayers[0].id, player2Id: allPlayers[1].id };
    }
  } else {
    return NextResponse.json({ error: "참가자 수가 올바르지 않습니다 (2~4명)." }, { status: 400 });
  }

  const gameSession = await prisma.gameSession.create({
    data: { reservationId, matchType: type, config: config as Prisma.InputJsonValue },
    include: { sets: true },
  });

  return NextResponse.json(gameSession, { status: 201 });
}
