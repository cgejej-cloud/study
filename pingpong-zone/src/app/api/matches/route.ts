import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { notifyOpponent, AUTO_CONFIRM_HOURS } from "@/lib/matchHelpers";

const PLACEMENT_GAMES = 5;
const K_PLACEMENT = 48;
const K_NORMAL = 24;
const DAILY_MATCH_LIMIT = 5;    // 하루 최대 경기 수
const PAIR_DAILY_LIMIT = 1;     // 같은 상대와 하루 최대 경기 수
const COOLDOWN_MINUTES = 30;    // 연속 경기 최소 간격 (분)
// AUTO_CONFIRM_HOURS는 lib/matchHelpers.ts 에서 import

function getK(totalGames: number) {
  return totalGames < PLACEMENT_GAMES ? K_PLACEMENT : K_NORMAL;
}

function expectedScore(ratingA: number, ratingB: number) {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

function calcEloChange(rating: number, k: number, expected: number, actual: number) {
  return Math.round(k * (actual - expected));
}

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

  const matches = await prisma.match.findMany({
    where: { OR: [{ player1Id: userId }, { player2Id: userId }] },
    include: {
      player1: { select: { id: true, name: true, eloRating: true } },
      player2: { select: { id: true, name: true, eloRating: true } },
      winner:  { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json(matches);
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
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

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

  const winnerId     = iWon ? me.id : opponent.id;
  const winnerRating = iWon ? me.eloRating : opponent.eloRating;
  const loserRating  = iWon ? opponent.eloRating : me.eloRating;
  const winnerGames  = iWon ? myGames : oppGames;
  const loserGames   = iWon ? oppGames : myGames;
  const winnerK      = getK(winnerGames);
  const loserK       = getK(loserGames);
  const expectedWin  = expectedScore(winnerRating, loserRating);
  const winnerChange = calcEloChange(winnerRating, winnerK, expectedWin, 1);
  const loserChange  = calcEloChange(loserRating, loserK, 1 - expectedWin, 0);

  // player1 = 기록자(me), player2 = 상대(opponent)
  const p1EloChange = iWon ? winnerChange : loserChange;
  const p2EloChange = iWon ? loserChange  : winnerChange;

  // pending 상태로 생성 — ELO는 상대 확인 시 적용
  const match = await prisma.match.create({
    data: {
      player1Id:   me.id,
      player2Id:   opponent.id,
      winnerId,
      status:      "pending",
      p1Score,
      p2Score,
      p1EloChange,
      p2EloChange,
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
