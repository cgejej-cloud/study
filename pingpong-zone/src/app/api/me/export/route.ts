import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

// 개인정보 이동권 (Data Portability) — 본인 데이터 JSON 다운로드
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      eloRating: true,
      nickname: true,
      bio: true,
      profileColor: true,
      racketType: true,
      playStyle: true,
      title: true,
      avatar: true,
      emailNotify: true,
      createdAt: true,
      agreedTermsAt: true,
      agreedPrivacyAt: true,
      agreedMarketing: true,
      agreedMarketingAt: true,
      ageOver14: true,
      consentIp: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
  }

  const [reservations, matchesAsP1, matchesAsP2, follows, following, pushSubs] = await Promise.all([
    prisma.reservation.findMany({
      where: { userId: session.id },
      select: { id: true, tableId: true, date: true, startTime: true, endTime: true, status: true, isRecurring: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.match.findMany({
      where: { player1Id: session.id },
      select: { id: true, player2Id: true, winnerId: true, status: true, p1Score: true, p2Score: true, p1EloChange: true, createdAt: true, confirmedAt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.match.findMany({
      where: { player2Id: session.id },
      select: { id: true, player1Id: true, winnerId: true, status: true, p1Score: true, p2Score: true, p2EloChange: true, createdAt: true, confirmedAt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.follow.findMany({
      where: { followerId: session.id },
      select: { followingId: true, createdAt: true },
    }),
    prisma.follow.findMany({
      where: { followingId: session.id },
      select: { followerId: true, createdAt: true },
    }),
    prisma.pushSubscription.findMany({
      where: { userId: session.id },
      select: { endpoint: true, createdAt: true },
    }),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    schemaVersion: 1,
    profile: user,
    reservations,
    matches: { asPlayer1: matchesAsP1, asPlayer2: matchesAsP2 },
    social: { following: follows, followers: following },
    pushSubscriptions: pushSubs.map((p) => ({ ...p, endpoint: p.endpoint.slice(0, 60) + "..." })), // 토큰 일부 마스킹
  };

  const filename = `pingpongzone-data-${session.id}-${new Date().toISOString().slice(0, 10)}.json`;
  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
