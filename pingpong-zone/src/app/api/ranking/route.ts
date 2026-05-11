import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const PLACEMENT_GAMES = 5;

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
    const total = allMatches.length;
    const wins = allMatches.filter((m) => m.winnerId === u.id).length;
    const losses = total - wins;
    const isPlacing = total < PLACEMENT_GAMES;

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
    };
  });

  return NextResponse.json(ranking);
}
