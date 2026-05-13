import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyCronSecret } from "@/lib/cronAuth";
import { kstDateString } from "@/lib/time";

export async function GET(req: NextRequest) {
  const err = verifyCronSecret(req);
  if (err) return err;

  const today = kstDateString();

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
