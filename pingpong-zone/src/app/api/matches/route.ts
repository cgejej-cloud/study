import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { notifyOpponent, AUTO_CONFIRM_HOURS } from "@/lib/matchHelpers";
import { PLACEMENT_GAMES, computeMatchEloChanges } from "@/lib/elo";
import { kstTodayStart } from "@/lib/time";
import { getActiveEvents, applyEventEffects } from "@/lib/events";

const DAILY_MATCH_LIMIT = 5;    // 하루 최대 경기 수
const PAIR_DAILY_LIMIT = 1;     // 같은 상대와 하루 최대 경기 수
const COOLDOWN_MINUTES = 30;    // 연속 경기 최소 간격 (분)

async function getConfirmedGameCount(userId: string) {
  return prisma.match.count({
    where: {
      OR: [{ player1Id: userId }, { player2Id: userId }],
      status: "confirmed",
    },
  });
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId") || session.id;
  const pending = searchParams.get("pending") === "true";

  if (pending) {
    // 나(player2)에게 온 대기 중 경기 목록
    const pendingMatches = await prisma.match.findMany({
      where: { player2Id: session.id, status: "pending" },
      include: {
        player1: { select: { id: true, name: true, eloRating: true } },
        player2: { select: { id: true, name: true, eloRating: true } },
        winner:  { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(pendingMatches);
  }

  const cursor = searchParams.get("cursor") ?? undefined;
  const limit = Math.min(Number(searchParams.get("limit") ?? 20), 50);

  const matches = await prisma.match.findMany({
    where: { OR: [{ player1Id: userId }, { player2Id: userId }] },
    include: {
      player1: { select: { id: true, name: true, eloRating: true } },
      player2: { select: { id: true, name: true, eloRating: true } },
      winner:  { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = matches.length > limit;
  const items = hasMore ? matches.slice(0, limit) : matches;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  return NextResponse.json({ items, nextCursor, hasMore });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { opponentId, iWon, myScore, opponentScore } = await req.json();

  if (!opponentId || iWon === undefined) {
    return NextResponse.json({ error: "필수 항목을 입력해주세요." }, { status: 400 });
  }
  if (opponentId === session.id) {
    return NextResponse.json({ error: "자기 자신과의 경기는 기록할 수 없습니다." }, { status: 400 });
  }

  // 점수는 선택 입력 — 입력 시 0~7 정수, 승자가 더 높아야 함
  let p1Score: number | null = null;
  let p2Score: number | null = null;
  if (myScore !== undefined && opponentScore !== undefined && myScore !== null && opponentScore !== null) {
    const a = Number(myScore), b = Number(opponentScore);
    if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0 || a > 7 || b > 7) {
      return NextResponse.json({ error: "세트 수는 0~7 사이의 정수여야 합니다." }, { status: 400 });
    }
    if ((iWon && a <= b) || (!iWon && b <= a)) {
      return NextResponse.json({ error: "승자의 세트 수가 더 높아야 합니다." }, { status: 400 });
    }
    p1Score = a;
    p2Score = b;
  }

  const now = new Date();
  const todayStart = kstTodayStart();

  // ── 악용 방지 검사 ──────────────────────────────────────────

  // 1. 하루 경기 횟수 제한
  const myTodayCount = await prisma.match.count({
    where: {
      OR: [{ player1Id: session.id }, { player2Id: session.id }],
      createdAt: { gte: todayStart },
      status: { notIn: ["disputed", "voided"] },
    },
  });
  if (myTodayCount >= DAILY_MATCH_LIMIT) {
    return NextResponse.json(
      { error: `하루 최대 ${DAILY_MATCH_LIMIT}경기까지만 기록할 수 있습니다.` },
      { status: 429 }
    );
  }

  // 2. 같은 상대와 하루 1경기 제한
  const pairTodayCount = await prisma.match.count({
    where: {
      OR: [
        { player1Id: session.id, player2Id: opponentId },
        { player1Id: opponentId, player2Id: session.id },
      ],
      createdAt: { gte: todayStart },
      status: { notIn: ["disputed", "voided"] },
    },
  });
  if (pairTodayCount >= PAIR_DAILY_LIMIT) {
    return NextResponse.json(
      { error: "같은 상대와는 하루에 1경기만 기록할 수 있습니다." },
      { status: 429 }
    );
  }

  // 3. 연속 경기 쿨다운 (30분) — 기록자·상대방 모두 체크
  const cooldownTime = new Date(now.getTime() - COOLDOWN_MINUTES * 60 * 1000);
  const recentMatch = await prisma.match.findFirst({
    where: {
      OR: [{ player1Id: session.id }, { player2Id: session.id }],
      createdAt: { gte: cooldownTime },
      status: { notIn: ["disputed", "voided"] },
    },
    orderBy: { createdAt: "desc" },
  });
  if (recentMatch) {
    const minutesLeft = Math.ceil(
      (recentMatch.createdAt.getTime() + COOLDOWN_MINUTES * 60 * 1000 - now.getTime()) / 60000
    );
    return NextResponse.json(
      { error: `이전 경기 기록 후 ${minutesLeft}분 후에 다시 기록할 수 있습니다.` },
      { status: 429 }
    );
  }

  // ── ELO 미리 계산 (상대 확인 후 적용) ───────────────────────

  const [me, opponent, myGames, oppGames] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.id }, select: { id: true, eloRating: true, name: true, email: true, emailNotify: true } }),
    prisma.user.findUnique({ where: { id: opponentId }, select: { id: true, eloRating: true, name: true, email: true, emailNotify: true } }),
    getConfirmedGameCount(session.id),
    getConfirmedGameCount(opponentId),
  ]);

  if (!me || !opponent) {
    return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
  }

  const winnerId = iWon ? me.id : opponent.id;
  const { p1Change: baseP1Change, p2Change: baseP2Change } = computeMatchEloChanges({
    myElo: me.eloRating,
    oppElo: opponent.eloRating,
    myGames,
    oppGames,
    iWon,
  });

  const activeEvents = await getActiveEvents();

  const p1WinStreak = await prisma.match.count({
    where: {
      winnerId: me.id,
      status: "confirmed",
    },
  });

  const { p1Change: p1EloChange, p2Change: p2EloChange, multiplier: eloMultiplier, eventId } = applyEventEffects({
    baseP1Change,
    baseP2Change,
    iWon,
    events: activeEvents,
    p1CurrentStreak: p1WinStreak,
  });

  // pending 상태로 생성 — ELO는 상대 확인 시 적용
  const match = await prisma.match.create({
    data: {
      player1Id:    me.id,
      player2Id:    opponent.id,
      winnerId,
      status:       "pending",
      p1Score,
      p2Score,
      p1EloChange,
      p2EloChange,
      eloMultiplier,
      ...(eventId ? { eventId } : {}),
    },
    include: {
      player1: { select: { id: true, name: true } },
      player2: { select: { id: true, name: true } },
      winner:  { select: { id: true, name: true } },
    },
  });

  // 상대방에게 이메일 알림
  if (opponent.email) {
    notifyOpponent({
      opponentEmail: opponent.email,
      opponentEmailNotify: opponent.emailNotify,
      opponentName: opponent.name,
      recorderName: me.name,
      iWon,
    });
  }

  return NextResponse.json({
    match,
    status: "pending",
    autoConfirmHours: AUTO_CONFIRM_HOURS,
    eloChange: {
      [me.id]:       p1EloChange,
      [opponent.id]: p2EloChange,
    },
    placement: {
      me:       { gamesPlayed: myGames,  isPlacing: myGames  < PLACEMENT_GAMES },
      opponent: { gamesPlayed: oppGames, isPlacing: oppGames < PLACEMENT_GAMES },
    },
  });
}
