import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") || "").trim();
  if (q.length < 1) return NextResponse.json({ players: [] });

  const players = await prisma.user.findMany({
    where: {
      name: { contains: q },
      NOT: { name: "(탈퇴한 회원)" },
    },
    select: { id: true, name: true, eloRating: true },
    orderBy: { eloRating: "desc" },
    take: 8,
  });

  return NextResponse.json({ players });
}
