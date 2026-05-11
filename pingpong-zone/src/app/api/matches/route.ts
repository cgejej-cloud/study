import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

const K = 32;

function expectedScore(ratingA: number, ratingB: number) {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

function newRating(rating: number, expected: number, actual: number) {
  return Math.round(rating + K * (actual - expected));
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId") || session.id;

  const matches = await prisma.match.findMany({
    where: {
      OR: [{ player1Id: userId }, { player2Id: userId }],
    },
    include: {
      player1: { select: { id: true, name: true, eloRating: true } },
      player2: { select: { id: true, name: true, eloRating: true } },
      winner: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json(matches);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { opponentId, iWon } = await req.json();

  if (!opponentId || iWon === undefined) {
    return NextResponse.json({ error: "필수 항목을 입력해주세요." }, { status: 400 });
  }

  if (opponentId === session.id) {
    return NextResponse.json({ error: "자기 자신과의 경기는 기록할 수 없습니다." }, { status: 400 });
  }

  const [me, opponent] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.id } }),
    prisma.user.findUnique({ where: { id: opponentId } }),
  ]);

  if (!me || !opponent) {
    return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
  }

  const winnerId = iWon ? me.id : opponent.id;
  const loserId = iWon ? opponent.id : me.id;

  const winnerRating = iWon ? me.eloRating : opponent.eloRating;
  const loserRating = iWon ? opponent.eloRating : me.eloRating;

  const expectedWinner = expectedScore(winnerRating, loserRating);
  const newWinnerRating = newRating(winnerRating, expectedWinner, 1);
  const newLoserRating = newRating(loserRating, 1 - expectedWinner, 0);

  const [match] = await prisma.$transaction([
    prisma.match.create({
      data: { player1Id: me.id, player2Id: opponent.id, winnerId },
      include: {
        player1: { select: { id: true, name: true } },
        player2: { select: { id: true, name: true } },
        winner: { select: { id: true, name: true } },
      },
    }),
    prisma.user.update({ where: { id: winnerId }, data: { eloRating: newWinnerRating } }),
    prisma.user.update({ where: { id: loserId }, data: { eloRating: newLoserRating } }),
  ]);

  return NextResponse.json({
    match,
    eloChange: {
      [winnerId]: newWinnerRating - winnerRating,
      [loserId]: newLoserRating - loserRating,
    },
  });
}
