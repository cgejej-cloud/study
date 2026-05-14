import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const tables = await prisma.table.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { reservations: true } } },
  });

  return NextResponse.json(tables);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { name, description } = await req.json().catch(() => ({}));
  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "이름을 입력해주세요." }, { status: 400 });
  }

  const table = await prisma.table.create({
    data: { name: name.trim(), description: description?.trim() || null },
    include: { _count: { select: { reservations: true } } },
  });

  return NextResponse.json(table, { status: 201 });
}
