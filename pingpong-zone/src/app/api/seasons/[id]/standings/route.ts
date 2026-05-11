import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 시즌 랭킹: 활성 시즌은 라이브 집계, 종료 시즌은 스냅샷
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const season = await prisma.season.findUnique({ where: { id } });
    if (!season) return NextResponse.json({ error: "시즌을 찾을 수 없습니다." }, { status: 404 });

    if (season.endDate) {
      // 종료된 시즌: 저장된 스냅샷 반환
      const snapshots = await prisma.seasonSnapshot.findMany({
        where: { seasonId: id },
        include: { user: { select: { id: true, name: true } } },
        orderBy: { rank: "asc" },
      });
      return NextResponse.json({
        season: { id: season.id, name: season.name, isClosed: true, endDate: season.endDate },
        standings: snapshots.map((s) => ({
          id: s.user.id,
          name: s.user.name,
          rating: s.rating,
          rank: s.rank,
          wins: s.wins,
          losses: s.losses,
        })),
      });
    }

    // 활성 시즌: 시즌 태그된 confirmed 매치로 라이브 집계
    const matches = await prisma.match.findMany({
      where: { seasonId: id, status: "confirmed" },
      select: { player1Id: true, player2Id: true, winnerId: true, p1EloChange: true, p2EloChange: true },
    });

    type Stat = { wins: number; losses: number; delta: number };
    const stats = new Map<string, Stat>();
    function bump(uid: string, won: boolean, delta: number | null) {
      const s = stats.get(uid) ?? { wins: 0, losses: 0, delta: 0 };
      if (won) s.wins++; else s.losses++;
      if (delta !== null) s.delta += delta;
      stats.set(uid, s);
    }
    for (const m of matches) {
      bump(m.player1Id, m.winnerId === m.player1Id, m.p1EloChange);
      bump(m.player2Id, m.winnerId === m.player2Id, m.p2EloChange);
    }

    const userIds = [...stats.keys()];
    if (userIds.length === 0) {
      return NextResponse.json({
        season: { id: season.id, name: season.name, isClosed: false, startDate: season.startDate },
        standings: [],
      });
    }
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, eloRating: true },
    });

    const standings = users
      .map((u) => {
        const s = stats.get(u.id)!;
        return {
          id: u.id,
          name: u.name,
          rating: u.eloRating,
          wins: s.wins,
          losses: s.losses,
          delta: s.delta,
          winRate: s.wins + s.losses > 0 ? Math.round((s.wins / (s.wins + s.losses)) * 100) : null,
        };
      })
      .sort((a, b) => b.delta - a.delta || b.rating - a.rating)
      .map((s, i) => ({ ...s, rank: i + 1 }));

    return NextResponse.json({
      season: { id: season.id, name: season.name, isClosed: false, startDate: season.startDate },
      standings,
    });
  } catch (e) {
    console.error("[/api/seasons/[id]/standings]", e);
    return NextResponse.json({ error: "시즌 랭킹을 불러올 수 없습니다." }, { status: 500 });
  }
}
