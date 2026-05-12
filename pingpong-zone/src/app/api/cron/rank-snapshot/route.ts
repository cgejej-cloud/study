import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Vercel Cron: 매일 자정 실행
// vercel.json: { "path": "/api/cron/rank-snapshot", "schedule": "0 0 * * *" }
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date().toISOString().split("T")[0];

  const users = await prisma.user.findMany({
    select: { id: true, eloRating: true },
    orderBy: { eloRating: "desc" },
  });

  await Promise.all(
    users.map((u, i) =>
      prisma.rankSnapshot.upsert({
        where: { userId_snapshotDate: { userId: u.id, snapshotDate: today } },
        create: { userId: u.id, rank: i + 1, eloRating: u.eloRating, snapshotDate: today },
        update: { rank: i + 1, eloRating: u.eloRating },
      })
    )
  );

  return NextResponse.json({ ok: true, snapshotted: users.length, date: today });
}
