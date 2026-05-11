import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { validateEmail, validateName, validatePassword, validatePhone } from "@/lib/validation";

export async function POST(req: NextRequest) {
  const { name, email, password, phone } = await req.json();

  if (!validateName(name)) {
    return NextResponse.json({ error: "이름은 2~30자로 입력해주세요." }, { status: 400 });
  }
  if (!validateEmail(email)) {
    return NextResponse.json({ error: "올바른 이메일 형식이 아닙니다." }, { status: 400 });
  }
  if (!validatePassword(password)) {
    return NextResponse.json({ error: "비밀번호는 8자 이상이어야 합니다." }, { status: 400 });
  }
  if (phone && !validatePhone(phone)) {
    return NextResponse.json({ error: "올바른 전화번호 형식이 아닙니다." }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "이미 사용 중인 이메일입니다." }, { status: 400 });
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name: name.trim(), email, password: hashed, phone: phone || null },
  });

  return NextResponse.json({ id: user.id, name: user.name, email: user.email });
}
