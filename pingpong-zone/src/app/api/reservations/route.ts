import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const all = searchParams.get("all");

  const where =
    all === "true" && session.role === "admin"
      ? {}
      : { userId: session.id };

  const reservations = await prisma.reservation.findMany({
    where,
    include: { table: true, user: { select: { name: true, email: true, phone: true } } },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });

  return NextResponse.json(reservations);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { tableId, date, startTime, endTime } = await req.json();

  if (!tableId || !date || !startTime || !endTime) {
    return NextResponse.json({ error: "필수 항목을 입력해주세요." }, { status: 400 });
  }

  const conflict = await prisma.reservation.findFirst({
    where: {
      tableId,
      date,
      status: "confirmed",
      OR: [
        { startTime: { lte: startTime }, endTime: { gt: startTime } },
        { startTime: { lt: endTime }, endTime: { gte: endTime } },
        { startTime: { gte: startTime }, endTime: { lte: endTime } },
      ],
    },
  });

  if (conflict) {
    return NextResponse.json({ error: "이미 예약된 시간대입니다." }, { status: 409 });
  }

  const reservation = await prisma.reservation.create({
    data: { userId: session.id, tableId, date, startTime, endTime },
    include: { table: true },
  });

  return NextResponse.json(reservation);
}
