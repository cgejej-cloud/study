import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { id } = await params;
  const reservation = await prisma.reservation.findUnique({ where: { id } });

  if (!reservation) {
    return NextResponse.json({ error: "예약을 찾을 수 없습니다." }, { status: 404 });
  }

  if (session.role !== "admin" && reservation.userId !== session.id) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const updated = await prisma.reservation.update({
    where: { id },
    data: { status: "cancelled" },
    include: { table: true },
  });

  return NextResponse.json(updated);
}
