import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  }

  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const weekStart  = new Date(now); weekStart.setDate(now.getDate() - 7);
  const monthStart = new Date(now); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);

  const todayStr = now.toISOString().split("T")[0];

  const [
    totalUsers,
    todayRes,
    weekRes,
    monthRes,
    totalMatches,
    disputedCount,
    allReservations,
    tables,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.reservation.count({ where: { date: todayStr, status: "confirmed" } }),
    prisma.reservation.count({ where: { createdAt: { gte: weekStart }, status: "confirmed" } }),
    prisma.reservation.count({ where: { createdAt: { gte: monthStart }, status: "confirmed" } }),
    prisma.match.count({ where: { status: "confirmed" } }),
    prisma.match.count({ where: { status: "disputed" } }),
    prisma.reservation.findMany({
      where: { status: "confirmed" },
      select: { startTime: true, tableId: true, date: true },
    }),
    prisma.table.findMany({ select: { id: true, name: true } }),
  ]);

  // 시간대별 예약 집계 (09~21)
  const HOURS = ["09","10","11","12","13","14","15","16","17","18","19","20","21"];
  const hourCounts: Record<string, number> = {};
  HOURS.forEach(h => { hourCounts[h] = 0; });
  for (const r of allReservations) {
    const h = r.startTime.slice(0, 2);
    if (hourCounts[h] !== undefined) hourCounts[h]++;
  }

  // 탁구대별 예약 집계
  const tableCounts: Record<string, number> = {};
  for (const t of tables) tableCounts[t.id] = 0;
  for (const r of allReservations) {
    if (tableCounts[r.tableId] !== undefined) tableCounts[r.tableId]++;
  }
  const tableStats = tables.map(t => ({ name: t.name, count: tableCounts[t.id] }));

  // 요일별 예약
  const DOW_LABELS = ["일", "월", "화", "수", "목", "금", "토"];
  const dowCounts: number[] = [0, 0, 0, 0, 0, 0, 0];
  for (const r of allReservations) {
    const d = new Date(r.date + "T00:00:00").getDay();
    dowCounts[d]++;
  }
  const dowStats = DOW_LABELS.map((label, i) => ({ label, count: dowCounts[i] }));

  return NextResponse.json({
    summary: { totalUsers, todayRes, weekRes, monthRes, totalMatches, disputedCount },
    hourStats: HOURS.map(h => ({ hour: `${h}시`, count: hourCounts[h] })),
    tableStats,
    dowStats,
  });
}
