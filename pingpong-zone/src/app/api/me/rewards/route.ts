import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { nextMilestone, REWARD_TYPE_LABEL, type RewardType } from "@/lib/rewards";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const [user, recent, last7Agg] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.id },
      select: { rewardPoints: true, totalMatches: true, dailyStreak: true, lastMatchDate: true },
    }),
    prisma.rewardEvent.findMany({
      where: { userId: session.id },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: { id: true, type: true, amount: true, matchId: true, metadata: true, createdAt: true },
    }),
    prisma.rewardEvent.groupBy({
      by: ["type"],
      where: {
        userId: session.id,
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      _sum: { amount: true },
      _count: { _all: true },
    }),
  ]);

  if (!user) return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });

  const last7Total = last7Agg.reduce((acc, row) => acc + (row._sum.amount ?? 0), 0);
  const last7ByType: Record<string, { sum: number; count: number }> = {};
  for (const row of last7Agg) {
    last7ByType[row.type] = { sum: row._sum.amount ?? 0, count: row._count._all };
  }

  return NextResponse.json({
    summary: {
      rewardPoints: user.rewardPoints,
      totalMatches: user.totalMatches,
      dailyStreak: user.dailyStreak,
      lastMatchDate: user.lastMatchDate,
      last7Total,
      last7ByType,
    },
    nextMilestone: nextMilestone(user.totalMatches),
    history: recent.map((e) => ({
      ...e,
      label: REWARD_TYPE_LABEL[e.type as RewardType] ?? e.type,
    })),
  });
}
