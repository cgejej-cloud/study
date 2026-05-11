import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 최근 활동 피드 (전체 공개) - 최근 confirmed 매치
export async function GET() {
  try {
    const matches = await prisma.match.findMany({
      where: { status: "confirmed" },
      include: {
        player1: { select: { id: true, name: true } },
        player2: { select: { id: true, name: true } },
        winner:  { select: { id: true, name: true } },
      },
      orderBy: { confirmedAt: "desc" },
      take: 10,
    });

    return NextResponse.json(
      matches.map((m) => ({
        id: m.id,
        winner: m.winner,
        loser: m.winnerId === m.player1Id ? m.player2 : m.player1,
        p1Score: m.p1Score,
        p2Score: m.p2Score,
        winnerScore: m.winnerId === m.player1Id ? m.p1Score : m.p2Score,
        loserScore:  m.winnerId === m.player1Id ? m.p2Score : m.p1Score,
        confirmedAt: m.confirmedAt,
      }))
    );
  } catch (e) {
    console.error("[/api/activity]", e);
    return NextResponse.json([], { status: 500 });
  }
}
