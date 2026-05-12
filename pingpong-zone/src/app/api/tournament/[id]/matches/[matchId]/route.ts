import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; matchId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  const { id, matchId } = await params;
  const body = await req.json();
  const { winnerId, p1Score, p2Score } = body;

  if (!winnerId) return NextResponse.json({ error: "winnerId가 필요합니다." }, { status: 400 });

  const match = await prisma.tournamentMatch.findUnique({ where: { id: matchId } });
  if (!match) return NextResponse.json({ error: "매치를 찾을 수 없습니다." }, { status: 404 });
  if (match.tournamentId !== id) return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  if (match.status === "bye") return NextResponse.json({ error: "bye 매치는 결과를 입력할 수 없습니다." }, { status: 400 });

  if (winnerId !== match.player1Id && winnerId !== match.player2Id) {
    return NextResponse.json({ error: "winnerId가 해당 매치의 참가자가 아닙니다." }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.tournamentMatch.update({
      where: { id: matchId },
      data: {
        winnerId,
        p1Score: p1Score != null ? Number(p1Score) : null,
        p2Score: p2Score != null ? Number(p2Score) : null,
        status: "completed",
      },
    });

    const nextRound = match.round + 1;
    const nextPos = Math.floor(match.position / 2);
    const isPlayer1Slot = match.position % 2 === 0;

    const nextMatch = await tx.tournamentMatch.findFirst({
      where: { tournamentId: id, round: nextRound, position: nextPos },
    });

    if (nextMatch) {
      await tx.tournamentMatch.update({
        where: { id: nextMatch.id },
        data: isPlayer1Slot ? { player1Id: winnerId } : { player2Id: winnerId },
      });
    }

    const allMatches = await tx.tournamentMatch.findMany({
      where: { tournamentId: id },
    });

    const nonByeMatches = allMatches.filter((m) => m.status !== "bye");
    const allDone = nonByeMatches.every((m) => m.id === matchId ? true : m.status === "completed");

    if (allDone) {
      await tx.tournament.update({
        where: { id },
        data: { status: "finished" },
      });
    }
  });

  const updatedMatch = await prisma.tournamentMatch.findUnique({
    where: { id: matchId },
    include: {
      player1: { select: { id: true, name: true } },
      player2: { select: { id: true, name: true } },
      winner: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(updatedMatch);
}
