import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { code } = await req.json().catch(() => ({}));
  if (!code || code.length !== 6) return NextResponse.json({ error: "6자리 코드를 입력해주세요." }, { status: 400 });

  // 오늘 날짜(KST) 예약에서 코드 검색
  const kstDate = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split("T")[0];

  const reservation = await prisma.reservation.findFirst({
    where: { checkInCode: code.trim(), date: kstDate, status: { in: ["confirmed", "completed"] } },
    include: { _count: { select: { participants: true } } },
  });

  if (!reservation) {
    return NextResponse.json({ error: "오늘 날짜에 해당 코드의 예약을 찾을 수 없습니다." }, { status: 404 });
  }

  // 예약자가 직접 코드로 들어오는 경우 처리
  if (reservation.userId === session.id) {
    // 예약자 본인은 자동 참가 처리
    await prisma.reservationParticipant.upsert({
      where: { reservationId_userId: { reservationId: reservation.id, userId: session.id } },
      update: {},
      create: { reservationId: reservation.id, userId: session.id },
    });
    return NextResponse.json({ reservationId: reservation.id });
  }

  // 최대 4명 체크
  if (reservation._count.participants >= 4) {
    return NextResponse.json({ error: "이미 최대 인원(4명)이 체크인했습니다." }, { status: 400 });
  }

  // 체크인
  await prisma.reservationParticipant.upsert({
    where: { reservationId_userId: { reservationId: reservation.id, userId: session.id } },
    update: {},
    create: { reservationId: reservation.id, userId: session.id },
  });

  return NextResponse.json({ reservationId: reservation.id });
}
