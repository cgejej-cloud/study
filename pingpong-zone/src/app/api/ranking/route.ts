import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { autoConfirmExpired } from "@/lib/matchHelpers";

const PLACEMENT_GAMES = 5;

export async function GET() {
  try {
  await autoConfirmExpired();

  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  const [users, todaySnaps, yesterdaySnaps] = await Promise.all([
    prisma.user.findMany({
    select: {
      id: true,
      name: true,
      nickname: true,
      profileColor: true,
      avatar: true,
      eloRating: true,
      matchesAsPlayer1: { where: { status: "confirmed" }, select: { winnerId: true, createdAt: true } },
      matchesAsPlayer2: { where: { status: "confirmed" }, select: { winnerId: true, createdAt: true } },
    },
    orderBy: { eloRating: "desc" },
  }),
    prisma.rankSnapshot.findMany({
      where: { snapshotDate: today },
      select: { userId: true, rank: true },
    }),
    prisma.rankSnapshot.findMany({
      where: { snapshotDate: yesterday },
      select: { userId: true, rank: true },
    }),
  ]);

  const todaySnapMap = new Map(todaySnaps.map((s) => [s.userId, s.rank]));
  const yesterdaySnapMap = new Map(yesterdaySnaps.map((s) => [s.userId, s.rank]));

  const ranking = users.map((u) => {
    const allMatches = [...u.matchesAsPlayer1, ...u.matchesAsPlayer2]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const total = allMatches.length;
    const wins = allMatches.filter((m) => m.winnerId === u.id).length;
    const losses = total - wins;
    const isPlacing = total < PLACEMENT_GAMES;

    // 최신 경기부터 연승/연패 계산
    let streak = 0;
    let streakType: "W" | "L" | null = null;
    for (const m of allMatches) {
      const won = m.winnerId === u.id;
      const t = won ? "W" : "L";
      if (streakType === null) { streakType = t; streak = 1; continue; }
      if (streakType === t) streak++;
      else break;
    }

    const todayRank = todaySnapMap.get(u.id);
    const yesterdayRank = yesterdaySnapMap.get(u.id);
    let rankChange: number | null = null;
    if (todayRank != null && yesterdayRank != null) {
      rankChange = yesterdayRank - todayRank;
    }

    return {
      id: u.id,
      name: u.nickname ?? u.name,
      eloRating: u.eloRating,
      profileColor: u.profileColor ?? null,
      avatar: u.avatar ?? null,
      wins,
      losses,
      total,
      isPlacing,
      placementLeft: isPlacing ? PLACEMENT_GAMES - total : 0,
      winRate: total > 0 ? Math.round((wins / total) * 100) : null,
      streak: streakType ? { type: streakType, count: streak } : null,
      rankChange,
    };
  });

  return NextResponse.json(ranking);
  } catch (e) {
    console.error("[/api/ranking]", e);
    return NextResponse.json({ error: "랭킹을 불러올 수 없습니다." }, { status: 500 });
  }
}
