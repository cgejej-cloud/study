import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { id } = await params;

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: { _count: { select: { players: true } } },
  });

  if (!tournament) return NextResponse.json({ error: "토너먼트를 찾을 수 없습니다." }, { status: 404 });
  if (tournament.status !== "open") return NextResponse.json({ error: "참가 신청이 불가능한 상태입니다." }, { status: 400 });
  if (tournament._count.players >= tournament.maxPlayers) {
    return NextResponse.json({ error: "참가자 정원이 초과되었습니다." }, { status: 400 });
  }

  const existing = await prisma.tournamentPlayer.findUnique({
    where: { tournamentId_userId: { tournamentId: id, userId: session.id } },
  });
  if (existing) return NextResponse.json({ error: "이미 참가한 토너먼트입니다." }, { status: 400 });

  const player = await prisma.tournamentPlayer.create({
    data: { tournamentId: id, userId: session.id },
  });

  return NextResponse.json(player, { status: 201 });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { id } = await params;

  const tournament = await prisma.tournament.findUnique({ where: { id } });
  if (!tournament) return NextResponse.json({ error: "토너먼트를 찾을 수 없습니다." }, { status: 404 });
  if (tournament.status !== "open") return NextResponse.json({ error: "open 상태일 때만 참가 취소할 수 있습니다." }, { status: 400 });

  const existing = await prisma.tournamentPlayer.findUnique({
    where: { tournamentId_userId: { tournamentId: id, userId: session.id } },
  });
  if (!existing) return NextResponse.json({ error: "참가 정보를 찾을 수 없습니다." }, { status: 404 });

  await prisma.tournamentPlayer.delete({
    where: { tournamentId_userId: { tournamentId: id, userId: session.id } },
  });

  return NextResponse.json({ ok: true });
}
