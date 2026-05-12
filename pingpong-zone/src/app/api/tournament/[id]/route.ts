import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
      players: {
        include: { user: { select: { id: true, name: true, eloRating: true } } },
        orderBy: { seed: "asc" },
      },
      matches: {
        include: {
          player1: { select: { id: true, name: true } },
          player2: { select: { id: true, name: true } },
          winner: { select: { id: true, name: true } },
        },
        orderBy: [{ round: "asc" }, { position: "asc" }],
      },
    },
  });

  if (!tournament) return NextResponse.json({ error: "토너먼트를 찾을 수 없습니다." }, { status: 404 });

  return NextResponse.json(tournament);
}

function buildBracket(
  tournamentId: string,
  players: { id: string; seed: number }[],
  maxPlayers: number
) {
  const rounds = Math.ceil(Math.log2(maxPlayers));
  const numSlots = Math.pow(2, rounds);
  const matches: {
    tournamentId: string;
    round: number;
    position: number;
    player1Id: string | null;
    player2Id: string | null;
    winnerId: string | null;
    status: string;
  }[] = [];

  const slotAssignment: (string | null)[] = new Array(numSlots).fill(null);
  for (const p of players) {
    const idx = p.seed - 1;
    if (idx < numSlots) slotAssignment[idx] = p.id;
  }

  const round1MatchCount = numSlots / 2;
  for (let pos = 0; pos < round1MatchCount; pos++) {
    const p1Id = slotAssignment[pos * 2] ?? null;
    const p2Id = slotAssignment[pos * 2 + 1] ?? null;
    const isBye = (p1Id !== null && p2Id === null) || (p1Id === null && p2Id !== null);
    const status = isBye ? "bye" : "pending";
    const winnerId = isBye ? (p1Id ?? p2Id) : null;
    matches.push({ tournamentId, round: 1, position: pos, player1Id: p1Id, player2Id: p2Id, winnerId, status });
  }

  for (let r = 2; r <= rounds; r++) {
    const matchCount = numSlots / Math.pow(2, r);
    for (let pos = 0; pos < matchCount; pos++) {
      matches.push({ tournamentId, round: r, position: pos, player1Id: null, player2Id: null, winnerId: null, status: "pending" });
    }
  }

  return matches;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const { action } = body;

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
      players: { include: { user: { select: { id: true, eloRating: true } } } },
    },
  });

  if (!tournament) return NextResponse.json({ error: "토너먼트를 찾을 수 없습니다." }, { status: 404 });

  if (action === "start") {
    if (tournament.status !== "open") {
      return NextResponse.json({ error: "open 상태의 토너먼트만 시작할 수 있습니다." }, { status: 400 });
    }
    if (tournament.players.length < 2) {
      return NextResponse.json({ error: "참가자가 2명 이상이어야 합니다." }, { status: 400 });
    }

    const sorted = [...tournament.players].sort((a, b) => b.user.eloRating - a.user.eloRating);
    const seeded = sorted.map((p, i) => ({ id: p.userId, seed: i + 1 }));

    await prisma.$transaction(async (tx) => {
      for (const p of sorted) {
        await tx.tournamentPlayer.update({
          where: { tournamentId_userId: { tournamentId: id, userId: p.userId } },
          data: { seed: sorted.indexOf(p) + 1 },
        });
      }

      const matchData = buildBracket(id, seeded, tournament.maxPlayers);

      await tx.tournament.update({ where: { id }, data: { status: "active" } });
      await tx.tournamentMatch.createMany({ data: matchData });

      const byeMatches = matchData.filter((m) => m.status === "bye");
      for (const bye of byeMatches) {
        if (bye.winnerId) {
          const nextRound = 2;
          const nextPos = Math.floor(bye.position / 2);
          const isPlayer1Slot = bye.position % 2 === 0;
          const created = await tx.tournamentMatch.findFirst({
            where: { tournamentId: id, round: nextRound, position: nextPos },
          });
          if (created) {
            await tx.tournamentMatch.update({
              where: { id: created.id },
              data: isPlayer1Slot ? { player1Id: bye.winnerId } : { player2Id: bye.winnerId },
            });
          }
        }
      }
    });

    const updated = await prisma.tournament.findUnique({
      where: { id },
      include: {
        players: { include: { user: { select: { id: true, name: true, eloRating: true } } } },
        matches: {
          include: {
            player1: { select: { id: true, name: true } },
            player2: { select: { id: true, name: true } },
            winner: { select: { id: true, name: true } },
          },
          orderBy: [{ round: "asc" }, { position: "asc" }],
        },
      },
    });

    return NextResponse.json(updated);
  }

  if (action === "finish") {
    const updated = await prisma.tournament.update({
      where: { id },
      data: { status: "finished" },
    });
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "알 수 없는 action입니다." }, { status: 400 });
}
