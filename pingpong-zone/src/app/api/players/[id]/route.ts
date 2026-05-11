import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { calculateBadges } from "@/lib/badges";

const PLACEMENT_GAMES = 5;

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getSession();
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        eloRating: true,
        createdAt: true,
        matchesAsPlayer1: {
          where: { status: "confirmed" },
          select: { id: true, winnerId: true, createdAt: true,
                    p1EloChange: true, p2EloChange: true, p1Score: true, p2Score: true,
                    player2: { select: { id: true, name: true } } },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
        matchesAsPlayer2: {
          where: { status: "confirmed" },
          select: { id: true, winnerId: true, createdAt: true,
                    p1EloChange: true, p2EloChange: true, p1Score: true, p2Score: true,
                    player1: { select: { id: true, name: true } } },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });
    if (!user) return NextResponse.json({ error: "선수를 찾을 수 없습니다." }, { status: 404 });

    type Compact = {
      id: string; opponentId: string; opponentName: string; won: boolean;
      createdAt: Date; myChange: number | null;
      myScore: number | null; oppScore: number | null;
    };
    const matches: Compact[] = [
      ...user.matchesAsPlayer1.map((m) => ({
        id: m.id, opponentId: m.player2.id, opponentName: m.player2.name,
        won: m.winnerId === user.id, createdAt: m.createdAt, myChange: m.p1EloChange,
        myScore: m.p1Score, oppScore: m.p2Score,
      })),
      ...user.matchesAsPlayer2.map((m) => ({
        id: m.id, opponentId: m.player1.id, opponentName: m.player1.name,
        won: m.winnerId === user.id, createdAt: m.createdAt, myChange: m.p2EloChange,
        myScore: m.p2Score, oppScore: m.p1Score,
      })),
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 20);

    const total = user.matchesAsPlayer1.length + user.matchesAsPlayer2.length;
    const wins  = matches.filter((m) => m.won).length + 0; // wins from compact list (~recent 20) — use full count below
    const totalAll = total;
    const winsAll = [...user.matchesAsPlayer1, ...user.matchesAsPlayer2].filter((m) => m.winnerId === user.id).length;

    // 최근 10경기 폼 (W/L 배열)
    const form = matches.slice(0, 10).map((m) => (m.won ? "W" : "L"));

    // 연승/연패
    let streak = 0;
    let streakType: "W" | "L" | null = null;
    for (const m of matches) {
      const t = m.won ? "W" : "L";
      if (streakType === null) { streakType = t as "W" | "L"; streak = 1; continue; }
      if (streakType === t) streak++;
      else break;
    }

    // 역대 최장 연승 계산 (모든 매치 기준)
    let bestStreak = 0;
    let cur = 0;
    for (const m of [...matches].reverse()) {
      if (m.won) { cur++; if (cur > bestStreak) bestStreak = cur; }
      else cur = 0;
    }

    // 업적 계산
    const badges = calculateBadges({
      total: totalAll,
      wins: winsAll,
      losses: totalAll - winsAll,
      winRate: totalAll > 0 ? Math.round((winsAll / totalAll) * 100) : null,
      eloRating: user.eloRating,
      bestStreak,
      recentForm: form,
    });

    // 헤드투헤드 (현재 로그인 사용자가 본인이 아닐 때만 의미 있음)
    let headToHead = null as null | { vsId: string; vsName: string; wins: number; losses: number };
    if (session && session.id !== user.id) {
      const h2h = await prisma.match.findMany({
        where: {
          status: "confirmed",
          OR: [
            { player1Id: session.id, player2Id: user.id },
            { player1Id: user.id, player2Id: session.id },
          ],
        },
        select: { winnerId: true },
      });
      const myWins = h2h.filter((m) => m.winnerId === session.id).length;
      headToHead = { vsId: session.id, vsName: session.name, wins: myWins, losses: h2h.length - myWins };
    }

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
        streak: streakType ? { type: streakType, count: streak } : null,
        recentForm: form,
      },
      recentMatches: matches,
      headToHead,
      badges,
      _recentWins: wins,
    });
  } catch (e) {
    console.error("[/api/players/[id]]", e);
    return NextResponse.json({ error: "선수 정보를 불러올 수 없습니다." }, { status: 500 });
  }
}
