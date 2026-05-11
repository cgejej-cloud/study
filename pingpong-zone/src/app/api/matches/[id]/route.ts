import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

// 자동 승인 기준 시간 (24시간)
const AUTO_CONFIRM_HOURS = 24;

// 24시간이 지난 pending 경기를 자동 승인 처리
export async function autoConfirmExpired() {
  const cutoff = new Date(Date.now() - AUTO_CONFIRM_HOURS * 60 * 60 * 1000);
  const expired = await prisma.match.findMany({
    where: { status: "pending", createdAt: { lt: cutoff } },
  });

  for (const match of expired) {
    if (match.p1EloChange === null || match.p2EloChange === null) continue;
    await prisma.$transaction([
      prisma.user.update({
        where: { id: match.player1Id },
        data:  { eloRating: { increment: match.p1EloChange } },
      }),
      prisma.user.update({
        where: { id: match.player2Id },
        data:  { eloRating: { increment: match.p2EloChange } },
      }),
      prisma.match.update({
        where: { id: match.id },
        data:  { status: "confirmed", confirmedAt: new Date() },
      }),
    ]);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { id } = await params;
  const { action } = await req.json(); // "confirm" | "dispute"

  const match = await prisma.match.findUnique({ where: { id } });
  if (!match) return NextResponse.json({ error: "경기를 찾을 수 없습니다." }, { status: 404 });
  if (match.status !== "pending") {
    return NextResponse.json({ error: "이미 처리된 경기입니다." }, { status: 400 });
  }

  // 확인/거절 권한: 상대방(player2)만 가능. 관리자도 처리 가능.
  if (match.player2Id !== session.id && session.role !== "admin") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  if (action === "confirm") {
    // ELO 적용 + 상태 변경
    if (match.p1EloChange === null || match.p2EloChange === null) {
      return NextResponse.json({ error: "ELO 변동값이 없습니다." }, { status: 400 });
    }
    await prisma.$transaction([
      prisma.user.update({
        where: { id: match.player1Id },
        data:  { eloRating: { increment: match.p1EloChange } },
      }),
      prisma.user.update({
        where: { id: match.player2Id },
        data:  { eloRating: { increment: match.p2EloChange } },
      }),
      prisma.match.update({
        where: { id },
        data:  { status: "confirmed", confirmedAt: new Date() },
      }),
    ]);
    return NextResponse.json({ status: "confirmed" });
  }

  if (action === "dispute") {
    // ELO 미적용 상태에서 disputed로 변경 (관리자 검토 필요)
    await prisma.match.update({
      where: { id },
      data:  { status: "disputed" },
    });
    return NextResponse.json({ status: "disputed" });
  }

  return NextResponse.json({ error: "올바르지 않은 action입니다." }, { status: 400 });
}
