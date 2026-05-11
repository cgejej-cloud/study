import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { sendReservationConfirm } from "@/lib/email";
import { validateTime, isTimeBefore } from "@/lib/validation";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const all = searchParams.get("all");

  const where = all === "true" && session.role === "admin" ? {} : { userId: session.id };

  const reservations = await prisma.reservation.findMany({
    where,
    include: { table: true, user: { select: { name: true, email: true, phone: true } } },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });

  return NextResponse.json(reservations);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { tableId, date, startTime, endTime, recurring } = await req.json();
  // recurring: null | { weeks: number }

  if (!tableId || !date || !startTime || !endTime) {
    return NextResponse.json({ error: "필수 항목을 입력해주세요." }, { status: 400 });
  }
  if (!validateTime(startTime) || !validateTime(endTime) || !isTimeBefore(startTime, endTime)) {
    return NextResponse.json({ error: "시간 정보가 올바르지 않습니다." }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "날짜 형식이 올바르지 않습니다." }, { status: 400 });
  }
  // 과거 날짜 예약 차단
  const reqDateTime = new Date(`${date}T${startTime}:00`).getTime();
  if (reqDateTime <= Date.now()) {
    return NextResponse.json({ error: "과거 시간으로 예약할 수 없습니다." }, { status: 400 });
  }

  const timeFilter = {
    OR: [
      { startTime: { lte: startTime }, endTime: { gt: startTime } },
      { startTime: { lt: endTime }, endTime: { gte: endTime } },
      { startTime: { gte: startTime }, endTime: { lte: endTime } },
    ],
  };

  // 반복 예약 날짜 목록 생성 — weeks=N 이면 총 N개 예약 (첫 주 포함)
  const weeks = Math.max(0, recurring?.weeks ?? 0);
  const total = weeks > 0 ? weeks : 1;
  const dates: string[] = [];
  for (let i = 0; i < total; i++) {
    const d = new Date(date + "T00:00:00");
    d.setDate(d.getDate() + i * 7);
    dates.push(d.toISOString().split("T")[0]);
  }

  // 모든 날짜에 대해 충돌 검사
  for (const d of dates) {
    const conflict = await prisma.reservation.findFirst({
      where: { tableId, date: d, status: "confirmed", ...timeFilter },
    });
    if (conflict) {
      return NextResponse.json({ error: `${d} 해당 시간은 이미 예약된 시간대입니다.` }, { status: 409 });
    }
    const blockedConflict = await prisma.blockedSlot.findFirst({
      where: { tableId, date: d, ...timeFilter },
    });
    if (blockedConflict) {
      return NextResponse.json({ error: `${d} 예약 불가 시간대입니다.` }, { status: 409 });
    }
  }

  const user = await prisma.user.findUnique({ where: { id: session.id } });
  const table = await prisma.table.findUnique({ where: { id: tableId } });

  // 트랜잭션으로 전체 예약을 원자적으로 생성 (부분 실패 시 전체 롤백)
  const firstReservation = await prisma.$transaction(async (tx) => {
    const first = await tx.reservation.create({
      data: {
        userId: session.id,
        tableId,
        date: dates[0],
        startTime,
        endTime,
        isRecurring: weeks > 0,
        recurrenceEnd: weeks > 0 ? dates[dates.length - 1] : null,
      },
      include: { table: true },
    });
    if (weeks > 0 && dates.length > 1) {
      await tx.reservation.createMany({
        data: dates.slice(1).map((d) => ({
          userId: session.id,
          tableId,
          date: d,
          startTime,
          endTime,
          isRecurring: true,
          recurrenceEnd: dates[dates.length - 1],
          parentId: first.id,
        })),
      });
    }
    return first;
  });

  // 확인 이메일 발송 (설정된 경우)
  if (user?.emailNotify && user.email) {
    sendReservationConfirm({
      to: user.email,
      name: user.name,
      tableName: table?.name ?? tableId,
      date: dates[0],
      startTime,
      endTime,
    }).catch(() => {});
  }

  return NextResponse.json({ ...firstReservation, recurringCount: dates.length });
}
