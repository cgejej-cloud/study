import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

async function guard() {
  const s = await getSession();
  return s?.role === "admin" ? s : null;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await guard()) return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  const { id } = await params;
  const data = await req.json();
  const notice = await prisma.notice.update({ where: { id }, data });
  return NextResponse.json(notice);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await guard()) return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  const { id } = await params;
  await prisma.notice.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
