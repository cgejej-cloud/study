import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const entries = await prisma.reservationWaitlist.findMany({
    where: { userId: session.id },
    include: { table: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { tableId, date, startTime, endTime } = await req.json();
  if (!tableId || !date || !startTime || !endTime) {
    return NextResponse.json({ error: "필수 항목이 누락되었습니다." }, { status: 400 });
  }

  const existing = await prisma.reservationWaitlist.findFirst({
    where: { userId: session.id, tableId, date, startTime, endTime },
  });

  if (existing) {
    return NextResponse.json({ error: "이미 해당 슬롯에 대기 등록되어 있습니다." }, { status: 400 });
  }

  const entry = await prisma.reservationWaitlist.create({
    data: { userId: session.id, tableId, date, startTime, endTime },
  });

  return NextResponse.json(entry, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id가 필요합니다." }, { status: 400 });

  const entry = await prisma.reservationWaitlist.findUnique({ where: { id } });
  if (!entry) return NextResponse.json({ error: "대기 항목을 찾을 수 없습니다." }, { status: 404 });
  if (entry.userId !== session.id) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  await prisma.reservationWaitlist.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
