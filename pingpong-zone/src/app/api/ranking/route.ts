import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      eloRating: true,
      matchesAsPlayer1: { select: { winnerId: true } },
      matchesAsPlayer2: { select: { winnerId: true } },
    },
    orderBy: { eloRating: "desc" },
  });

  const ranking = users.map((u) => {
    const allMatches = [...u.matchesAsPlayer1, ...u.matchesAsPlayer2];
    const wins = allMatches.filter((m) => m.winnerId === u.id).length;
    const total = allMatches.length;
    const losses = total - wins;
    return {
      id: u.id,
      name: u.name,
      eloRating: u.eloRating,
      wins,
      losses,
      total,
      winRate: total > 0 ? Math.round((wins / total) * 100) : null,
    };
  });

  return NextResponse.json(ranking);
}
