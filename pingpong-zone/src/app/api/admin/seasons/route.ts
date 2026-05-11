import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

async function guard() {
  const s = await getSession();
  return s?.role === "admin" ? s : null;
}

export async function GET() {
  if (!await guard()) return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  const seasons = await prisma.season.findMany({
    orderBy: { startDate: "desc" },
    include: { _count: { select: { matches: true } } },
  });
  return NextResponse.json(seasons);
}

export async function POST(req: NextRequest) {
  if (!await guard()) return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  const { name, startDate } = await req.json();
  if (!name || !startDate) return NextResponse.json({ error: "필수 항목을 입력해주세요." }, { status: 400 });
  const season = await prisma.season.create({ data: { name, startDate: new Date(startDate) } });
  return NextResponse.json(season);
}
