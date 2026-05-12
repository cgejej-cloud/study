import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "admin") return null;
  return session;
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const logs = await prisma.errorLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json(logs);
}

export async function DELETE(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const all = req.nextUrl.searchParams.get("all");
  const id = req.nextUrl.searchParams.get("id");

  if (all === "true") {
    await prisma.errorLog.deleteMany();
    return NextResponse.json({ message: "전체 삭제되었습니다." });
  }

  if (id) {
    await prisma.errorLog.delete({ where: { id } });
    return NextResponse.json({ message: "삭제되었습니다." });
  }

  return NextResponse.json({ error: "id 또는 all=true 파라미터가 필요합니다." }, { status: 400 });
}
