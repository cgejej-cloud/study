import { NextRequest, NextResponse } from "next/server";
import { getSession, createSession, deleteSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { validateName, validatePassword, validatePhone, validateNickname, validateBio, validateProfileColor } from "@/lib/validation";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json(null);

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { id: true, name: true, email: true, role: true, nickname: true, bio: true, profileColor: true, phone: true, emailNotify: true, avatar: true, racketType: true, playStyle: true },
  });
  if (!user) return NextResponse.json(null);
  if (user.role !== session.role || user.name !== session.name) {
    await createSession({ id: user.id, name: user.name, email: user.email, role: user.role });
  }

  return NextResponse.json(user);
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { name, nickname, bio, profileColor, phone, currentPassword, newPassword, emailNotify, avatar, racketType, playStyle } = await req.json();

  if (!validateName(name)) {
    return NextResponse.json({ error: "이름은 2~30자로 입력해주세요." }, { status: 400 });
  }
  if (!validateNickname(nickname)) {
    return NextResponse.json({ error: "닉네임은 2~20자로 입력해주세요." }, { status: 400 });
  }
  if (!validateBio(bio)) {
    return NextResponse.json({ error: "소개는 140자 이하로 입력해주세요." }, { status: 400 });
  }
  if (!validateProfileColor(profileColor)) {
    return NextResponse.json({ error: "유효하지 않은 프로필 색상입니다." }, { status: 400 });
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

  if (avatar !== undefined && avatar !== null && avatar !== "") {
    if (!avatar.startsWith("https://") || avatar.length > 500) {
      return NextResponse.json({ error: "아바타 URL은 https로 시작하는 500자 이하여야 합니다." }, { status: 400 });
    }
  }

  const updateData: Record<string, unknown> = { name: name.trim() };
  if (nickname !== undefined) updateData.nickname = nickname?.trim() || null;
  if (bio !== undefined) updateData.bio = bio?.trim() || null;
  if (profileColor !== undefined) updateData.profileColor = profileColor || null;
  if (phone !== undefined) updateData.phone = phone || null;
  if (newPassword) updateData.password = await bcrypt.hash(newPassword, 10);
  if (typeof emailNotify === "boolean") updateData.emailNotify = emailNotify;
  if (avatar !== undefined) updateData.avatar = avatar || null;
  if (racketType !== undefined) updateData.racketType = racketType || null;
  if (playStyle !== undefined) updateData.playStyle = playStyle || null;

  const updated = await prisma.user.update({ where: { id: session.id }, data: updateData });
  await createSession({ id: updated.id, name: updated.name, email: updated.email, role: updated.role });

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { password } = await req.json().catch(() => ({}));
  if (!password) {
    return NextResponse.json({ error: "비밀번호를 입력해주세요." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.id } });
  if (!user || !user.password) return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return NextResponse.json({ error: "비밀번호가 올바르지 않습니다." }, { status: 400 });

  // 마지막 어드민 보호
  if (user.role === "admin") {
    const adminCount = await prisma.user.count({ where: { role: "admin" } });
    if (adminCount <= 1) {
      return NextResponse.json({ error: "마지막 관리자는 탈퇴할 수 없습니다." }, { status: 400 });
    }
  }

  // 관련 데이터 정리: 미래 예약 취소, 매치는 보존(랭킹 무결성)
  const today = new Date().toISOString().split("T")[0];
  await prisma.reservation.updateMany({
    where: { userId: session.id, status: "confirmed", date: { gte: today } },
    data:  { status: "cancelled" },
  });
  // 이름을 "(탈퇴한 회원)" 으로 변경하여 PII 보호 + 매치 기록은 유지
  await prisma.user.update({
    where: { id: session.id },
    data: {
      name: "(탈퇴한 회원)",
      email: `deleted-${session.id}@removed.local`,
      password: null,
      phone: null,
      emailNotify: false,
    },
  });
  await deleteSession();
  return NextResponse.json({ success: true });
}
