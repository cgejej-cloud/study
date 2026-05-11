import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const tableId = searchParams.get("tableId");
  const date = searchParams.get("date");

  const where: Record<string, string> = {};
  if (tableId) where.tableId = tableId;
  if (date) where.date = date;

  const slots = await prisma.blockedSlot.findMany({
    where,
    include: { table: { select: { name: true } } },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });

  return NextResponse.json(slots);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { tableId, date, startTime, endTime, reason } = await req.json();
  if (!tableId || !date || !startTime || !endTime) {
    return NextResponse.json({ error: "필수 항목을 입력해주세요." }, { status: 400 });
  }

  const slot = await prisma.blockedSlot.create({
    data: { tableId, date, startTime, endTime, reason },
    include: { table: { select: { name: true } } },
  });

  return NextResponse.json(slot);
}
