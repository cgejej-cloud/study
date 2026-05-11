import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  const [pendingMatches, upcomingRes, notices] = await Promise.all([
    prisma.match.findMany({
      where: { player2Id: session.id, status: "pending" },
      select: {
        id: true,
        createdAt: true,
        player1: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.reservation.findMany({
      where: { userId: session.id, status: "confirmed", date: { gte: todayStr } },
      select: { id: true, date: true, startTime: true, endTime: true, table: { select: { name: true } } },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
      take: 5,
    }),
    prisma.notice.findMany({
      where: { isActive: true },
      select: { id: true, title: true, isPinned: true, createdAt: true },
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
      take: 5,
    }),
  ]);

  // 1시간 이내 시작 예약 알림
  const upcomingSoon = upcomingRes.filter((r) => {
    const t = new Date(`${r.date}T${r.startTime}:00`).getTime();
    return t > now.getTime() && t - now.getTime() <= 3600 * 1000;
  });

  return NextResponse.json({
    pendingMatches: pendingMatches.map((m) => ({
      id: m.id,
      type: "match" as const,
      title: "경기 확인 요청",
      message: `${m.player1.name}님이 기록한 경기를 확인해주세요`,
      createdAt: m.createdAt,
    })),
    upcomingSoon: upcomingSoon.map((r) => ({
      id: r.id,
      type: "reservation" as const,
      title: "예약 임박",
      message: `${r.table.name} · ${r.startTime} 곧 시작됩니다`,
      createdAt: new Date(`${r.date}T${r.startTime}:00`),
    })),
    notices: notices.map((n) => ({
      id: n.id,
      type: "notice" as const,
      title: n.isPinned ? "📌 공지" : "📢 공지",
      message: n.title,
      createdAt: n.createdAt,
    })),
    totalUnread: pendingMatches.length + upcomingSoon.length,
  });
}
