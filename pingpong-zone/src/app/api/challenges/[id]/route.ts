import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { id } = await params;
  const challenge = await prisma.matchChallenge.findUnique({ where: { id } });

  if (!challenge) return NextResponse.json({ error: "챌린지를 찾을 수 없습니다." }, { status: 404 });
  if (challenge.challengerId !== session.id) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  if (challenge.status !== "pending") return NextResponse.json({ error: "이미 처리된 챌린지입니다." }, { status: 400 });

  await prisma.matchChallenge.update({ where: { id }, data: { status: "rejected" } });
  return NextResponse.json({ success: true });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { id } = await params;
  const { action } = await req.json();

  if (action !== "accept" && action !== "reject") {
    return NextResponse.json({ error: "action은 accept 또는 reject여야 합니다." }, { status: 400 });
  }

  const challenge = await prisma.matchChallenge.findUnique({ where: { id } });

  if (!challenge) {
    return NextResponse.json({ error: "챌린지를 찾을 수 없습니다." }, { status: 404 });
  }

  if (challenge.challengedId !== session.id) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  if (challenge.status !== "pending") {
    return NextResponse.json({ error: "이미 처리된 챌린지입니다." }, { status: 400 });
  }

  if (challenge.expiresAt <= new Date()) {
    return NextResponse.json({ error: "만료된 챌린지입니다." }, { status: 400 });
  }

  const updated = await prisma.matchChallenge.update({
    where: { id },
    data: { status: action === "accept" ? "accepted" : "rejected" },
  });

  if (action === "accept") {
    return NextResponse.json({
      challenge: updated,
      redirectUrl: `/ranking/record?opponent=${challenge.challengerId}`,
    });
  }

  return NextResponse.json({ challenge: updated });
}
