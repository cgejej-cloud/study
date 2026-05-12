import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const tournaments = await prisma.tournament.findMany({
    where: status ? { status } : undefined,
    include: {
      _count: { select: { players: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    tournaments.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      status: t.status,
      maxPlayers: t.maxPlayers,
      createdAt: t.createdAt,
      playerCount: t._count.players,
    }))
  );
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  const body = await req.json();
  const { name, description, maxPlayers } = body;

  if (!name || typeof name !== "string" || name.trim() === "") {
    return NextResponse.json({ error: "토너먼트 이름을 입력해주세요." }, { status: 400 });
  }

  const tournament = await prisma.tournament.create({
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      maxPlayers: maxPlayers ? Number(maxPlayers) : 8,
    },
  });

  return NextResponse.json(tournament, { status: 201 });
}
