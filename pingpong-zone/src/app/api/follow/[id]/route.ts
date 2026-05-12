import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  const { id } = await params;

  const [followerCount, followingCount] = await Promise.all([
    prisma.follow.count({ where: { followingId: id } }),
    prisma.follow.count({ where: { followerId: id } }),
  ]);

  if (!session) {
    return NextResponse.json({ following: false, followerCount, followingCount });
  }

  const existing = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId: session.id, followingId: id } },
  });

  return NextResponse.json({ following: !!existing, followerCount, followingCount });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { id } = await params;

  if (id === session.id) {
    return NextResponse.json({ error: "자기 자신을 팔로우할 수 없습니다." }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!target) return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });

  await prisma.follow.upsert({
    where: { followerId_followingId: { followerId: session.id, followingId: id } },
    create: { followerId: session.id, followingId: id },
    update: {},
  });

  return NextResponse.json({ following: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { id } = await params;

  await prisma.follow.deleteMany({
    where: { followerId: session.id, followingId: id },
  });

  return NextResponse.json({ following: false });
}
