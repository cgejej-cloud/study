import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { sendEmailIfEnabled } from "@/lib/email";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { id } = await params;
  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: { table: true, user: { select: { name: true, email: true } } },
  });

  if (!reservation) return NextResponse.json({ error: "예약을 찾을 수 없습니다." }, { status: 404 });
  if (reservation.userId !== session.id && session.role !== "admin") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  return NextResponse.json(reservation);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const cancelAll: boolean = !!body?.cancelAll;

  const reservation = await prisma.reservation.findUnique({ where: { id } });
  if (!reservation) return NextResponse.json({ error: "예약을 찾을 수 없습니다." }, { status: 404 });
  if (session.role !== "admin" && reservation.userId !== session.id) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  // 어드민이 아니면 시작 시간이 지난 예약은 취소 불가
  if (session.role !== "admin") {
    const reservTime = new Date(`${reservation.date}T${reservation.startTime}:00`);
    if (reservTime.getTime() <= Date.now()) {
      return NextResponse.json(
        { error: "이미 시작된 예약은 취소할 수 없습니다." },
        { status: 400 }
      );
    }
  }

  // 반복 예약 일괄 취소
  if (cancelAll && (reservation.parentId || reservation.isRecurring)) {
    const rootId = reservation.parentId ?? reservation.id;
    const now = Date.now();
    // 미래 예약만 일괄 취소
    const candidates = await prisma.reservation.findMany({
      where: {
        OR: [{ id: rootId }, { parentId: rootId }],
        status: "confirmed",
        userId: reservation.userId,
      },
      select: { id: true, date: true, startTime: true },
    });
    const idsToCancel = candidates
      .filter((r) => new Date(`${r.date}T${r.startTime}:00`).getTime() > now)
      .map((r) => r.id);
    await prisma.reservation.updateMany({
      where: { id: { in: idsToCancel } },
      data:  { status: "cancelled" },
    });
    return NextResponse.json({ cancelledCount: idsToCancel.length });
  }

  const updated = await prisma.reservation.update({
    where: { id },
    data: { status: "cancelled" },
    include: { table: true },
  });

  const firstWaiting = await prisma.reservationWaitlist.findFirst({
    where: {
      tableId: reservation.tableId,
      date: reservation.date,
      startTime: reservation.startTime,
      endTime: reservation.endTime,
      notified: false,
    },
    orderBy: { createdAt: "asc" },
    include: { user: { select: { email: true, emailNotify: true, name: true } } },
  });

  if (firstWaiting) {
    await prisma.reservationWaitlist.update({
      where: { id: firstWaiting.id },
      data: { notified: true },
    });
    await sendEmailIfEnabled(
      firstWaiting.user,
      "[탁구존] 예약 자리가 생겼습니다!",
      `<p>${firstWaiting.user.name}님, 대기 중이던 슬롯에 예약 자리가 생겼습니다!</p>
       <ul>
         <li>탁구대: <b>${updated.table.name}</b></li>
         <li>날짜: <b>${reservation.date}</b></li>
         <li>시간: <b>${reservation.startTime} ~ ${reservation.endTime}</b></li>
       </ul>
       <p>지금 바로 예약하세요! 🏓</p>
       <a href="${process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"}/reserve">예약하기</a>`
    );
  }

  return NextResponse.json(updated);
}
