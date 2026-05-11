import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const PLACEMENT_GAMES = 5;

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        eloRating: true,
        createdAt: true,
        matchesAsPlayer1: {
          where: { status: "confirmed" },
          select: { id: true, winnerId: true, createdAt: true, p1EloChange: true, p2EloChange: true,
                    player2: { select: { id: true, name: true } } },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
        matchesAsPlayer2: {
          where: { status: "confirmed" },
          select: { id: true, winnerId: true, createdAt: true, p1EloChange: true, p2EloChange: true,
                    player1: { select: { id: true, name: true } } },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });
    if (!user) return NextResponse.json({ error: "선수를 찾을 수 없습니다." }, { status: 404 });

    type Compact = { id: string; opponentId: string; opponentName: string; won: boolean; createdAt: Date; myChange: number | null };
    const matches: Compact[] = [
      ...user.matchesAsPlayer1.map((m) => ({
        id: m.id, opponentId: m.player2.id, opponentName: m.player2.name,
        won: m.winnerId === user.id, createdAt: m.createdAt, myChange: m.p1EloChange,
      })),
      ...user.matchesAsPlayer2.map((m) => ({
        id: m.id, opponentId: m.player1.id, opponentName: m.player1.name,
        won: m.winnerId === user.id, createdAt: m.createdAt, myChange: m.p2EloChange,
      })),
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 20);

    const total = user.matchesAsPlayer1.length + user.matchesAsPlayer2.length;
    const wins  = matches.filter((m) => m.won).length + 0; // wins from compact list (~recent 20) — use full count below
    const totalAll = total;
    const winsAll = [...user.matchesAsPlayer1, ...user.matchesAsPlayer2].filter((m) => m.winnerId === user.id).length;

    return NextResponse.json({
      id: user.id,
      name: user.name,
      eloRating: user.eloRating,
      joinedAt: user.createdAt,
      stats: {
        total: totalAll,
        wins: winsAll,
        losses: totalAll - winsAll,
        winRate: totalAll > 0 ? Math.round((winsAll / totalAll) * 100) : null,
        isPlacing: totalAll < PLACEMENT_GAMES,
        placementLeft: totalAll < PLACEMENT_GAMES ? PLACEMENT_GAMES - totalAll : 0,
      },
      recentMatches: matches,
      _recentWins: wins,
    });
  } catch (e) {
    console.error("[/api/players/[id]]", e);
    return NextResponse.json({ error: "선수 정보를 불러올 수 없습니다." }, { status: 500 });
  }
}
