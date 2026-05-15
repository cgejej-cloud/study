import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const top = await prisma.user.findMany({
    where: { rewardPoints: { gt: 0 } },
    orderBy: [{ rewardPoints: "desc" }, { totalMatches: "desc" }, { name: "asc" }],
    take: 50,
    select: {
      id: true,
      name: true,
      nickname: true,
      avatar: true,
      profileColor: true,
      rewardPoints: true,
      totalMatches: true,
      dailyStreak: true,
    },
  });

  return NextResponse.json(top);
}
