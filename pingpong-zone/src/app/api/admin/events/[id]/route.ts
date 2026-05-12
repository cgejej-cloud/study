import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

async function guard() {
  const s = await getSession();
  if (!s || s.role !== "admin") return null;
  return s;
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await guard())) return NextResponse.json({ error: "권한 없음" }, { status: 403 });

  const { id } = params;
  const body = await req.json();
  const { isActive, name, description, config, startDate, endDate } = body;

  const data: Record<string, unknown> = {};
  if (isActive !== undefined) data.isActive = isActive;
  if (name !== undefined) data.name = name;
  if (description !== undefined) data.description = description;
  if (config !== undefined) data.config = config;

  if (startDate !== undefined) {
    const start = new Date(startDate);
    if (isNaN(start.getTime())) return NextResponse.json({ error: "시작일 형식이 올바르지 않습니다." }, { status: 400 });
    data.startDate = start;
  }

  if (endDate !== undefined) {
    const end = new Date(endDate);
    if (isNaN(end.getTime())) return NextResponse.json({ error: "종료일 형식이 올바르지 않습니다." }, { status: 400 });
    data.endDate = end;
  }

  if (data.startDate && data.endDate && (data.endDate as Date) <= (data.startDate as Date)) {
    return NextResponse.json({ error: "종료일은 시작일보다 늦어야 합니다." }, { status: 400 });
  }

  try {
    const event = await prisma.event.update({ where: { id }, data });
    return NextResponse.json(event);
  } catch {
    return NextResponse.json({ error: "이벤트를 찾을 수 없습니다." }, { status: 404 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await guard())) return NextResponse.json({ error: "권한 없음" }, { status: 403 });

  const { id } = params;
  try {
    await prisma.event.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "이벤트를 찾을 수 없습니다." }, { status: 404 });
  }
}
