import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

async function guard() {
  const s = await getSession();
  return s?.role === "admin" ? s : null;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await guard()) return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  const { id } = await params;
  const { action } = await req.json();

  if (action === "activate") {
    // 기존 활성 시즌 비활성화 후 새 시즌 활성화
    await prisma.season.updateMany({ where: { isActive: true }, data: { isActive: false } });
    const season = await prisma.season.update({ where: { id }, data: { isActive: true } });
    return NextResponse.json(season);
  }

  if (action === "close") {
    // 시즌 종료: 현재 랭킹 스냅샷 저장
    const season = await prisma.season.findUnique({
      where: { id },
      include: {
        matches: {
          where: { status: "confirmed" },
          select: { player1Id: true, player2Id: true, winnerId: true },
        },
      },
    });
    if (!season) return NextResponse.json({ error: "시즌 없음" }, { status: 404 });

    // 참여자별 전적 계산
    const stats = new Map<string, { wins: number; losses: number }>();
    for (const m of season.matches) {
      for (const uid of [m.player1Id, m.player2Id]) {
        if (!stats.has(uid)) stats.set(uid, { wins: 0, losses: 0 });
      }
      const winner = stats.get(m.winnerId)!;
      winner.wins++;
      const loserId = m.winnerId === m.player1Id ? m.player2Id : m.player1Id;
      const loser = stats.get(loserId)!;
      loser.losses++;
    }

    // 현재 ELO로 스냅샷 생성
    const users = await prisma.user.findMany({ where: { id: { in: [...stats.keys()] } }, select: { id: true, eloRating: true } });
    const sorted = users.sort((a, b) => b.eloRating - a.eloRating);

    await prisma.$transaction(
      sorted.map((u, i) =>
        prisma.seasonSnapshot.upsert({
          where:  { userId_seasonId: { userId: u.id, seasonId: id } },
          create: { userId: u.id, seasonId: id, rating: u.eloRating, rank: i + 1, ...stats.get(u.id)! },
          update: { rating: u.eloRating, rank: i + 1, ...stats.get(u.id)! },
        })
      )
    );

    const updated = await prisma.season.update({
      where: { id },
      data:  { isActive: false, endDate: new Date() },
    });
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "알 수 없는 action" }, { status: 400 });
}
