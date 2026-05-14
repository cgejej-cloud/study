import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { id } = await params;
  const { team1Score, team2Score } = await req.json().catch(() => ({}));

  if (typeof team1Score !== "number" || typeof team2Score !== "number" || team1Score < 0 || team2Score < 0) {
    return NextResponse.json({ error: "점수를 올바르게 입력해주세요." }, { status: 400 });
  }

  const gs = await prisma.gameSession.findUnique({
    where: { id },
    include: {
      sets: { orderBy: { setNumber: "asc" } },
      reservation: { select: { userId: true } },
    },
  });

  if (!gs) return NextResponse.json({ error: "세션을 찾을 수 없습니다." }, { status: 404 });
  if (gs.reservation.userId !== session.id) return NextResponse.json({ error: "예약자만 점수를 기록할 수 있습니다." }, { status: 403 });
  if (gs.status === "completed") return NextResponse.json({ error: "이미 종료된 세션입니다." }, { status: 400 });

  const setNumber = gs.sets.length + 1;
  const config = gs.config as Record<string, unknown>;

  let players: Record<string, string> | null = null;
  let updatedConfig: Record<string, unknown> | null = null;

  if (gs.matchType === "king") {
    // 킹오브더힐: 승자가 계속, 패자가 대기 플레이어와 교체
    const { players: kingPlayers, currentP1Idx, currentP2Idx, waitingIdx } = config as {
      players: Array<{ id: string; name: string; elo: number }>;
      currentP1Idx: number;
      currentP2Idx: number;
      waitingIdx: number;
    };

    const p1Id = kingPlayers[currentP1Idx as number].id;
    const p2Id = kingPlayers[currentP2Idx as number].id;
    const winnerIdx = team1Score > team2Score ? currentP1Idx : currentP2Idx;
    const loserIdx = team1Score > team2Score ? currentP2Idx : currentP1Idx;

    players = { p1Id, p2Id, winnerId: kingPlayers[winnerIdx as number].id };

    // 다음 세트: 승자 유지, 패자 ↔ 대기자 교체
    const nextWaitingIdx = loserIdx;
    const nextChallengerIdx = waitingIdx as number;
    updatedConfig = {
      ...config,
      currentP1Idx: winnerIdx,
      currentP2Idx: nextChallengerIdx,
      waitingIdx: nextWaitingIdx,
    };
  }

  const [setScore] = await prisma.$transaction([
    prisma.setScore.create({
      data: {
        sessionId: id,
        setNumber,
        team1Score,
        team2Score,
        players: players ?? undefined,
      },
    }),
    ...(updatedConfig
      ? [prisma.gameSession.update({ where: { id }, data: { config: updatedConfig as Prisma.InputJsonValue } })]
      : []),
  ]);

  const updatedSession = await prisma.gameSession.findUnique({
    where: { id },
    include: { sets: { orderBy: { setNumber: "asc" } } },
  });

  return NextResponse.json({ setScore, session: updatedSession }, { status: 201 });
}
