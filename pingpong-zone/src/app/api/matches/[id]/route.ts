import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { applyElo } from "@/lib/matchHelpers";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { id } = await params;
  const match = await prisma.match.findUnique({
    where: { id },
    include: {
      player1: { select: { id: true, name: true, eloRating: true } },
      player2: { select: { id: true, name: true, eloRating: true } },
      winner:  { select: { id: true, name: true } },
      season:  { select: { id: true, name: true } },
    },
  });
  if (!match) return NextResponse.json({ error: "없음" }, { status: 404 });
  return NextResponse.json(match);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { id } = await params;
  const { action } = await req.json(); // confirm | dispute | void (admin)

  const match = await prisma.match.findUnique({
    where: { id },
    include: { player2: { select: { email: true, emailNotify: true, name: true } } },
  });
  if (!match) return NextResponse.json({ error: "경기를 찾을 수 없습니다." }, { status: 404 });

  // void는 관리자가 disputed 경기를 완전 무효화
  if (action === "void") {
    if (session.role !== "admin") return NextResponse.json({ error: "권한 없음" }, { status: 403 });
    await prisma.match.update({ where: { id }, data: { status: "voided" } });
    return NextResponse.json({ status: "voided" });
  }

  // admin-confirm: 관리자가 disputed 경기를 강제 승인
  if (action === "admin-confirm") {
    if (session.role !== "admin") return NextResponse.json({ error: "권한 없음" }, { status: 403 });
    if (match.p1EloChange === null || match.p2EloChange === null) {
      return NextResponse.json({ error: "ELO 변동값이 없습니다." }, { status: 400 });
    }
    await applyElo(id, match.player1Id, match.p1EloChange, match.player2Id, match.p2EloChange);
    return NextResponse.json({ status: "confirmed" });
  }

  if (match.status !== "pending") {
    return NextResponse.json({ error: "이미 처리된 경기입니다." }, { status: 400 });
  }

  if (match.player2Id !== session.id && session.role !== "admin") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  if (action === "confirm") {
    if (match.p1EloChange === null || match.p2EloChange === null) {
      return NextResponse.json({ error: "포인트 변동값이 없습니다." }, { status: 400 });
    }
    await applyElo(id, match.player1Id, match.p1EloChange, match.player2Id, match.p2EloChange);
    return NextResponse.json({ status: "confirmed" });
  }

  if (action === "dispute") {
    await prisma.match.update({ where: { id }, data: { status: "disputed" } });
    return NextResponse.json({ status: "disputed" });
  }

  return NextResponse.json({ error: "올바르지 않은 action" }, { status: 400 });
}
