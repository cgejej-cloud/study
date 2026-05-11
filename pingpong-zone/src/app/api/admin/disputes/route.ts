import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const matches = await prisma.match.findMany({
    where: { status: "disputed" },
    include: {
      player1: { select: { id: true, name: true, eloRating: true } },
      player2: { select: { id: true, name: true, eloRating: true } },
      winner:  { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(matches);
}
