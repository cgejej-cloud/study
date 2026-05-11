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

  // 시간/탁구대별은 DB groupBy 로 집계 (메모리 효율)
  const [
    totalUsers,
    todayRes,
    weekRes,
    monthRes,
    totalMatches,
    disputedCount,
    hourGroups,
    tableGroups,
    dateGroups,
    tables,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.reservation.count({ where: { date: todayStr, status: "confirmed" } }),
    prisma.reservation.count({ where: { createdAt: { gte: weekStart }, status: "confirmed" } }),
    prisma.reservation.count({ where: { createdAt: { gte: monthStart }, status: "confirmed" } }),
    prisma.match.count({ where: { status: "confirmed" } }),
    prisma.match.count({ where: { status: "disputed" } }),
    prisma.reservation.groupBy({
      by: ["startTime"],
      where: { status: "confirmed" },
      _count: { _all: true },
    }),
    prisma.reservation.groupBy({
      by: ["tableId"],
      where: { status: "confirmed" },
      _count: { _all: true },
    }),
    prisma.reservation.groupBy({
      by: ["date"],
      where: { status: "confirmed" },
      _count: { _all: true },
    }),
    prisma.table.findMany({ select: { id: true, name: true } }),
  ]);

  // 시간대별 예약 집계 (09~21)
  const HOURS = ["09","10","11","12","13","14","15","16","17","18","19","20","21"];
  const hourCounts: Record<string, number> = {};
  HOURS.forEach(h => { hourCounts[h] = 0; });
  for (const g of hourGroups) {
    const h = g.startTime.slice(0, 2);
    if (hourCounts[h] !== undefined) hourCounts[h] += g._count._all;
  }

  // 탁구대별
  const tableCountMap = new Map(tableGroups.map(g => [g.tableId, g._count._all]));
  const tableStats = tables.map(t => ({ name: t.name, count: tableCountMap.get(t.id) ?? 0 }));

  // 요일별 — date groupBy 결과를 메모리에서 dow 변환 (date 별 1행)
  const DOW_LABELS = ["일", "월", "화", "수", "목", "금", "토"];
  const dowCounts = [0, 0, 0, 0, 0, 0, 0];
  for (const g of dateGroups) {
    const d = new Date(g.date + "T00:00:00").getDay();
    dowCounts[d] += g._count._all;
  }
  const dowStats = DOW_LABELS.map((label, i) => ({ label, count: dowCounts[i] }));

  // 최근 14일 일별 예약 추이
  const recent14Start = new Date(now); recent14Start.setDate(now.getDate() - 13);
  recent14Start.setHours(0, 0, 0, 0);
  const recent14Str = recent14Start.toISOString().split("T")[0];
  const recentDays = await prisma.reservation.groupBy({
    by: ["date"],
    where: { status: "confirmed", date: { gte: recent14Str } },
    _count: { _all: true },
  });
  const daysMap = new Map(recentDays.map((d) => [d.date, d._count._all]));
  const trend: { date: string; count: number }[] = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(recent14Start); d.setDate(recent14Start.getDate() + i);
    const ds = d.toISOString().split("T")[0];
    trend.push({ date: ds, count: daysMap.get(ds) ?? 0 });
  }

  return NextResponse.json({
    summary: { totalUsers, todayRes, weekRes, monthRes, totalMatches, disputedCount },
    hourStats: HOURS.map(h => ({ hour: `${h}시`, count: hourCounts[h] })),
    tableStats,
    dowStats,
    trend,
  });
}
