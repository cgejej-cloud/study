import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { id } = await params;
  const gs = await prisma.gameSession.findUnique({
    where: { id },
    include: {
      sets: { orderBy: { setNumber: "asc" } },
      reservation: {
        select: {
          userId: true,
          date: true,
          startTime: true,
          endTime: true,
          table: { select: { name: true } },
        },
      },
    },
  });

  if (!gs) return NextResponse.json({ error: "세션을 찾을 수 없습니다." }, { status: 404 });
  return NextResponse.json({ ...gs, isOwner: session.id === gs.reservation.userId });
}
