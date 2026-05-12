import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: { eloRating: true },
  });
  if (!user) return NextResponse.json({ error: "선수를 찾을 수 없습니다." }, { status: 404 });

  const matches = await prisma.match.findMany({
    where: {
      status: "confirmed",
      OR: [{ player1Id: id }, { player2Id: id }],
    },
    select: {
      id: true,
      player1Id: true,
      p1EloChange: true,
      p2EloChange: true,
      confirmedAt: true,
      createdAt: true,
    },
    orderBy: { confirmedAt: "asc" },
  });

  // 현재 ELO에서 역산하여 히스토리 재구성
  let runningElo = user.eloRating;
  const points: { date: string; elo: number; change: number }[] = [];

  for (let i = matches.length - 1; i >= 0; i--) {
    const m = matches[i];
    const change = m.player1Id === id ? (m.p1EloChange ?? 0) : (m.p2EloChange ?? 0);
    runningElo -= change;
    points.unshift({
      date: (m.confirmedAt ?? m.createdAt).toISOString(),
      elo: runningElo + change,
      change,
    });
  }

  // 시작점 추가 (첫 경기 이전 기본값)
  const startElo = points.length > 0 ? runningElo : user.eloRating;

  return NextResponse.json({
    current: user.eloRating,
    startElo,
    history: points,
  });
}
