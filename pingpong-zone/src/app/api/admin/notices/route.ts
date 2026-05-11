import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

async function guard() {
  const s = await getSession();
  if (!s || s.role !== "admin") return null;
  return s;
}

export async function GET() {
  if (!await guard()) return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  const notices = await prisma.notice.findMany({ orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }] });
  return NextResponse.json(notices);
}

export async function POST(req: NextRequest) {
  if (!await guard()) return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  const { title, content, isPinned } = await req.json();
  if (!title || !content) return NextResponse.json({ error: "제목과 내용을 입력해주세요." }, { status: 400 });
  const notice = await prisma.notice.create({ data: { title, content, isPinned: !!isPinned } });
  return NextResponse.json(notice);
}
