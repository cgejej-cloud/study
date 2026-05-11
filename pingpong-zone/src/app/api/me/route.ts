import { NextRequest, NextResponse } from "next/server";
import { getSession, createSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { validateName, validatePassword, validatePhone } from "@/lib/validation";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json(null);
  return NextResponse.json(session);
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { name, phone, currentPassword, newPassword } = await req.json();

  if (!validateName(name)) {
    return NextResponse.json({ error: "이름은 2~30자로 입력해주세요." }, { status: 400 });
  }
  if (phone && !validatePhone(phone)) {
    return NextResponse.json({ error: "올바른 전화번호 형식이 아닙니다." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.id } });
  if (!user) return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });

  if (newPassword) {
    if (!validatePassword(newPassword)) {
      return NextResponse.json({ error: "새 비밀번호는 8자 이상이어야 합니다." }, { status: 400 });
    }
    if (!currentPassword) {
      return NextResponse.json({ error: "현재 비밀번호를 입력해주세요." }, { status: 400 });
    }
    const valid = await bcrypt.compare(currentPassword, user.password || "");
    if (!valid) {
      return NextResponse.json({ error: "현재 비밀번호가 올바르지 않습니다." }, { status: 400 });
    }
  }

  const updateData: Record<string, string> = { name: name.trim() };
  if (phone !== undefined) updateData.phone = phone;
  if (newPassword) updateData.password = await bcrypt.hash(newPassword, 10);

  const updated = await prisma.user.update({ where: { id: session.id }, data: updateData });
  await createSession({ id: updated.id, name: updated.name, email: updated.email, role: updated.role });

  return NextResponse.json({ success: true });
}
