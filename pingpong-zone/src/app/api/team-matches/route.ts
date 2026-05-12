import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const matches = await prisma.teamMatch.findMany({
    where: {
      OR: [
        { team1Player1Id: session.id },
        { team1Player2Id: session.id },
        { team2Player1Id: session.id },
        { team2Player2Id: session.id },
      ],
    },
    include: {
      team1Player1: { select: { id: true, name: true } },
      team1Player2: { select: { id: true, name: true } },
      team2Player1: { select: { id: true, name: true } },
      team2Player2: { select: { id: true, name: true } },
      season: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json(matches);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const body = await req.json();
  const { team1Player2Id, team2Player1Id, team2Player2Id, myTeam, myTeamWon, t1Score, t2Score } = body;

  if (!team1Player2Id || !team2Player1Id || !team2Player2Id) {
    return NextResponse.json({ error: "모든 선수를 선택해주세요." }, { status: 400 });
  }
  if (myTeam !== 1 && myTeam !== 2) {
    return NextResponse.json({ error: "myTeam은 1 또는 2여야 합니다." }, { status: 400 });
  }
  if (typeof myTeamWon !== "boolean") {
    return NextResponse.json({ error: "승패 정보가 필요합니다." }, { status: 400 });
  }

  const team1Player1Id = session.id;
  const ids = [team1Player1Id, team1Player2Id, team2Player1Id, team2Player2Id];

  const uniqueIds = new Set(ids);
  if (uniqueIds.size !== 4) {
    return NextResponse.json({ error: "4명의 선수는 모두 달라야 합니다." }, { status: 400 });
  }

  const users = await prisma.user.findMany({
    where: { id: { in: [...uniqueIds] } },
    select: { id: true },
  });
  if (users.length !== 4) {
    return NextResponse.json({ error: "존재하지 않는 유저가 포함되어 있습니다." }, { status: 400 });
  }

  const winnerTeam = myTeamWon ? myTeam : myTeam === 1 ? 2 : 1;

  const activeSeason = await prisma.season.findFirst({
    where: { isActive: true },
    select: { id: true },
  });

  const match = await prisma.teamMatch.create({
    data: {
      team1Player1Id,
      team1Player2Id,
      team2Player1Id,
      team2Player2Id,
      winnerTeam,
      t1Score: t1Score ?? null,
      t2Score: t2Score ?? null,
      status: "confirmed",
      seasonId: activeSeason?.id ?? null,
    },
    include: {
      team1Player1: { select: { id: true, name: true } },
      team1Player2: { select: { id: true, name: true } },
      team2Player1: { select: { id: true, name: true } },
      team2Player2: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(match, { status: 201 });
}
