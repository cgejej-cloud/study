import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const today = new Date().toISOString().split("T")[0];

  const users = await prisma.user.findMany({
    select: { id: true, eloRating: true },
    orderBy: { eloRating: "desc" },
  });

  const snapshots = users.map((u, i) => ({
    userId: u.id,
    rank: i + 1,
    eloRating: u.eloRating,
    snapshotDate: today,
  }));

  await Promise.all(
    snapshots.map((s) =>
      prisma.rankSnapshot.upsert({
        where: { userId_snapshotDate: { userId: s.userId, snapshotDate: s.snapshotDate } },
        create: s,
        update: { rank: s.rank, eloRating: s.eloRating },
      })
    )
  );

  return NextResponse.json({ snapshotted: snapshots.length });
}
