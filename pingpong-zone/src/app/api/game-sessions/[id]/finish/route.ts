import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { computeMatchEloChanges } from "@/lib/elo";
import { ELO_FLOOR } from "@/lib/elo";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { id } = await params;

  const gs = await prisma.gameSession.findUnique({
    where: { id },
    include: {
      sets: { orderBy: { setNumber: "asc" } },
      reservation: { select: { userId: true, id: true } },
    },
  });

  if (!gs) return NextResponse.json({ error: "세션을 찾을 수 없습니다." }, { status: 404 });
  if (gs.reservation.userId !== session.id) return NextResponse.json({ error: "예약자만 경기를 종료할 수 있습니다." }, { status: 403 });
  if (gs.status === "completed") return NextResponse.json({ error: "이미 종료된 세션입니다." }, { status: 400 });
  if (gs.sets.length === 0) return NextResponse.json({ error: "저장된 세트가 없습니다." }, { status: 400 });

  const config = gs.config as Record<string, unknown>;
  const activeSeason = await prisma.season.findFirst({ where: { isActive: true } });

  const getGames = async (userId: string) => {
    const [wins, losses] = await Promise.all([
      prisma.match.count({ where: { winnerId: userId, status: "confirmed" } }),
      prisma.match.count({ where: { OR: [{ player1Id: userId }, { player2Id: userId }], status: "confirmed", NOT: { winnerId: userId } } }),
    ]);
    return wins + losses;
  };

  const applyEloChange = async (winnerId: string, loserId: string) => {
    const [winner, loser] = await Promise.all([
      prisma.user.findUnique({ where: { id: winnerId }, select: { eloRating: true } }),
      prisma.user.findUnique({ where: { id: loserId }, select: { eloRating: true } }),
    ]);
    if (!winner || !loser) return { winnerChange: 0, loserChange: 0 };

    const [wGames, lGames] = await Promise.all([getGames(winnerId), getGames(loserId)]);
    const { p1Change, p2Change } = computeMatchEloChanges({
      myElo: winner.eloRating, oppElo: loser.eloRating,
      myGames: wGames, oppGames: lGames, iWon: true,
    });
    const safeWin = Math.max(p1Change, ELO_FLOOR - winner.eloRating);
    const safeLoss = Math.max(p2Change, ELO_FLOOR - loser.eloRating);

    await prisma.$transaction([
      prisma.user.update({ where: { id: winnerId }, data: { eloRating: { increment: safeWin } } }),
      prisma.user.update({ where: { id: loserId }, data: { eloRating: { increment: safeLoss } } }),
    ]);
    return { winnerChange: safeWin, loserChange: safeLoss };
  };

  if (gs.matchType === "singles" || (gs.matchType === "singles" && config.player1Id)) {
    const { player1Id, player2Id } = config as { player1Id: string; player2Id: string };
    const team1Wins = gs.sets.filter((s) => s.team1Score > s.team2Score).length;
    const team2Wins = gs.sets.filter((s) => s.team2Score > s.team1Score).length;
    const winnerId = team1Wins >= team2Wins ? player1Id : player2Id;
    const loserId = winnerId === player1Id ? player2Id : player1Id;

    const { winnerChange, loserChange } = await applyEloChange(winnerId, loserId);

    await prisma.match.create({
      data: {
        player1Id,
        player2Id,
        winnerId,
        status: "confirmed",
        p1Score: team1Wins,
        p2Score: team2Wins,
        p1EloChange: winnerId === player1Id ? winnerChange : loserChange,
        p2EloChange: winnerId === player2Id ? winnerChange : loserChange,
        confirmedAt: new Date(),
        seasonId: activeSeason?.id ?? null,
      },
    });

  } else if (gs.matchType === "doubles") {
    const { team1, team2 } = config as {
      team1: Array<{ id: string }>;
      team2: Array<{ id: string }>;
    };
    const team1Wins = gs.sets.filter((s) => s.team1Score > s.team2Score).length;
    const team2Wins = gs.sets.filter((s) => s.team2Score > s.team1Score).length;
    const winnerTeam = team1Wins >= team2Wins ? 1 : 2;

    await prisma.teamMatch.create({
      data: {
        team1Player1Id: team1[0].id,
        team1Player2Id: team1[1].id,
        team2Player1Id: team2[0].id,
        team2Player2Id: team2[1].id,
        winnerTeam,
        t1Score: team1Wins,
        t2Score: team2Wins,
        status: "confirmed",
        seasonId: activeSeason?.id ?? null,
      },
    });

  } else if (gs.matchType === "king") {
    // 각 세트별 개별 Match 생성
    for (const set of gs.sets) {
      const sp = set.players as { p1Id: string; p2Id: string; winnerId: string } | null;
      if (!sp) continue;
      const loserId = sp.winnerId === sp.p1Id ? sp.p2Id : sp.p1Id;
      const { winnerChange, loserChange } = await applyEloChange(sp.winnerId, loserId);

      await prisma.match.create({
        data: {
          player1Id: sp.p1Id,
          player2Id: sp.p2Id,
          winnerId: sp.winnerId,
          status: "confirmed",
          p1Score: set.team1Score,
          p2Score: set.team2Score,
          p1EloChange: sp.winnerId === sp.p1Id ? winnerChange : loserChange,
          p2EloChange: sp.winnerId === sp.p2Id ? winnerChange : loserChange,
          confirmedAt: new Date(),
          seasonId: activeSeason?.id ?? null,
        },
      });
    }
  }

  await prisma.$transaction([
    prisma.gameSession.update({ where: { id }, data: { status: "completed" } }),
    prisma.reservation.update({ where: { id: gs.reservation.id }, data: { status: "completed" } }),
  ]);

  return NextResponse.json({ ok: true });
}
