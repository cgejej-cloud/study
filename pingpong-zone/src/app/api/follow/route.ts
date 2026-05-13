import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");

  if (type === "following") {
    const rows = await prisma.follow.findMany({
      where: { followerId: session.id },
      include: {
        following: { select: { id: true, name: true, nickname: true, eloRating: true, avatar: true, profileColor: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(rows.map((r) => ({ ...r.following, name: r.following.nickname ?? r.following.name })));
  }

  if (type === "followers") {
    const rows = await prisma.follow.findMany({
      where: { followingId: session.id },
      include: {
        follower: { select: { id: true, name: true, nickname: true, eloRating: true, avatar: true, profileColor: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(rows.map((r) => ({ ...r.follower, name: r.follower.nickname ?? r.follower.name })));
  }

  return NextResponse.json({ error: "type 쿼리가 필요합니다. (following | followers)" }, { status: 400 });
}
