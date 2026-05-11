import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { id } = await params;
  if (id === session.id) {
    return NextResponse.json({ error: "자신의 권한은 변경할 수 없습니다." }, { status: 400 });
  }

  const { role } = await req.json();
  if (role !== "admin" && role !== "user") {
    return NextResponse.json({ error: "잘못된 권한입니다." }, { status: 400 });
  }

  const updated = await prisma.user.update({ where: { id }, data: { role } });
  return NextResponse.json({ id: updated.id, role: updated.role });
}
