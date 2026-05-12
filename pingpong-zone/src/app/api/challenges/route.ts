import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { sendEmailIfEnabled } from "@/lib/email";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const now = new Date();
  const challenges = await prisma.matchChallenge.findMany({
    where: {
      challengedId: session.id,
      status: "pending",
      expiresAt: { gt: now },
    },
    include: {
      challenger: { select: { id: true, name: true, eloRating: true, avatar: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(challenges);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { challengedId, message } = await req.json();

  if (!challengedId) {
    return NextResponse.json({ error: "challengedId가 필요합니다." }, { status: 400 });
  }

  if (challengedId === session.id) {
    return NextResponse.json({ error: "자기 자신에게 챌린지를 보낼 수 없습니다." }, { status: 400 });
  }

  const challenged = await prisma.user.findUnique({
    where: { id: challengedId },
    select: { id: true, name: true, email: true, emailNotify: true },
  });

  if (!challenged) {
    return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
  }

  const now = new Date();
  const existing = await prisma.matchChallenge.findFirst({
    where: {
      challengerId: session.id,
      challengedId,
      status: "pending",
      expiresAt: { gt: now },
    },
  });

  if (existing) {
    return NextResponse.json({ error: "이미 해당 상대에게 대기 중인 챌린지가 있습니다." }, { status: 400 });
  }

  const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  const challenge = await prisma.matchChallenge.create({
    data: {
      challengerId: session.id,
      challengedId,
      message: message ?? null,
      status: "pending",
      expiresAt,
    },
  });

  const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  sendEmailIfEnabled(
    challenged,
    `[탁구존] ${session.name}님이 경기를 신청했습니다`,
    `<p><b>${session.name}</b>님이 경기를 신청했습니다.</p>
     ${message ? `<p>메시지: ${message}</p>` : ""}
     <p>마이페이지에서 수락하거나 거절해 주세요. 48시간 후 자동 만료됩니다.</p>
     <a href="${BASE_URL}/mypage">마이페이지 바로가기</a>`
  );

  return NextResponse.json(challenge, { status: 201 });
}
