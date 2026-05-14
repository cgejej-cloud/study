import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { id } = await params;
  const { code } = await req.json().catch(() => ({}));

  if (!code) return NextResponse.json({ error: "체크인 코드를 입력해주세요." }, { status: 400 });

  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: {
      participants: true,
      _count: { select: { participants: true } },
    },
  });

  if (!reservation || reservation.status !== "confirmed") {
    return NextResponse.json({ error: "유효한 예약을 찾을 수 없습니다." }, { status: 404 });
  }
  if (reservation.checkInCode !== code.trim()) {
    return NextResponse.json({ error: "코드가 올바르지 않습니다." }, { status: 400 });
  }

  // 예약 날짜 당일에만 체크인 가능 (KST 기준)
  const kstDate = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split("T")[0];
  if (reservation.date !== kstDate) {
    return NextResponse.json({ error: "예약 당일에만 체크인할 수 있습니다." }, { status: 400 });
  }

  // 최대 4명 제한
  const ownerIsParticipant = reservation.participants.some((p) => p.userId === reservation.userId);
  const totalCount = reservation._count.participants + (ownerIsParticipant ? 0 : 1); // owner + participants
  if (reservation._count.participants >= 4) {
    return NextResponse.json({ error: "이미 최대 인원(4명)이 체크인했습니다." }, { status: 400 });
  }

  // 예약자 본인은 자동 참가 처리
  const alreadyIn = reservation.participants.some((p) => p.userId === session.id);
  if (alreadyIn || session.id === reservation.userId) {
    // 이미 참가 중이면 현재 상태만 반환
    if (!alreadyIn && session.id === reservation.userId) {
      await prisma.reservationParticipant.upsert({
        where: { reservationId_userId: { reservationId: id, userId: session.id } },
        update: {},
        create: { reservationId: id, userId: session.id },
      });
    }
    return NextResponse.json({ reservationId: id, alreadyCheckedIn: true });
  }

  await prisma.reservationParticipant.create({ data: { reservationId: id, userId: session.id } });

  const updatedCount = reservation._count.participants + 1;
  return NextResponse.json({ reservationId: id, participantCount: updatedCount, totalCount });
}

// GET: 참가자 목록 조회
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { id } = await params;

  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, nickname: true, avatar: true, eloRating: true } },
      participants: {
        include: { user: { select: { id: true, name: true, nickname: true, avatar: true, eloRating: true } } },
        orderBy: { joinedAt: "asc" },
      },
      gameSession: { include: { sets: { orderBy: { setNumber: "asc" } } } },
    },
  });

  if (!reservation) return NextResponse.json({ error: "예약을 찾을 수 없습니다." }, { status: 404 });

  // checkInCode는 예약자에게만 공개
  const isOwner = session.id === reservation.userId;

  return NextResponse.json({
    id: reservation.id,
    date: reservation.date,
    startTime: reservation.startTime,
    endTime: reservation.endTime,
    checkInCode: isOwner ? reservation.checkInCode : null,
    isOwner,
    owner: reservation.user,
    participants: reservation.participants.map((p) => p.user),
    gameSession: reservation.gameSession,
  });
}
