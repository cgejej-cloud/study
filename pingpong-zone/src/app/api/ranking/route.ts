import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { autoConfirmExpired } from "@/app/api/matches/[id]/route";

const PLACEMENT_GAMES = 5;

export async function GET() {
  try {
  // 24시간 지난 pending 경기 자동 승인
  await autoConfirmExpired();

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      eloRating: true,
      matchesAsPlayer1: { where: { status: "confirmed" }, select: { winnerId: true, createdAt: true } },
      matchesAsPlayer2: { where: { status: "confirmed" }, select: { winnerId: true, createdAt: true } },
    },
    orderBy: { eloRating: "desc" },
  });

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

    return {
      id: u.id,
      name: u.name,
      eloRating: u.eloRating,
      wins,
      losses,
      total,
      isPlacing,
      placementLeft: isPlacing ? PLACEMENT_GAMES - total : 0,
      winRate: total > 0 ? Math.round((wins / total) * 100) : null,
      streak: streakType ? { type: streakType, count: streak } : null,
    };
  });

  return NextResponse.json(ranking);
  } catch (e) {
    console.error("[/api/ranking]", e);
    return NextResponse.json({ error: "랭킹을 불러올 수 없습니다." }, { status: 500 });
  }
}
