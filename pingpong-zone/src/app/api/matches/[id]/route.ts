import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { applyElo } from "@/lib/matchHelpers";
import { sendPushToUser } from "@/lib/webpush";

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
    const result = await applyElo(id, match.player1Id, match.p1EloChange, match.player2Id, match.p2EloChange);
    return NextResponse.json({ status: "confirmed", rewards: result?.rewards ?? null });
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
    const result = await applyElo(id, match.player1Id, match.p1EloChange, match.player2Id, match.p2EloChange);
    const sign = (match.p1EloChange ?? 0) >= 0 ? "+" : "";
    sendPushToUser(match.player1Id, {
      title: "경기 확인 완료",
      body: `ELO ${sign}${match.p1EloChange} 반영됐습니다.`,
      url: "/mypage",
    }, "match");
    // 확인자(p2 또는 admin 경우 양쪽 모두) 본인 리워드를 응답에 포함
    const myRewards =
      session.id === match.player1Id ? result?.rewards.p1 :
      session.id === match.player2Id ? result?.rewards.p2 : [];
    return NextResponse.json({ status: "confirmed", rewards: myRewards ?? [] });
  }

  if (action === "dispute") {
    await prisma.match.update({ where: { id }, data: { status: "disputed" } });
    return NextResponse.json({ status: "disputed" });
  }

  return NextResponse.json({ error: "올바르지 않은 action" }, { status: 400 });
}
